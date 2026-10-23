'use strict';
(()=>{
 let current=null;
 function close(){if(!current)return;clearTimeout(current.timer);current.dialog.close();current.dialog.remove();current=null;}
 function show(done){close();const dialog=document.createElement('dialog');dialog.id='apology-notice';dialog.setAttribute('aria-labelledby','apology-heading');dialog.style.cssText='text-align:center;max-width:360px;padding:28px 20px;border:2px solid #dfc782;border-radius:14px;background:#183e31;color:#fff0bd';const heading=document.createElement('h1');heading.id='apology-heading';heading.textContent='ごめんね';heading.style.cssText='font-size:36px;margin:0 0 18px';const note=document.createElement('p');note.textContent='3秒後に和了結果を表示します';const accept=document.createElement('button');accept.id='apology-accept';accept.className='primary';accept.textContent='受け入れる';accept.style.cssText='min-height:44px;padding:10px 28px;background:#e4c87b;color:#183024;border-radius:6px;font:inherit;font-weight:bold';dialog.append(heading,note,accept);document.body.append(dialog);const state={dialog,timer:null};current=state;
  const finish=()=>{if(current!==state)return;close();done();};accept.onclick=finish;dialog.addEventListener('cancel',event=>event.preventDefault());dialog.showModal();state.timer=setTimeout(finish,3000);
 }
 globalThis.ApologyNotice={show,close};
})();
