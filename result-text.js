/* UTF-8 results export; native document picker or browser download. */
(function(root){
'use strict';
const urls=[];
root.ResultTextExport={async save(text,filename){
 if(typeof text!=='string'||!text.trim())throw Error('保存する結果がありません。');
 filename=String(filename).replace(/[^a-zA-Z0-9._-]/g,'_');
 if(root.Android?.exportReplay){root.Android.exportReplay(filename,text);return 'native';}
 if(root.HousekiIOS?.exportResults){root.HousekiIOS.exportResults(text,filename,'text/plain');return 'native';}
 const blob=new Blob([text],{type:'text/plain;charset=utf-8'});
 if(root.showSaveFilePicker){const handle=await root.showSaveFilePicker({suggestedName:filename,types:[{description:'テキスト',accept:{'text/plain':['.txt']}}]});const writer=await handle.createWritable();await writer.write(blob);await writer.close();return 'saved';}
 const url=URL.createObjectURL(blob);urls.push(url);const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();return 'download';
}};
root.addEventListener('pagehide',()=>{for(const url of urls)URL.revokeObjectURL(url);urls.length=0;});
})(globalThis);
