'use strict';
// Reuse the currently legal draw-tile button; never construct a game action here.
(()=>{
 const hand=document.getElementById('hand')||document.getElementById('sanma-hand');
 if(!hand)return;
 const style=document.createElement('style');
 style.textContent='.portrait-discard{display:none}@media(orientation:portrait){.portrait-discard{display:flex;justify-content:flex-end;max-width:720px;margin:12px auto;padding:0 16px calc(12px + env(safe-area-inset-bottom,0px))}.portrait-discard button{font:700 17px system-ui,sans-serif;min-width:132px;min-height:52px;padding:12px 24px;border:1px solid #a3b7b0;border-radius:9px;background:#e9d18e;color:#19372c;cursor:pointer}.portrait-discard button:disabled{opacity:.35;cursor:default}.portrait-discard button:focus-visible{outline:3px solid #71d8e3;outline-offset:3px}}';
 document.head.append(style);
 const panel=document.createElement('section');panel.className='portrait-discard';panel.setAttribute('aria-label','ツモ切り操作');
 const button=document.createElement('button');button.id='portrait-tsumogiri';button.type='button';button.textContent='ツモ切り';button.disabled=true;panel.append(button);
 // Place outside the table and hand-panel, in the dark space beneath the game.
 const main=hand.closest('main');if(main)main.after(panel);else document.body.append(panel);
 function current(){
  if(document.querySelector('dialog[open]'))return null;
  // While selecting a riichi declaration, require selecting its discard explicitly.
  if(document.querySelector('#actions button.armed')||document.getElementById('sanma-help')?.textContent==='リーチする打牌を選択')return null;
  return hand.querySelector('button.draw:not(:disabled)');
 }
 function sync(){const disabled=!current();if(button.disabled!==disabled)button.disabled=disabled;}
 button.onclick=()=>{const draw=current();if(!draw)return;button.disabled=true;draw.click();sync();};
 const observer=new MutationObserver(records=>{if(records.some(r=>!panel.contains(r.target)))sync();});
 observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['disabled','open','class']});
 sync();
})();
