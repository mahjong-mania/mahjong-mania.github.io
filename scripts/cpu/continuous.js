'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib'),{execFileSync}=require('node:child_process');
const {play,rng}=require('./evaluate'),{MortalClient}=require('./mortal-client'),{metrics}=require('./statistics');
const mode=process.argv[2];if(!['four','sanma'].includes(mode))throw Error('mode must be four or sanma');
const root=process.env.MAHJONG_TRAINING_DIR||'/workspace/mahjong-training',dir=path.join(root,mode);fs.mkdirSync(dir,{recursive:true});
const spec=JSON.parse(fs.readFileSync(path.join(__dirname,'experiment-config.json'))),deadline=Date.parse(spec.deadline),lockPath=path.join(dir,'runner.lock');
const policySource=fs.readFileSync(path.join(__dirname,'../../mortal-cpu.js')),policySourceSha256=crypto.createHash('sha256').update(policySource).digest('hex');
fs.mkdirSync(path.join(dir,'source'),{recursive:true});if(!fs.existsSync(path.join(dir,'source',policySourceSha256+'.js')))fs.writeFileSync(path.join(dir,'source',policySourceSha256+'.js'),policySource);
function atomic(file,data){const p=path.join(dir,file),tmp=p+'.tmp';const fd=fs.openSync(tmp,'w');try{fs.writeFileSync(fd,JSON.stringify(data,null,2));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}fs.renameSync(tmp,p);}
function append(file,data){const fd=fs.openSync(path.join(dir,file),'a');try{fs.writeSync(fd,JSON.stringify(data)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
try{fs.writeFileSync(lockPath,JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()}),{flag:'wx'});}catch{throw Error('runner lock exists; inspect PID and resume safely');}
let state=fs.existsSync(path.join(dir,'state.json'))?JSON.parse(fs.readFileSync(path.join(dir,'state.json'))):{version:1,mode,phase:'search',trial:0,pair:0,games:0,pairs:0,incumbent:spec.initial,bestMean:null,results:[],coverage:{requests:0,inferences:0,fallbacks:0},errors:{},rngSeed:mode==='four'?830523:931127,startedAt:new Date().toISOString()};
let stopping=false;process.on('SIGTERM',()=>{stopping=true;});process.on('SIGINT',()=>{stopping=true;});
const client=new MortalClient();
(async()=>{
const dimensions={mortalWeight:[.05,.1,.25,.5,1],shapeWeight:[.5,1,2,4],chipWeight:[0,.5,1,2,4],defenseWeight:[0,.5,1,2,4],riichiBias:[-.5,0,.25,.5,1,2,4],bonusEVWeight:[0,.02,.05,.1,.2],shubaBias:[-.25,0,.25,.5,1]};
function mutate(){const random=rng(state.rngSeed+state.trial*17713);const c={...state.incumbent},keys=Object.keys(dimensions).filter(k=>mode==='sanma'||k!=='shubaBias');for(let n=0;n<(state.trial%4===0?2:1);n++){const k=keys[Math.floor(random()*keys.length)],v=dimensions[k];c[k]=v[Math.floor(random()*v.length)];}return c;}
function save(){state.updatedAt=new Date().toISOString();state.pid=process.pid;state.backboneFineTuned=false;state.headTrainingAvailable=fs.existsSync(path.join(dir,'models/latest.json'));state.policySourceSha256=policySourceSha256;atomic('state.json',state);}
function runPair(){const phase=state.phase,offset=phase==='final'?0x6a000000:phase==='confirmation'?0x4a000000:0x1a000000,seat=state.pair%(mode==='four'?4:3),seed=(offset+state.rngSeed+state.trial*100003+Math.floor(state.pair/(mode==='four'?4:3)))>>>0,trace=state.pairs%spec.saveDecisionTracesEvery===0;
 const baseline=play({mode,seed,seat,config:{engine:'baseline'},client});
 const candidate=play({mode,seed,seat,config:state.candidate,client,trace});
 const incumbent=phase==='confirmation'?(JSON.stringify(state.candidate)===JSON.stringify(state.incumbent)?candidate:play({mode,seed,seat,config:state.incumbent,client})):null;
 if(trace){const samples=candidate.samples;delete candidate.samples;const file='trace-'+phase+'-'+state.trial+'-'+state.pair+'.json.gz';const temp=path.join(dir,file+'.tmp');fs.writeFileSync(temp,zlib.gzipSync(JSON.stringify({mode,seed,seat,config:state.candidate,terminal:candidate.self,samples})));fs.renameSync(temp,path.join(dir,file));}else delete candidate.samples;
 const rec={at:new Date().toISOString(),trial:state.trial,policySourceSha256,phase,pair:state.pair,seed,seat,delta:candidate.totalChips-baseline.totalChips,deltaIncumbent:incumbent?candidate.totalChips-incumbent.totalChips:null,incumbentConfig:incumbent?state.incumbent:null,rank:candidate.self.rank,bonus:candidate.self.bonusChips,rankChips:candidate.self.rankChips,candidate,baseline,incumbent};append('games.jsonl',rec);const sample={seed,delta:rec.delta,deltaIncumbent:rec.deltaIncumbent,rank:rec.rank,bonus:rec.bonus,rankChips:rec.rankChips,requests:candidate.stats.requests,inferences:candidate.stats.inferences};state.results.push(sample);if(phase==='final'){state.finalResults??=[];state.finalResults.push(sample);}state.pair++;state.pairs++;state.games+=2+(incumbent&&incumbent!==candidate?1:0);for(const k of Object.keys(state.coverage))state.coverage[k]+=candidate.stats[k]||0;for(const [k,n]of Object.entries(candidate.stats.errors))state.errors[k]=(state.errors[k]||0)+n;save();
}
try{while(!stopping&&Date.now()<deadline){
 if(Date.now()>=deadline-spec.confirmationLeadMinutes*60000&&state.phase!=='final'&&state.phase!=='done'){state.phase='final';state.pair=0;state.results=[];state.candidate={...state.incumbent};save();}
 if(state.phase==='done'){// Continue collecting independent final evidence until deadline.
  state.phase='final';state.pair=0;state.results=[];state.trial++;state.candidate={...state.incumbent};
 }
 if(!state.candidate){const trained=fs.existsSync(path.join(dir,'models/latest.json'))?JSON.parse(fs.readFileSync(path.join(dir,'models/latest.json'))):null;state.candidate=state.trial===0?{...state.incumbent}:mutate();if(trained?.trained&&state.trial%3===0)state.candidate.modelPath=trained.modelPath;if(state.trial%5===1)state.candidate.bonusEVWeight=[.02,.05,.1][Math.floor(state.trial/5)%3];if(mode==='four'&&state.trial%5===2)state.candidate.riichiBias=2;if(mode==='four'&&spec.fourModelCandidates?.length&&state.trial%4===0){const alternatives=[...spec.fourModelCandidates],largePath=path.join(dir,'models-c3/latest.json');if(fs.existsSync(largePath)){const large=JSON.parse(fs.readFileSync(largePath));if(large.trained)alternatives.push(large.modelPath);}state.candidate.modelPath=alternatives[Math.floor(state.trial/4)%alternatives.length];state.candidate.mortalWeight=1;}state.pair=0;state.results=[];save();}
 await new Promise(resolve=>setImmediate(resolve));
 if(state.phase==='search'&&Date.now()-(state.lastTrainingAt||Date.parse(state.startedAt))>spec.trainingIntervalSeconds*1000){try{const output=execFileSync('/workspace/mortal-runtime/venv/bin/python',[path.join(__dirname,'train-head.py'),mode],{timeout:120000,maxBuffer:2000000,encoding:'utf8'});append('training.jsonl',JSON.parse(output.trim().split('\n').at(-1)));if(mode==='four'){const large=execFileSync('/workspace/mortal-runtime/venv/bin/python',[path.join(__dirname,'train-head.py'),mode,'--backbone','c3'],{timeout:120000,maxBuffer:2000000,encoding:'utf8'});append('training-c3.jsonl',JSON.parse(large.trim().split('\n').at(-1)));}}catch(e){append('training-failures.jsonl',{at:new Date().toISOString(),error:e.message});}state.lastTrainingAt=Date.now();save();}
 try{runPair();}catch(e){append('failures.jsonl',{at:new Date().toISOString(),trial:state.trial,pair:state.pair,error:e.stack});state.failureCount=(state.failureCount||0)+1;state.pair++;save();if(state.failureCount>=20)throw Error('too many game failures; fix before resuming');continue;}
 const target=state.phase==='final'?spec.finalPairs:state.phase==='confirmation'?spec.confirmPairs:spec.screenPairs;
 if(state.pair>=target){const summary={at:new Date().toISOString(),mode,phase:state.phase,trial:state.trial,config:state.candidate,metrics:metrics(state.phase==='final'?(state.finalResults||state.results):state.results),policySourceSha256,coverage:{...state.coverage}};append('trials.jsonl',summary);console.log(JSON.stringify(summary));
  if(state.phase==='search'&&summary.metrics.meanDifference>0){state.phase='confirmation';state.pair=0;state.results=[];}
  else if(state.phase==='confirmation'){if(summary.metrics.ci95[0]>0&&summary.metrics.incumbentDifference?.meanDifference>0){state.incumbent={...state.candidate};state.bestMean=summary.metrics.meanDifference;atomic('experimental-best.json',summary);}state.phase='search';state.trial++;state.pair=0;state.results=[];delete state.candidate;}
  else if(state.phase==='final'){summary.adoptable=summary.metrics.ci95[0]>0&&summary.metrics.independentSeeds>=24&&summary.metrics.inferenceCoverage>=.98&&!state.failureCount;summary.productionDeployed=false;atomic('final-evaluation.json',summary);state.phase='done';}
  else{state.trial++;state.pair=0;state.results=[];delete state.candidate;}
  save();
 }
 }
 const final={at:new Date().toISOString(),mode,phase:state.phase,config:state.candidate||state.incumbent,metrics:metrics(state.phase==='final'?(state.finalResults||state.results):state.results),games:state.games,coverage:state.coverage,errors:state.errors,reason:stopping?'signal':'deadline',productionDeployed:false};atomic('stopped.json',final);save();
}finally{client.close();try{fs.unlinkSync(lockPath);}catch{}}

})().catch(e=>{console.error(e);process.exitCode=1;});
