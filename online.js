'use strict';
let onlineActiveMatchId=null,onlineSession=null,onlineCursor=0,onlineActivePrompt=null,onlineSent=new Set(),onlineLobby=null,polling=false;
const onlineState=text=>{$('connection-state').textContent=text;};
async function api(path,body){if(globalThis.NearbyTransport)return NearbyTransport.request(path,body,onlineSession);const response=await fetch(path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(onlineSession?{Authorization:'Bearer '+onlineSession.token}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});const data=await response.json();if(!response.ok)throw Error(data.error||'通信に失敗しました');return data;}
function roomPath(suffix){return '/api/rooms/'+onlineSession.room+'/'+suffix;}
async function command(data){try{await api(roomPath('command'),data);}catch(e){onlineState(e.message);if(data.type==='reply'){onlineSent.delete(data.id);if(onlineActivePrompt?.id===data.id){const retry=onlineActivePrompt;onlineActivePrompt=null;presentPrompt(retry);}}throw e;}}
function clearOnlinePrompt(){pending=null;winContinuation=null;riichiContinuation=null;$('win-confirm').close();$('riichi-confirm').close();$('actions').replaceChildren();renderHand();}
function presentPrompt(p){if(!p||onlineSent.has(p.id)||onlineActivePrompt?.id===p.id)return;onlineActivePrompt=p;
 const reply=value=>{if(onlineSent.has(p.id))return;onlineSent.add(p.id);command({type:'reply',id:p.id,reply:value||{}}).catch(()=>{});};
 $('status').textContent+=' / 操作期限 '+new Date(p.deadline).toLocaleTimeString();
 if(p.type==='action')choose(p.data.options,reply,null,human);
 else if(p.type==='win')showWin(p.data,()=>reply({}),human);
 else if(p.type==='riichi')showRiichi(p.data,()=>reply({}),human);
}
function showLobby(lobby){onlineLobby=lobby;if(globalThis.NearbyTransport){const panel=$('nearby-connection');if(panel){panel.hidden=false;if(lobby.phase==='playing')$('table-menu').append(panel);else document.body.insertBefore(panel,$('game-area'));}}$('resume-table').hidden=!human?.model.shan||lobby.phase==='lobby';$('join-form').hidden=true;$('room-info').hidden=false;$('room-title').textContent='合言葉：'+lobby.room;$('room-members').replaceChildren();for(const m of lobby.members){const p=document.createElement('p');p.textContent=(m.id===onlineSession.self?'あなた：':'')+m.name+(m.id===lobby.host?'（ホスト）':'')+' / '+(m.ready?'準備完了':'準備中');$('room-members').append(p);}const cpu=document.createElement('p');cpu.textContent='空席CPU：'+lobby.cpu+'人';$('room-members').append(cpu);$('room-gems').textContent='宝石：'+lobby.selection.map(id=>J.BY_ID[id].name).join('・');const host=lobby.host===onlineSession.self;$('start-room').hidden=!host;$('start-room').disabled=lobby.phase!=='lobby'||lobby.members.length<2||!lobby.members.every(m=>m.ready);$('ready-room').disabled=lobby.phase==='playing';$('ready-room').textContent=lobby.phase==='finished'?'次の対局の準備':lobby.members.find(m=>m.id===onlineSession.self)?.ready?'準備を解除':'準備完了';$('settings').disabled=!host||lobby.phase!=='lobby';for(const el of document.querySelectorAll('#gem-options input'))el.checked=lobby.selection.includes(el.value);validateSelection();}
function processEvent(event){
 if(event.type==='lobby'){showLobby(event.data);return;}
 if(event.type==='game'){
  const msg=event.data;if(msg.kaiju){globalThis.MatchComplete?.close();clearOnlinePrompt();names.splice(0,4,...msg.kaiju.player);finished=false;liveChips=[0,0,0,0];renderLiveChips();human=new E.Player(()=>{},update);$('online-lobby').hidden=true;$('game-area').hidden=false;$('log').replaceChildren();}
  if(human)human.action(msg);return;
 }
 if(event.type==='prompt')return;
 if(event.type==='resolved'){if(onlineActivePrompt?.id===event.data.id){onlineActivePrompt=null;clearOnlinePrompt();}return;}
 if(event.type==='result'){
  finished=true;onlineActivePrompt=null;clearOnlinePrompt();const {rows,matchId,cold}=event.data;onlineActiveMatchId=matchId;liveChips=[0,1,2,3].map(id=>rows.find(r=>r.id===id).bonusChips);renderLiveChips();$('status').textContent='対局終了';$('result').textContent=(cold?'55,000点コールド。':'終局。')+rows.slice().sort((a,b)=>a.rank-b.rank).map(r=>`${r.rank}着 ${names[r.id]} ${r.points}点 / 順位${r.rankChips}・祝儀${r.bonusChips}枚`).join(' ／ ');
  let resultSaved=true;try{const key='houseki-online-results-v1',saved=JSON.parse(localStorage.getItem(key)||'[]');if(!saved.some(r=>r.matchId===matchId)){saved.push({matchId,at:new Date().toISOString(),self:onlineSession.self,rows});localStorage.setItem(key,JSON.stringify(saved));}$('totals').textContent='オンライン成績はオフラインと別保存です。今回の結果は対局終了欄で確認できます。';}catch{resultSaved=false;onlineState('成績を端末に保存できませんでした');}
  MatchComplete.show({rows,names,selfId:onlineSession.self,cold,saved:resultSaved,online:true,onNext:async()=>{await command({type:'next',matchId});$('game-area').hidden=true;$('online-lobby').hidden=false;},onHome:()=>{location.href='home.html';}});
 }
}
async function poll(){if(polling)return;polling=true;while(onlineSession){try{const data=await api(roomPath('events')+'?after='+onlineCursor);onlineState((globalThis.NearbyTransport?'近距離接続中：':'接続中：')+onlineSession.room);for(const event of data.events){if(event.seq<=onlineCursor)continue;processEvent(event);onlineCursor=event.seq;}if(onlineCursor===data.head&&data.pending&&onlineActivePrompt?.id!==data.pending.id)presentPrompt(data.pending);}catch(e){onlineState('再接続中：'+e.message);await new Promise(r=>setTimeout(r,3000));}}polling=false;}
async function join(create){try{const name=$('online-name').value.trim(),code=$('room-code').value.trim().toUpperCase();onlineState('接続しています…');const data=await api(create?'/api/rooms':'/api/rooms/'+code+'/join',{name});onlineSession=data;onlineCursor=0;if(!globalThis.NearbyTransport)sessionStorage.setItem('houseki-room',JSON.stringify(data));poll();}catch(e){onlineState(e.message);}}
$('create-room').onclick=()=>join(true);$('join-room').onclick=()=>join(false);
$('ready-room').onclick=()=>command(onlineLobby.phase==='finished'?{type:'next',matchId:onlineActiveMatchId}:{type:'ready',ready:!onlineLobby.members.find(m=>m.id===onlineSession.self)?.ready}).catch(()=>{});
$('start-room').onclick=()=>command({type:'start'}).catch(()=>{});
$('apply-start').onclick=()=>{if(!validateSelection())return;command({type:'configure',selection:selected()}).then(()=>$('setup').close()).catch(()=>{});};
$('new').onclick=()=>{$('table-menu').close();$('game-area').hidden=true;$('online-lobby').hidden=false;};
$('resume-table').onclick=()=>{$('online-lobby').hidden=true;$('game-area').hidden=false;};
$('forget-room').onclick=()=>{if(!confirm('参加情報を消しますか？対局中の席はCPUが代行し、この端末から復帰できなくなります。'))return;sessionStorage.removeItem('houseki-room');location.reload();};
$('export').onclick=()=>{const url=URL.createObjectURL(new Blob([localStorage.getItem('houseki-online-results-v1')||'[]'],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='houseki-online-results.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('settings').disabled=true;
try{onlineSession=globalThis.NearbyTransport?null:JSON.parse(sessionStorage.getItem('houseki-room')||'null');if(onlineSession)poll();}catch{onlineState('参加情報を読み込めませんでした');}
