'use strict';
// Join credentials stay in the URL fragment and POST body, never the server URL.
(()=>{
 const game=new URLSearchParams(location.search).get('game'),kind=['sanma','chinchiro'].includes(game)?game:'four',key='houseki-room-invite-v1-'+kind;
 let pending=null;
 try{
  const hash=new URLSearchParams(location.hash.slice(1));
  if(hash.has('invite')){
   const room=hash.get('room'),token=hash.get('invite');
   if(/^[A-F0-9]{8}$/.test(room||'')&&/^[a-f0-9]{64}$/.test(token||'')){pending={room,token,at:Date.now()};sessionStorage.setItem(key,JSON.stringify(pending));}
   else{sessionStorage.removeItem(key);pending={invalid:true};}
   history.replaceState(null,'',location.pathname+location.search);
  }else{const p=JSON.parse(sessionStorage.getItem(key)||'null');if(p&&Date.now()-p.at<2*60*60*1000)pending=p;else sessionStorage.removeItem(key);}
 }catch{}
 function prepare(){
  if(!pending||!document.getElementById('room-code'))return;
  const note=document.createElement('p');note.id='invitation-note';note.setAttribute('role','status');
  note.textContent=pending.invalid?'招待URLの形式が不正です。オーナーに確認してください。':'招待されたルームです。名前を入力して「参加する」を押してください。';
  document.getElementById('join-form').prepend(note);
  if(!pending.invalid){document.getElementById('room-code').value=pending.room;document.getElementById('online-name').focus();}
 }
 function tokenFor(room){return pending?.room===room?pending.token:undefined;}
 function consume(){pending=null;try{sessionStorage.removeItem(key);}catch{}}
 function mount({container,room,owner,phase,near,request}){
  let panel=document.getElementById('room-invitation');
  if(near)return;
  if(!panel){
   panel=document.createElement('section');panel.id='room-invitation';panel.dataset.captureIgnore='true';
   const title=document.createElement('h3');title.textContent='ルームに招待';
   const input=document.createElement('input');input.id='room-invite-url';input.type='text';input.readOnly=true;input.setAttribute('aria-label','招待URL');input.style.cssText='display:block;width:100%;box-sizing:border-box';
   const note=document.createElement('p');note.id='room-invite-status';note.setAttribute('role','status');note.textContent='招待URLは2時間有効です。入口のパスワードは別途必要です。';
   panel.append(title,input);
   for(const [id,label]of [['copy-room-invite','招待URLをコピー'],['share-room-invite','招待URLを共有'],['renew-room-invite','招待URLを再発行']]){const b=document.createElement('button');b.id=id;b.textContent=label;panel.append(b);}
   panel.append(note);container.append(panel);
  }
  panel.hidden=!owner||phase!=='lobby';if(panel.hidden)return;
  if(panel.dataset.room!==room){panel.dataset.room=room;document.getElementById('room-invite-url').value='';}
  let busy=false;
  const execute=async action=>{
   if(busy)return;busy=true;const buttons=panel.querySelectorAll('button');buttons.forEach(b=>b.disabled=true);
   const input=document.getElementById('room-invite-url'),note=document.getElementById('room-invite-status');
   try{
    if(action==='renew'&&!confirm('以前の招待URLを無効にして再発行しますか？'))return;
    // Use the current page origin, not an arbitrary server URL supplied by a guest.
    if(!input.value||action==='renew'){
     const result=await request((kind==='four'?'/api/rooms/':'/api/tables/')+room+'/invite',{rotate:action==='renew'});
     const url=new URL(kind==='four'?'online.html':'table-online.html',location.href);url.search='';url.hash='';
     if(kind!=='four'){url.searchParams.set('game',kind);url.searchParams.set('connection','remote');}
     url.hash=new URLSearchParams({room,invite:result.token}).toString();input.value=url.href;
    }
    if(action==='prepare'){note.textContent='URLを共有すると、相手は名前を入力して参加できます。入口のパスワードは別途必要です。';return;}
    if(action==='renew'){note.textContent='再発行しました。以前の招待URLでは参加できません。';return;}
    if(action==='share'&&globalThis.Android?.shareText){Android.shareText(input.value);note.textContent='共有先を選んでください。';}
    else if(action==='share'&&navigator.share){await navigator.share({title:'宝石麻雀のルーム招待',url:input.value});note.textContent='招待URLを共有しました。';}
    else if(globalThis.Android?.copyText){Android.copyText(input.value);note.textContent='招待URLをコピーしました。';}
    else{await navigator.clipboard.writeText(input.value);note.textContent='招待URLをコピーしました。';}
   }catch(e){if(e.name==='AbortError')note.textContent='共有をキャンセルしました。';else{note.textContent='共有できませんでした：'+e.message+'。URL欄が表示されていれば選択してコピーできます。';input.focus();input.select();}}
   finally{busy=false;buttons.forEach(b=>b.disabled=false);}
  };
  document.getElementById('copy-room-invite').onclick=()=>execute('copy');document.getElementById('share-room-invite').onclick=()=>execute('share');document.getElementById('renew-room-invite').onclick=()=>execute('renew');
  if(!document.getElementById('room-invite-url').value&&!panel._loading){panel._loading=true;execute('prepare').finally(()=>panel._loading=false);}
 }
 globalThis.RoomInvite={tokenFor,consume,mount,get pending(){return pending;}};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',prepare,{once:true});else prepare();
})();
