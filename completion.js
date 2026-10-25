'use strict';
globalThis.MatchComplete={
 close(){document.getElementById('match-complete')?.close();},
 show({rows,names,selfId=0,cold=false,saved=true,online=false,isHost=false,onNext,onHome}){
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
  if(online&&isHost){
   const section=el('section');section.id='room-result-export';section.append(el('h2','結果を書き出す（ホスト）'),el('p','名前は書き出し用です。チップ枚数は順位チップ＋祝儀の合計で、対局結果自体は変更しません。'));
   const label=el('label','1枚あたりの倍率 '),factor=el('input');factor.id='result-export-factor';factor.type='number';factor.step='any';factor.value='1';label.append(factor);section.append(label);
   const wrap=el('div');wrap.style.overflowX='auto';const ledger=el('table');ledger.className='complete-ledger';const header=el('tr');for(const title of ['着順','プレイヤー名','チップ枚数','換算値'])header.append(el('th',title));const thead=el('thead');thead.append(header);ledger.append(thead);const body=el('tbody'),items=[];
   for(const row of rows.slice().sort((a,b)=>a.rank-b.rank)){const tr=el('tr'),input=el('input');input.type='text';input.maxLength=40;input.value=names[row.id]||'プレイヤー '+(row.id+1);input.setAttribute('aria-label',row.rank+'着のプレイヤー名');const cell=el('td');cell.append(input);const chips=row.rankChips+row.bonusChips,value=el('td');tr.append(el('td',row.rank+'着'),cell,el('td',signed(chips)+'枚'),value);body.append(tr);items.push({row,input,chips,value});}ledger.append(body);wrap.append(ledger);section.append(wrap);
   const text=el('textarea');text.id='result-export-text';text.readOnly=true;text.rows=8;text.setAttribute('aria-label','コピー用の対局結果');const copy=el('button','結果のテキストをコピー');copy.type='button';const feedback=el('p','');feedback.setAttribute('role','status');
   const format=n=>Object.is(n,-0)?'0':n.toLocaleString('ja-JP',{maximumSignificantDigits:15});
   const refresh=()=>{const multiplier=Number(factor.value),valid=factor.value.trim()!==''&&Number.isFinite(multiplier)&&items.every(i=>Number.isFinite(i.chips*multiplier));copy.disabled=!valid;for(const i of items)i.value.textContent=valid?format(i.chips*multiplier):'—';text.value=valid?['ルーム対戦結果','換算：1枚 × '+format(multiplier),'着順\tプレイヤー名\tチップ枚数\t換算値',...items.map(i=>[i.row.rank+'着',i.input.value.replace(/[\t\r\n]/g,' ').trim()||names[i.row.id],signed(i.chips)+'枚',format(i.chips*multiplier)].join('\t'))].join('\n'):'';feedback.textContent=valid?'':'有限の数値を入力してください。';};
   factor.oninput=refresh;for(const i of items)i.input.oninput=refresh;
   copy.onclick=async()=>{try{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(text.value);else{ text.focus();text.select();if(!document.execCommand('copy'))throw Error();}feedback.textContent='結果をコピーしました。';}catch{text.focus();text.select();feedback.textContent='自動コピーができませんでした。選択したテキストをコピーしてください。';}};
   section.append(copy,text,feedback);dialog.append(section);refresh();
  }
  const status=el('p','');status.setAttribute('role','status');dialog.append(status);const buttons=el('div');buttons.className='complete-buttons';
  for(const [text,action]of [['次の対局へ',onNext],['ホームへ',onHome]]){const button=el('button',text);button.type='button';button.onclick=async()=>{for(const b of buttons.children)b.disabled=true;try{await action();dialog.close();}catch(error){status.textContent=error.message||'操作できませんでした。もう一度お試しください。';for(const b of buttons.children)b.disabled=false;}};buttons.append(button);}dialog.append(buttons);
  dialog.addEventListener('cancel',event=>event.preventDefault());document.body.append(dialog);dialog.showModal();return dialog;
 }
};
