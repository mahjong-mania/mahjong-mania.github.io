'use strict';
(()=>{
 const C=globalThis.JewelMortalCore;if(!C)return;const {E}=C,histories=new WeakMap(),stats={requests:0,inferences:0,fallbacks:0,lastError:null};
 function endpoint(){return globalThis.JewelMortalConfig?.endpoint;}
 let worker,nextId=0;const pending=new Map();
 function localInfer(request){if(!worker){worker=new Worker('mortal-local-worker.js');worker.onmessage=({data})=>{const p=pending.get(data.id);if(p){clearTimeout(p.timer);pending.delete(data.id);p.resolve(data.result);}};worker.onerror=()=>{for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('local worker failed'));}pending.clear();worker.terminate();worker=null;};}return new Promise((resolve,reject)=>{const id=++nextId,timer=setTimeout(()=>{pending.delete(id);reject(Error('local inference timeout'));},15000);pending.set(id,{resolve,reject,timer});worker.postMessage({id,request});});}
 function local(){return globalThis.JewelMortalConfig?.localSanma===true;}
 function config(mode){return globalThis.JewelMortalConfig?.[mode]||{};}
 async function infer(request){stats.requests++;if(request.mode==='sanma'&&local()){const r=await localInfer(request);if(!r.ok||!r.actualInference)throw Error(r.error||'local inference failed');stats.inferences++;return r;}const response=await fetch(endpoint(),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request),signal:AbortSignal.timeout(4000)});if(!response.ok)throw Error('Mortal HTTP '+response.status);const r=await response.json();if(!r.ok||!r.actualInference)throw Error(r.error||'no Mortal inference');stats.inferences++;return r;}
 function fallback(error,fn){stats.fallbacks++;stats.lastError=String(error.message||error);return fn();}
 function observe(p,msg){if(!endpoint())return;let h=histories.get(p);if(!h){h=new C.FourHistory();histories.set(p,h);}h.observe(msg,p);}
 function four(p,options){if(!endpoint()||config('four').enabled===false||!p._rule.nekkyou||p._rule.cpuLevel!=='expert')return null;const choices=options.filter(a=>a.reply.dapai);if(choices.length<2||p.shoupai.lizhi||options.some(a=>a.reply.hule))return null;const history=histories.get(p);if(!history)return null;
  try{return infer(history.request(p)).then(r=>C.select({options:choices,inference:r,score:a=>C.featuresFour(p,a),config:config('four')})).catch(e=>fallback(e,()=>E.cpu(p,options)));}catch(e){return Promise.resolve(fallback(e,()=>E.cpu(p,options)));}
 }
 function sanma(g){if((!endpoint()&&!local())||config('sanma').enabled===false||g.options.cpuLevel!=='expert'||g.options.flowerCopies!==1||g.options.pocchiIppatsuDice||g.options.pocchiTypes.join(',')!=='normal'||!Object.entries(E.Sanma.H.PRESET).every(([k,v])=>g.options.house[k]===v)||!Object.entries({spring:'tulip',summer:'rank',autumn:'double',winter:'dice'}).every(([k,v])=>g.options.flowerRules[k]===v))return null;const options=g.actions(),choices=options.filter(a=>a.reply.discard);if(choices.length<2||g.hands[g.actor].lizhi||options.some(a=>a.reply.win||a.reply.nuki))return null;
  try{return infer(C.sanmaRequest(g)).then(r=>C.select({options:choices,inference:r,score:a=>C.featuresSanma(g,a),config:config('sanma')})).catch(e=>fallback(e,()=>E.Sanma.cpu(g)));}catch(e){return Promise.resolve(fallback(e,()=>E.Sanma.cpu(g)));}
 }
 globalThis.JewelMortal={observe,four,sanma,stats};
})();
