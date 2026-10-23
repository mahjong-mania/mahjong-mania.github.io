'use strict';
(()=>{if(!('serviceWorker'in navigator)||!location.protocol.startsWith('http'))return;
 const home=document.querySelector('.web-home');let state;if(home){state=document.createElement('p');state.id='offline-storage-state';state.setAttribute('role','status');state.textContent='最新版とオフライン保存を確認中…';home.append(state);}
 const show=text=>{if(state)state.textContent=text;};
 const inMatch=()=>typeof finished!=='undefined'&&!finished||!!globalThis.sanmaGame&&!globalThis.sanmaGame.finished;
 let reloaded=false;
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloaded||inMatch())return;const controller=navigator.serviceWorker.controller;if(!controller)return;const channel=new MessageChannel();channel.port1.onmessage=event=>{channel.port1.close();const shown=document.querySelector('meta[name="houseki-build"]')?.content;if(shown&&event.data.version!==shown&&!inMatch()&&!reloaded){reloaded=true;location.reload();}};controller.postMessage({type:'BUILD_VERSION'},[channel.port2]);});
 navigator.serviceWorker.register('sw.js',{scope:'./',updateViaCache:'none'}).then(async registration=>{
  const status=async()=>{try{const keys=await caches.keys(),ready=!!registration.active&&(await Promise.all(keys.filter(k=>k.startsWith('houseki-static-')).map(async k=>(await caches.open(k)).match(new URL('__offline_ready__',location.href))))).some(Boolean);show(ready?'オフライン保存済み：オンラインで開くたびに最新版を確認します。':'オフライン用ファイルを保存しています…');}catch{show('保存状態を確認できません。接続マニュアルをご確認ください。');}};
  registration.addEventListener('updatefound',()=>{const worker=registration.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'||worker.state==='activated')status();if(worker.state==='redundant')show('更新を保存できませんでした。保存済みの版で引き続き遊べます。');});});
  const check=()=>{if(navigator.onLine)registration.update().catch(()=>{});};
  window.addEventListener('online',check);document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});check();await status();await navigator.serviceWorker.ready;status();
 }).catch(()=>show('オフライン保存できませんでした。通信・空き容量・ブラウザ設定をご確認ください。'));
})();
