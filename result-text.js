/* Results are copied as text; no file download. */
(function(root){'use strict';
root.ResultTextExport={async copy(text){
 if(typeof text!=='string'||!text.trim())throw Error('コピーする結果がありません。');
 if(root.Android?.copyText){root.Android.copyText(text);return;}
 if(root.navigator?.clipboard?.writeText){try{await root.navigator.clipboard.writeText(text);return;}catch{}}
 const t=document.createElement('textarea');t.value=text;t.setAttribute('aria-label','コピーする結果');Object.assign(t.style,{position:'fixed',top:'0',left:'0',opacity:'0'});document.body.append(t);t.focus();t.select();let ok=false;try{ok=document.execCommand('copy');}finally{t.remove();}if(!ok)throw Error('コピーできませんでした。表示したテキストを選択してコピーしてください。');
}};})(globalThis);
