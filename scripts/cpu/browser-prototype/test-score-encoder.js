'use strict';
const fs=require('fs'),assert=require('assert/strict'),w=require('/workspace/mahjong-browser-prototype/wasm-patched/libriichi_wasm.js'),{sanmaWireEvent}=require('./encoder-adapter');
const fixtures=JSON.parse(fs.readFileSync('/workspace/mahjong-browser-prototype/score-fixtures.json'));let maxError=0;for(const f of fixtures){const s=new w.PlayerStateHandle(f.seat);try{for(const e of f.events)s.apply_event(JSON.stringify(sanmaWireEvent(e)));const obs=s.encode_obs(5,false),ref=f.prefix.slice(0,13).flat();for(let i=0;i<ref.length;i++)maxError=Math.max(maxError,Math.abs(obs[i]-ref[i]));}finally{s.free();}}
console.log({fixtures:fixtures.length,channelsChecked:13,maxError});assert.ok(maxError<1e-6,'score normalization must match native across boundaries');
