'use strict';
(()=>{
 const element=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
 function render(target,{hands=[],names=[],tenpai=null,tile}){
  const list=element('div',undefined,'draw-hands');
  hands.forEach((text,id)=>{
   const card=element('section',undefined,'draw-hand-card');card.dataset.player=id;
   card.append(element('h3',(names[id]||'プレイヤー'+(id+1))+(typeof tenpai?.[id]==='boolean'?'：'+(tenpai[id]?'テンパイ':'ノーテン'):'')));
   if(!text){card.append(element('p','手牌情報がありません'));list.append(card);return;}
   const [concealed,...melds]=text.split(','),row=element('div',undefined,'draw-hand-row draw-concealed');row.setAttribute('aria-label','手牌');
   row.append(...JewelOffline.J.rawTiles(concealed).map(tile));card.append(row);
   if(melds.length){const groups=element('div',undefined,'draw-hand-row draw-melds');groups.setAttribute('aria-label','副露');card.append(element('small','副露'));for(const meld of melds){const group=element('span',undefined,'draw-meld');group.append(...JewelOffline.J.rawTiles(meld).map(tile));groups.append(group);}card.append(groups);}
   list.append(card);
  });target.append(list);return list;
 }
 let dialog,continuation=null;
 function clear(){continuation=null;if(dialog?.open)dialog.close();}
 function show(options,done){
  clear();if(!dialog){dialog=element('dialog');dialog.id='draw-confirm';dialog.setAttribute('aria-labelledby','draw-confirm-title');dialog.addEventListener('cancel',e=>e.preventDefault());document.body.append(dialog);}
  const title=element('h2',options.title||'流局');title.id='draw-confirm-title';const content=element('div');content.id='draw-confirm-content';render(content,options);
  const next=element('button','確認して次へ');next.type='button';next.id='draw-next';next.onclick=()=>{const cb=continuation;if(!cb)return;clear();cb();};continuation=done;dialog.replaceChildren(title,content,next);dialog.showModal();
 }
 globalThis.DrawHands={render,show,clear};
})();
