'use strict';
// Compact win receipts survive eviction of the much larger full replays.
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.WinRecords=api;})(globalThis,()=>{
 const KEY='houseki-win-highlights-v1',finite=n=>typeof n==='number'&&Number.isFinite(n),copy=x=>JSON.parse(JSON.stringify(x));
 const order=(a,b)=>b.chips-a.chips||String(b.at).localeCompare(String(a.at))||b.seq-a.seq;
 function extract(replay,selfId=0){
  if(!replay||!['four','sanma'].includes(replay.mode)||!Array.isArray(replay.events)||replay.matchId==null)throw Error('和了記録を作成できない牌譜です');
  const wins=[];let round=null,missingWins=0;
  for(const event of replay.events){const data=event.data?.[event.type]||event.data||{};
   if(event.type==='qipai'){round=replay.mode==='four'?{wind:data.zhuangfeng,hand:data.jushu,honba:data.changbang}:{wind:data.hand>3?1:0,hand:((data.hand||1)-1)%3,honba:data.honba};continue;}
   if(event.type!=='hule')continue;
   const add=(win,chips,method,hand,transfers,detail)=>{
    if(!finite(chips)){missingWins++;return;}
    const notation={};for(const match of String(hand||'').matchAll(/([mpszf])([0-9A-C]+)/g))for(const n of match[2]){const t=match[1]+n;if(replay.notation?.tiles?.[t])notation[t]=copy(replay.notation.tiles[t]);}
    wins.push({seq:event.seq,at:replay.finishedAt||replay.startedAt||'',matchId:String(replay.matchId),mode:replay.mode,selfId,round:copy(round),chips,method,hand:hand||'',yaku:copy(win.hupai||win.yaku||[]),han:win.fanshu??win.han??null,fu:win.fu??null,points:win.defen??win.received??null,notation,transfers:copy(transfers||[]),detail:copy(detail||null)});
   };
   if(replay.mode==='four'){
    let winner=data.chipWinner;
    if(!Number.isInteger(winner)){const decision=[...(replay.decisions||[])].reverse().find(d=>d.seq<=event.seq&&Array.isArray(d.view?.playerIdsBySeat));winner=decision?.view.playerIdsBySeat[data.l];}
    if(winner!==selfId)continue;
    const total=finite(data.jewelTotal)?data.jewelTotal:finite(data.jewelChips)?data.jewelChips*(data.baojia==null?3:1):null;
    add(data,total,data.baojia==null?'ツモ':'ロン',data.shoupai,[],data.chipBreakdown);
   }else for(const win of data.wins||[]){if(win.id!==selfId)continue;let chips=null,transfers=win.chipTransfers;
    if(Array.isArray(transfers))chips=transfers.reduce((n,t)=>n+(t.to===selfId?t.amount:0)-(t.from===selfId?t.amount:0),0);
    else if(Array.isArray(data.ledger)){const entries=data.ledger.filter(e=>e.winner===selfId&&!['春の即時祝儀','トビ賞'].includes(e.label));if(entries.length)chips=entries.reduce((n,e)=>n+(finite(e.delta?.[selfId])?e.delta[selfId]:0),0);}
    add(win,chips,win.loser==null?'ツモ':'ロン',win.physical,transfers,{lines:win.lines||[],receiptMultiplier:win.receiptMultiplier??1});
   }
  }
  return {id:String(replay.matchId),at:replay.finishedAt||replay.startedAt||'',selfId,mode:replay.mode,winCount:wins.length,missingWins,wins:wins.sort(order).slice(0,10)};
 }
 function read(storage){const value=JSON.parse(storage.getItem(KEY)||'{"four":[],"sanma":[]}');if(!value||!Array.isArray(value.four)||!Array.isArray(value.sanma))throw Error('和了記録の保存形式が不正です');return value;}
 function remember(replay,selfId=0,storage=rootStorage()){try{const row=extract(replay,selfId),all=read(storage);all[row.mode]=all[row.mode].filter(g=>g.id!==row.id);all[row.mode].push(row);all[row.mode].sort((a,b)=>String(a.at).localeCompare(String(b.at)));all[row.mode]=all[row.mode].slice(-5);storage.setItem(KEY,JSON.stringify(all));return true;}catch{return false;}}
 function rootStorage(){return globalThis.localStorage;}
 function recent(games,mode,getReplay,storage=rootStorage()){
  const all=read(storage),last=games.slice(-5),wins=[];let covered=0,missingWins=0;
  for(const g of last){const id=String(g.id??g.matchId),selfId=Number.isInteger(g.self)?g.self:0;let row=all[mode].find(r=>r.id===id&&r.selfId===selfId);
   if(!row){const replay=getReplay?.(g.id??g.matchId);if(replay?.mode===mode)try{row=extract(replay,selfId);remember(replay,selfId,storage);}catch{}}
   if(row){covered++;missingWins+=row.missingWins||0;wins.push(...row.wins.map(w=>({...w,at:g.at||w.at})));}
  }
  return {games:last.length,covered,missingWins,wins:wins.sort(order).slice(0,10)};
 }
 return {KEY,extract,remember,recent};
});
