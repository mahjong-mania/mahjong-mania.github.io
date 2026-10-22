'use strict';
globalThis.MatchComplete={
 close(){document.getElementById('match-complete')?.close();},
 show({rows,names,selfId=0,cold=false,saved=true,online=false,onNext,onHome}){
  let dialog=document.getElementById('match-complete');if(dialog){dialog.close();dialog.remove();}
  const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
  const signed=n=>(n>0?'+':n<0?'−':'')+Math.abs(n).toLocaleString();
  dialog=el('dialog');dialog.id='match-complete';dialog.setAttribute('aria-labelledby','complete-heading');
  const heading=el('h1',cold?'コールド・対局終了':'対局終了');heading.id='complete-heading';dialog.append(heading);
  const self=rows.find(r=>r.id===selfId);if(self){const summary=el('p',`あなたは${self.rank}着 ／ 合計 ${signed(self.rankChips+self.bonusChips)}枚`);summary.className='complete-summary';dialog.append(summary);}
  const table=el('table');table.className='complete-ledger';const caption=el('caption','東風戦の精算');table.append(caption);const head=el('thead'),titles=el('tr');for(const title of ['順位・名前','点数','順位','祝儀','合計']){const cell=el('th',title);cell.scope='col';titles.append(cell);}head.append(titles);table.append(head);const body=el('tbody');
  for(const row of rows.slice().sort((a,b)=>a.rank-b.rank)){const tr=el('tr');tr.dataset.player=row.id;if(row.id===selfId)tr.className='complete-self';const name=el('th',row.rank+'着 '+names[row.id]);name.scope='row';tr.append(name);for(const text of [row.points.toLocaleString()+'点',signed(row.rankChips),signed(row.bonusChips),signed(row.rankChips+row.bonusChips)+'枚'])tr.append(el('td',text));body.append(tr);}table.append(body);dialog.append(table);
  dialog.append(el('p','順位・祝儀・合計の単位は枚です。'));
  const note=el('p',saved?'結果を端末内に保存しました。':'成績の保存に失敗しました。表示中の結果を控えてください。');note.className='complete-note';dialog.append(note);
  if(online)dialog.append(el('p','次の対局は同じ部屋の待機画面へ戻り、全員の準備完了後にホストが開始します。'));
  const status=el('p','');status.setAttribute('role','status');dialog.append(status);const buttons=el('div');buttons.className='complete-buttons';
  for(const [text,action]of [['次の対局へ',onNext],['ホームへ',onHome]]){const button=el('button',text);button.type='button';button.onclick=async()=>{for(const b of buttons.children)b.disabled=true;try{await action();dialog.close();}catch(error){status.textContent=error.message||'操作できませんでした。もう一度お試しください。';for(const b of buttons.children)b.disabled=false;}};buttons.append(button);}dialog.append(buttons);
  dialog.addEventListener('cancel',event=>event.preventDefault());document.body.append(dialog);dialog.showModal();return dialog;
 }
};
