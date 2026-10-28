'use strict';
(()=>{
 const KEY='houseki-replays-v1',cache=new Map(),el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 function list(){const all=JSON.parse(localStorage.getItem(KEY)||'[]');if(!Array.isArray(all))throw Error('牌譜の保存形式が不正です');return all;}
 function remember(data){if(!data||data.schema!=='houseki-mahjong-replay')return false;data.build=document.querySelector('meta[name=houseki-build]')?.content||'unknown';cache.set(data.matchId,data);try{let records=list().filter(r=>r.matchId!==data.matchId);records.push(data);records=records.slice(-10);while(records.length>1&&JSON.stringify(records).length>1800000)records.shift();for(;;){try{localStorage.setItem(KEY,JSON.stringify(records));return true;}catch(e){if(records.length<=1)throw e;records.shift();}}}catch{return false;}}
 function get(id){if(cache.has(id))return cache.get(id);try{return list().find(r=>r.matchId===id)||null;}catch{return null;}}
 const stringify=data=>JSON.stringify(data,null,2);
 function analysis(data){return ['宝石麻雀／五等サンマの打牌解析をお願いします。','対象はplayersの人間・CPU全員です。対象playerIdを絞ることもできます。','各decisionのviewとlegalActionsだけをその時点の情報として使い、chosenを評価してください。後続のツモ・他家手牌・裏ドラを知っていたものとして評価しないでください。','標準ルールではなくrulesの採用設定・notationの特殊牌辞書を厳守してください。宝石・華・祝儀・順位・守備を含め、改善候補と根拠、不確実性を挙げてください。','これは独自JSON形式であり、天鳳等の牌譜形式ではありません。','',stringify(data)].join('\n');}
 const downloadCache=new WeakMap();let activeStatus=null;
 function payload(data,format){if(!data||data.schema!=='houseki-mahjong-replay'||!Array.isArray(data.decisions))throw Error('牌譜データが不正です');if(!['json','txt'].includes(format))throw Error('不明な出力形式です');const text=format==='json'?stringify(data):analysis(data);if(typeof text!=='string'||!text.trim())throw Error('牌譜が空です');const filename='houseki-'+data.mode+'-'+String(data.matchId).replace(/[^\w-]/g,'_')+'.'+format,type=format==='json'?'application/json':'text/plain';return {text,filename,type};}
 async function download(data,format){const {text,filename,type}=payload(data,format);
  if(globalThis.Android?.exportReplay){Android.exportReplay(filename,text);return 'native';}
  if(globalThis.HousekiIOS?.exportResults){HousekiIOS.exportResults(text);return 'native';}
  if(typeof globalThis.showSaveFilePicker==='function'){
   const handle=await showSaveFilePicker({suggestedName:filename,types:[{description:format==='json'?'牌譜JSON':'解析用テキスト',accept:{[type]:['.'+format]}}]});const output=await handle.createWritable();try{await output.write(new Blob([text],{type:type+';charset=utf-8'}));await output.close();}catch(error){try{await output.abort();}catch{}throw error;}return 'saved';
  }
  let formats=downloadCache.get(data);if(!formats){formats=new Map();downloadCache.set(data,formats);}let file=formats.get(format);
  if(!file||file.text!==text){const blob=new Blob([text],{type:type+';charset=utf-8'});if(!blob.size)throw Error('牌譜が空です');file={text,url:URL.createObjectURL(blob)};formats.set(format,file);}
  // Mobile downloads may consume the URL after the save picker closes. Keep it
  // alive for this document; the browser releases its URLs when the document ends.
  const a=el('a');a.href=file.url;a.download=filename;document.body.append(a);a.click();a.remove();return 'download';
 }
 globalThis.addEventListener?.('houseki-replay-export-result',event=>{if(activeStatus?.isConnected)activeStatus.textContent=event.detail?.message||'';});
 function mount(parent,data,{saved=true}={}){if(!parent||!data)return;const section=el('section');section.className='replay-export';section.style.cssText='margin:16px 0;display:grid;gap:10px';section.append(el('h3','牌譜・採用ルールを書き出す'),el('p','全員の手牌・打牌・判断候補・採用ルールを含みます。CPUも解析できます。牌譜は最大10対局を容量に応じて保存します。'));
 if(!saved)section.append(el('p','牌譜を端末に保存できませんでした。この画面から今すぐ出力できます。'));
 const status=el('p','');status.setAttribute('role','status');for(const [label,format]of [['牌譜JSONを保存','json'],['LLM解析用テキストを保存','txt']]){const b=el('button',label);b.type='button';b.onclick=async()=>{b.disabled=true;activeStatus=status;try{const result=await download(data,format);status.textContent=result==='saved'?'牌譜を保存しました。':result==='native'?'保存先を選択してください。':'ダウンロードを開始しました。';}catch(e){status.textContent=e.name==='AbortError'?'保存をキャンセルしました。':'出力できませんでした。コピーまたはファイル共有をお試しください。';}finally{b.disabled=false;}};section.append(b);}
 if(typeof navigator.share==='function'&&typeof navigator.canShare==='function'&&navigator.canShare({files:[new File(['test'],'houseki.txt',{type:'text/plain'})]})){const share=el('button','解析用ファイルを共有');share.type='button';share.onclick=async()=>{share.disabled=true;try{const p=payload(data,'txt'),file=new File([p.text],p.filename,{type:p.type});if(!file.size)throw Error();await navigator.share({files:[file]});status.textContent='ファイルを共有しました。';}catch(e){status.textContent=e.name==='AbortError'?'共有をキャンセルしました。':'ファイル共有ができませんでした。保存またはコピーをご利用ください。';}finally{share.disabled=false;}};section.append(share);}
 const copy=el('button','LLM解析用テキストをコピー');copy.type='button';copy.onclick=async()=>{const text=analysis(data);try{if(!navigator.clipboard?.writeText)throw Error();await navigator.clipboard.writeText(text);status.textContent='解析用テキストをコピーしました。';}catch{let area=section.querySelector('textarea');if(!area){area=el('textarea');area.rows=8;area.readOnly=true;area.style.width='100%';area.setAttribute('aria-label','牌譜コピー用テキスト');section.append(area);}area.value=text;area.focus();area.select();status.textContent='自動コピーができませんでした。選択したテキストをコピーしてください。';}};section.append(copy,status);parent.append(section);return section;}
 globalThis.ReplayExport={remember,get,mount,download,analysis,list};
})();
