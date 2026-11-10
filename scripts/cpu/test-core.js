'use strict';
const assert=require('node:assert/strict');
const C=require('./mortal-adapter'),{E}=C;
assert.equal(C.tile('p0*'),'5p');assert.equal(C.tile('z8'),'F');assert.equal(C.tile('z9'),'N');assert.equal(C.index('zA'),31);
assert.deepEqual(C.meld(0,'p555+',3),{type:'pon',actor:0,target:1,pai:'5p',consumed:['5p','5p']});
assert.equal(C.meld(0,'p123-',4).type,'chi');assert.equal(C.meld(0,'p1111',4).type,'ankan');assert.equal(C.meld(0,'p111+1',4).type,'kakan');
const g=new E.Sanma.Game({rng:()=>.61,house:E.Sanma.H.PRESET,flowerCopies:1,flowerRules:{spring:'tulip',summer:'rank',autumn:'double',winter:'dice'}});
const before=C.sanmaRequest(g),self=g.actor;
for(const e of g.replayRecord.events){if(e.type==='qipai')e.data.hands=e.data.hands.map((h,id)=>id===self?h:'p1112223334445');if(e.type==='zimo'&&e.data.playerId!==self)e.data.tile='p1';}
assert.deepEqual(C.sanmaRequest(g),before,'opponent hidden hands must not reach Mortal');
assert.equal(before.events[0].tehais.filter(h=>h.every(t=>t==='?')).length,3);
const choices=g.actions().filter(a=>a.reply.discard);if(choices.length){const features=C.featuresSanma(g,choices[0].reply);g.wall=g.wall.map(()=> 'p1');assert.deepEqual(C.featuresSanma(g,choices[0].reply),features,'wall identity must not affect correction');}
const options=[{reply:{discard:'p1'}},{reply:{discard:'p2'}}],q=Array(44).fill(null);q[9]=1;q[10]=2;
assert.deepEqual(C.select({options,inference:{ok:true,actualInference:true,model:'sanma-test',q},score:()=>({shape:0,chips:0,risk:0,riichi:0,shuba:0})}),options[1].reply);
assert.throws(()=>C.select({options,inference:{ok:false,error:'offline'}}),/offline/);
const rule=E.rule({nekkyou:true,cpuLevel:'expert'}),own=E.M.Shoupai.fromString('m123p123s123z12345'),opp=E.M.Shoupai.fromString('m123p123s123z1122');opp._lizhi=true;
const p={shoupai:own,_menfeng:0,_rule:rule,model:{shoupai:[own,opp,E.M.Shoupai.fromString(''),E.M.Shoupai.fromString('')],he:Array.from({length:4},()=>({_pai:[]})),openRiichi:[false,true,false,false],shan:{baopai:['m9']},defen:[25000,25000,25000,25000],player_id:[0,1,2,3],zhuangfeng:0}};
assert.equal(C.featuresFour(p,{dapai:'z1'}).forbidden,true);assert.equal(C.featuresFour(p,{dapai:'z3'}).forbidden,false);
const dangerQ=Array(46).fill(null);dangerQ[27]=100;dangerQ[29]=0;
assert.deepEqual(C.select({options:[{reply:{dapai:'z1'}},{reply:{dapai:'z3'}}],inference:{ok:true,actualInference:true,model:'four-test',q:dangerQ},score:a=>C.featuresFour(p,a),config:{defenseWeight:0}}),{dapai:'z3'});
assert.equal(C.expectedRun([{count:1,reward:2},{count:1,reward:0}],2),1);
assert.equal(C.expectedRun([{count:1,reward:2},{count:1,reward:4},{count:1,reward:0}],3),3);
assert.equal(C.expectedRun([{count:1,reward:2},{count:1,reward:4}],2),6);
const fake={lines:[],eff:[0,0,0,1],damanguan:0,diceEligible:false,allFlowers:false,fourNorth:false,allStar:false};
assert.equal(C.sanmaBonusExpectation(g,0,{lizhi:false},fake,{left:()=>0},'p1'),7,'winter is one die per payer, expectation 3.5 each');
assert.equal(C.sanmaBonusExpectation(g,0,{lizhi:false},{...fake,eff:[0,0,0,0],damanguan:1,diceEligible:true},{left:()=>0},'p1'),18,'two-dice doubles continuation has expectation 9 per payer');
const originalScore=E.Sanma.score;let futureCalls=0;try{E.Sanma.score=opts=>{futureCalls++;assert.equal(opts.tianhu,0);assert.deepEqual(opts.ura,[]);return null;};const ready=E.M.Shoupai.fromString('p123456789s2334');ready._lizhi=true;C.sanmaReady(g,0,ready,['s3','s6'],{left:()=>4,physical:new Map()},{discard:'s5',riichi:true});assert.ok(futureCalls>0);}finally{E.Sanma.score=originalScore;}
console.log('PASS: tile identities, melds, legal action masking, private-hand and hidden-wall isolation.');
