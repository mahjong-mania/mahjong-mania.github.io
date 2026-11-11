'use strict';
// The native Akagi interface has a dummy fourth seat. The candidate WASM fork
// accepts three seats; this conversion changes wire layout, not game state.
function sanmaWireEvent(raw){const e=structuredClone(raw);for(const key of ['scores','tehais','deltas']){if(Array.isArray(e[key])&&e[key].length===4)e[key]=e[key].slice(0,3);}return e;}
class SanmaWasmEncoder{
 constructor(wasm,version=4){this.wasm=wasm;this.version=version;const shape=Array.from(wasm.obs_shape(version));if(shape[0]!==775||shape[1]!==34||wasm.action_space()!==44)throw Error(`Incompatible sanma encoder: ${shape.join('x')}, actions=${wasm.action_space()}; expected 775x34 / 44`);}
 encode(seat,events,atKanSelect=false){if(!Number.isInteger(seat)||seat<0||seat>2)throw Error('Invalid seat');if(events[0]?.type!=='start_kyoku')throw Error('Complete public round history required');const state=new this.wasm.PlayerStateHandle(seat);try{for(const e of events)state.apply_event(JSON.stringify(sanmaWireEvent(e)));const obs=state.encode_obs(this.version,atKanSelect),mask=state.encode_obs_mask(this.version,atKanSelect);if(obs.length!==775*34||mask.length!==44||!obs.every(Number.isFinite)||!mask.some(Boolean))throw Error('Invalid encoder output');return {obs,mask:Array.from(mask,Boolean)};}finally{state.free();}}
}
if(typeof module!=='undefined')module.exports={sanmaWireEvent,SanmaWasmEncoder};else Object.assign(globalThis,{sanmaWireEvent,SanmaWasmEncoder});
