'use strict';
(()=>{
 const D=RecordData,R=JewelOffline.ResultRules,el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;},num=n=>Number.isFinite(n)?n:0,signed=n=>(n>0?'+':'')+n.toLocaleString('ja-JP');
 const loaded=D.load(localStorage,id=>globalThis.ReplayExport?.get(id));
 function table(g){
  const wrap=el('div',undefined,'record-table-scroll'),t=el('table',undefined,'record-table'),head=el('tr');for(const text of ['プレイヤー','順位','点数','順位チップ','祝儀','合計'])head.append(el('th',text));const thead=el('thead');thead.append(head);t.append(thead);const body=el('tbody');
  for(const r of g.results.slice().sort((a,b)=>num(a.rank)-num(b.rank))){const row=el('tr'),name=r.id===g.self?'あなた':g.connection==='solo'?'CPU '+r.id:'対戦相手 '+(num(r.id)+1);for(const text of [name,r.rank+'着',num(r.points).toLocaleString('ja-JP'),signed(num(r.rankChips)),signed(num(r.bonusChips)),signed(num(r.rankChips)+num(r.bonusChips))])row.append(el('td',text));body.append(row);}t.append(body);wrap.append(t);return wrap;
 }
 function savedNames(mode){try{const key=mode==='four'?'houseki-four-custom-rules-v1':'houseki-sanma-custom-rules-v1',r=JSON.parse(localStorage.getItem(key)||'{}');return (r.profiles||[]).map(p=>p.name);}catch{return [];}}
 for(const [mode,seats,id]of [['four',4,'four-records'],['sanma',3,'sanma-records']]){
  const root=document.getElementById(id),connection=root.querySelector('[data-filter=connection]'),rule=root.querySelector('[data-filter=rule]'),games=loaded.games[mode];
  for(const option of D.rules(games,mode,savedNames(mode))){const o=el('option',option.label);o.value=option.value;rule.append(o);}
  // Both selectors start with all on every visit.
  connection.value='all';rule.value='all';
  function render(){
   const selected=D.filter(games,{connection:connection.value,rule:rule.value}),total=D.totals(selected,seats),summary=root.querySelector('.record-summary'),history=root.querySelector('.record-history');summary.replaceChildren();history.replaceChildren();root.querySelectorAll('.win-highlights').forEach(e=>e.remove());
   for(const [label,value]of [['対局数',total.games+'戦'],['順位チップ',signed(total.rankChips)+'枚'],['祝儀収支',signed(total.bonusChips)+'枚'],['合計',signed(total.rankChips+total.bonusChips)+'枚'],...total.placements.map((n,i)=>[(i+1)+'着',n+'回'])]){const stat=el('div',label,'record-stat'+(/着$/.test(label)?' placement-count':''));stat.append(el('strong',value));summary.append(stat);}
   if(!selected.length)history.append(el('p',games.length?'この条件に合う対局はありません。':'保存済みの対局はありません。'));
   for(const g of selected.slice(-30).reverse()){
    const own=g.results.find(r=>r.id===g.self),date=new Date(g.at),entry=el('details'),when=Number.isNaN(date.getTime())?'日時不明':date.toLocaleString('ja-JP');
    entry.append(el('summary',when+' ／ '+(g.connection==='solo'?'ひとり':'オンライン')+' ／ '+R.label(g.ruleMeta)+' ／ '+own.rank+'着 ／ '+signed(own.rankChips+own.bonusChips)+'枚'),table(g));
    const replay=globalThis.ReplayExport?.get(g.id??g.matchId);if(replay)ReplayExport.mount(entry,replay);else entry.append(el('p','この対局の牌譜は保存されていません。'));history.append(entry);
   }
   globalThis.WinHighlights?.mount(root,selected,mode);
   const text=selected.filter(g=>g.ruleMeta.type==='unknown').length;
   root.querySelector('.record-status').textContent=(loaded.errors[mode].length?'一部の成績を読み込めませんでした。保存データは変更していません。 ':'')+(text?'ルール情報が残っていない旧記録'+text+'戦を含みます。 ':'')+'表示中：'+rule.selectedOptions[0].textContent+' ／ '+connection.selectedOptions[0].textContent+'。参加席に合わせて、あなた自身の収支を集計しています。';
  }
  connection.onchange=render;rule.onchange=render;render();
 }
})();
