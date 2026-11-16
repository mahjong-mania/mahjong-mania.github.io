'use strict';
(()=>{
 const D=RecordData,R=JewelOffline.ResultRules,el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;},num=n=>Number.isFinite(n)?n:0,signed=n=>(n>0?'+':'')+n.toLocaleString('ja-JP');
 let loaded=D.load(localStorage,id=>globalThis.ReplayExport?.get(id));
 function table(g){
  const wrap=el('div',undefined,'record-table-scroll'),t=el('table',undefined,'record-table'),head=el('tr');for(const text of ['プレイヤー','順位','点数','精算チップ','祝儀','合計',...(g.pointSettlement?['点数精算（pt）']:[])])head.append(el('th',text));const thead=el('thead');thead.append(head);t.append(thead);const body=el('tbody');
  for(const r of g.results.slice().sort((a,b)=>num(a.rank)-num(b.rank))){const row=el('tr'),name=r.id===g.self?'あなた':g.connection==='solo'?'CPU '+r.id:'対戦相手 '+(num(r.id)+1);for(const text of [name,r.rank+'着',num(r.points).toLocaleString('ja-JP'),signed(num(r.rankChips)),signed(num(r.bonusChips)),signed(num(r.rankChips)+num(r.bonusChips)),...(g.pointSettlement?[signed(num(r.score))]:[])])row.append(el('td',text));body.append(row);}t.append(body);wrap.append(t);return wrap;
 }
 function savedNames(mode){try{const key=mode==='four'?'houseki-four-custom-rules-v1':'houseki-sanma-custom-rules-v1',r=JSON.parse(localStorage.getItem(key)||'{}');return (r.profiles||[]).map(p=>p.name);}catch{return [];}}
 for(const [mode,seats,id]of [['four',4,'four-records'],['sanma',3,'sanma-records']]){
  const root=document.getElementById(id),connection=root.querySelector('[data-filter=connection]'),rule=root.querySelector('[data-filter=rule]'),games=loaded.games[mode];
  for(const option of D.rules(games,mode,savedNames(mode))){const o=el('option',option.label);o.value=option.value;rule.append(o);}
  // Both selectors start with all on every visit.
  connection.value='all';rule.value='all';
  let notice='';function render(){
   loaded=D.load(localStorage,id=>globalThis.ReplayExport?.get(id));games.splice(0,games.length,...loaded.games[mode]);const selected=D.filter(games,{connection:connection.value,rule:rule.value}),total=D.totals(selected,seats),summary=root.querySelector('.record-summary'),history=root.querySelector('.record-history');summary.replaceChildren();history.replaceChildren();root.querySelectorAll('.win-highlights').forEach(e=>e.remove());
   if(total.pointGames){const stat=el('div','点数精算（'+total.pointGames+'戦）','record-stat');stat.append(el('strong',signed(Math.round(total.score*1000)/1000)+'pt'));summary.append(stat);}
   for(const [label,value]of [['対局数',total.games+'戦'],['精算チップ',signed(total.rankChips)+'枚'],['祝儀収支',signed(total.bonusChips)+'枚'],['合計',signed(total.rankChips+total.bonusChips)+'枚'],...total.placements.map((n,i)=>[(i+1)+'着',n+'回'])]){const stat=el('div',label,'record-stat'+(/着$/.test(label)?' placement-count':''));stat.append(el('strong',value));summary.append(stat);}
   if(!selected.length)history.append(el('p',games.length?'この条件に合う対局はありません。':'保存済みの対局はありません。'));
   for(const g of selected.slice(-30).reverse()){
    const own=g.results.find(r=>r.id===g.self),date=new Date(g.at),entry=el('details'),when=Number.isNaN(date.getTime())?'日時不明':date.toLocaleString('ja-JP');
    entry.append(el('summary',when+' ／ '+(g.connection==='solo'?'ひとり':'オンライン')+' ／ '+R.label(g.ruleMeta)+' ／ '+own.rank+'着 ／ '+signed(own.rankChips+own.bonusChips)+'枚'+(g.pointSettlement?' ／ 点数精算 '+signed(num(own.score))+'pt':'')),table(g));
    if(g.ruleSource==='inferred')entry.append(el('p','順位祝儀の組み合わせから推定した分類です。必要なら変更できます。'));
    const controls=el('div',undefined,'record-assignment'),select=el('select');select.setAttribute('aria-label','この対局のルール分類');
    for(const o of D.rules(games,mode,savedNames(mode))){const item=el('option',o.label);item.value=o.value;select.append(item);}if(![...select.options].some(o=>o.value==='unknown')){const o=el('option','自動判定に戻す');o.value='unknown';select.append(o);}for(const o of select.options)if(o.value==='unknown')o.textContent='自動判定に戻す';select.value=R.key(g.ruleMeta);const save=el('button','この分類で保存');save.type='button';const info=el('span');info.setAttribute('role','status');save.onclick=()=>{try{const value=select.value,type=value.startsWith('custom:')?'custom':value;D.assign(localStorage,g.overrideKey,{version:1,game:mode,type,...(type==='custom'?{name:value.slice(7)}:{})},mode);notice='分類を保存しました。';render();}catch(e){info.textContent='保存できません：'+e.message;}};controls.append(select,save,info);entry.append(controls);
    const replay=globalThis.ReplayExport?.get(g.id??g.matchId);if(replay)ReplayExport.mount(entry,replay);else entry.append(el('p','この対局の牌譜は保存されていません。'));history.append(entry);
   }
   globalThis.WinHighlights?.mount(root,selected,mode);
   const inferred=selected.filter(g=>g.ruleSource==='inferred').length;const text=selected.filter(g=>g.ruleMeta.type==='unknown').length;
   root.querySelector('.record-status').textContent=notice+(loaded.errors[mode].length?'一部の成績を読み込めませんでした。保存データは変更していません。 ':'')+(inferred?'順位祝儀から推定した旧記録'+inferred+'戦を含みます。 ':'')+(text?'ルール情報が残っていない旧記録'+text+'戦を含みます。 ':'')+'表示中：'+rule.selectedOptions[0].textContent+' ／ '+connection.selectedOptions[0].textContent+'。参加席に合わせて、あなた自身の収支を集計しています。';
  }
  connection.onchange=render;rule.onchange=render;render();
 }
})();
