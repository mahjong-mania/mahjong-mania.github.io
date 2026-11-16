'use strict';
(()=>{
 const el=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;},mode=n=>['通常','確変','16R'][n];
 function mount(target,result,tile){
  const b=result.bingoTulip;if(!b)return;
  const box=el('section');box.className='bingo-receipt';box.append(el('h3','確変チューリップ：'+mode(b.initialStage)+' → '+mode(b.finalStage)),el('p','チューリップ '+b.chips+'枚 ／ ハズレ保証 '+b.initialStocks+'回'+(b.multiplier===2?' ／ 16Rで和了祝儀全体が2倍':'')));
  for(const [i,r]of b.reveals.entries()){
   const row=el('div');row.className='bingo-step';row.append(el('strong',(i+1)+'列目：'+mode(r.stageBefore)));const faces=el('div');faces.className='bingo-reveals';for(const t of r.tiles)faces.append(tile(t));row.append(faces,el('span',r.hits+'ヒット'+(r.stageAfter!==r.stageBefore?' → '+mode(r.stageAfter)+'へ昇格':'')+(r.stockUsed?' ／ 保証使用、残り'+r.stocksLeft+'回':'')));box.append(row);
  }target.append(box);
 }
 globalThis.BingoReceipt={mount};
})();
