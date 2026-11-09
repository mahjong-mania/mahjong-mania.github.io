/* Sharing opens the device share sheet; posting remains the player's choice. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else root.HousekiShare=api;})(globalThis,root=>{
'use strict';
const WEB='https://mahjong-mania.github.io/home.html',clean=s=>String(s??'').replace(/[\r\n\t]/g,' ').trim();
function handText(hand,notation={}){return String(hand||'').split(',').map(part=>part.replace(/([mpszf])([0-9A-C]+)/g,(_,s,ns)=>[...ns].map(n=>notation[s+n]?.name||({m:n+'萬',p:n+'筒',s:n+'索',z:['','東','南','西','北','白','發','中'][+n],f:['','春','夏','秋','冬'][+n]}[s]||s+n)).join(' '))).join(' ／ 副露 ');}
function mahjong(w){const title=w.mode==='sanma'?'五等サンマ':'宝石麻雀',r=w.round,round=r?(['東','南','西','北'][r.wind]||'東')+(r.hand+1)+'局 '+(r.honba||0)+'本場':'';return [title+'で'+clean(w.method||'和了')+'！',round,w.points!=null?Number(w.points).toLocaleString('ja-JP')+'点':'',w.chips!=null?'和了祝儀 '+(w.chips>0?'+':'')+w.chips+'枚':'',handText(w.hand,w.notation),(w.yaku||[]).map(y=>clean(y.name)+(typeof y.fanshu==='number'?' '+y.fanshu+'翻':'')).join(' ／ '),'ブラウザーでも遊べます',WEB,w.mode==='sanma'?'#宝石麻雀 #五等サンマ':'#宝石麻雀'].filter(Boolean).join('\n');}
function dice(state,id=state.active){const c=state.settings,r=state.results[id];if(!r||!Array.isArray(r.faces)||r.faces.length!==3)throw Error('確定した3個の出目がありません。');return [(c.mode==='reach'?'リーチチンチロ':'チンチロ')+'で'+clean(r.name)+'！',r.faces.join('・')+'（'+(id===state.parent?'親':'子')+'）',r.multiplier>1?r.multiplier+'倍の役':'', 'ブラウザーでも遊べます',WEB,'#宝石麻雀 #チンチロ'].filter(Boolean).join('\n');}
const CODE_KEY='houseki-share-used-codes-batch3-v1';
function reserveCode(codes=root.HOUSEKI_TEST_ACCESS_CODES,storage=root.localStorage,rng=root.crypto){
 if(!Array.isArray(codes)||!codes.length)return null;
 const pool=[...new Set(codes)],used=new Set(JSON.parse(storage.getItem(CODE_KEY)||'[]')),remaining=pool.filter(c=>!used.has(c));
 if(!remaining.length)return null;
 const values=new Uint32Array(1),limit=4294967296-4294967296%remaining.length;do{rng.getRandomValues(values);}while(values[0]>=limit);
 const code=remaining[values[0]%remaining.length];used.add(code);storage.setItem(CODE_KEY,JSON.stringify([...used]));return code;
}
function invitation(text){let code=null;try{code=reserveCode();}catch{/* Local storage unavailable: keep the public web invitation usable. */}
 return code?text+'\nAndroid版テストに参加（Google Playでコードを確認）\nhttps://play.google.com/redeem?code='+encodeURIComponent(code):text;
}
async function send(text){if(!text?.trim())throw Error('共有する結果がありません。');if(root.Android?.shareText){root.Android.shareText(text);return 'shared';}if(root.navigator?.share){await root.navigator.share({title:'宝石麻雀の結果',text});return 'shared';}await root.ResultTextExport.copy(text);return 'copied';}
function mount(container,getText){if(!container)return;const wrap=document.createElement('div'),button=document.createElement('button'),status=document.createElement('p');button.type='button';button.textContent='SNSで共有';status.setAttribute('role','status');wrap.className='social-result-share';wrap.append(button,status);container.append(wrap);let prepared=null;button.onclick=async()=>{button.disabled=true;try{if(!prepared)prepared=invitation(typeof getText==='function'?getText():getText);const result=await send(prepared);status.textContent=result==='copied'?'投稿用テキストをコピーしました。SNSに貼り付けて投稿できます。':'共有先で内容を確認して投稿してください。';}catch(e){status.textContent=e.name==='AbortError'?'共有をキャンセルしました。':'共有できませんでした。';}finally{button.disabled=false;}};return wrap;}
return {WEB,CODE_KEY,mahjong,dice,reserveCode,invitation,send,mount};
});
