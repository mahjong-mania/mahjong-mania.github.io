/* Capture the displayed result, including an explicitly rendered WebGL frame. */
(function(root){'use strict';
root.HousekiCapture={async png(target){
 if(!target||!target.isConnected)throw Error('共有する画面がありません。');
 if(!root.html2canvas)throw Error('画像の準備に失敗しました。');
 if(document.fonts?.ready)await document.fonts.ready;
 await Promise.all([...target.querySelectorAll('img')].map(async img=>{if(!img.complete)await new Promise((resolve,reject)=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',reject,{once:true});setTimeout(()=>reject(Error('牌画像の読み込みに時間がかかっています。')),6000);});if(!img.naturalWidth)throw Error('牌画像を読み込めませんでした。');}));
 const canvases=[...target.querySelectorAll('canvas')],frames=canvases.map(c=>c.housekiCapture?c.housekiCapture():c.toDataURL('image/png'));
 const rect=target.getBoundingClientRect(),width=Math.ceil(rect.width),height=Math.ceil(Math.max(rect.height,target.scrollHeight));
 if(width<1||height<1)throw Error('共有する画面が非表示です。');
 const scale=Math.min(2,8192/width,8192/height,Math.sqrt(8000000/(width*height)));
 const token='capture-'+Math.random().toString(36).slice(2);target.setAttribute('data-capture-target',token);
 let canvas;try{canvas=await root.html2canvas(target,{backgroundColor:'#0b1830',scale,width,height,logging:false,allowTaint:false,useCORS:false,ignoreElements:el=>el.classList?.contains('social-result-share')||el.dataset?.captureIgnore==='true',onclone:doc=>{
  const copy=doc.querySelector('[data-capture-target="'+token+'"]');Object.assign(copy.style,{overflow:'visible',maxHeight:'none',height:height+'px',width:width+'px'});copy.scrollTop=0;
  [...copy.querySelectorAll('canvas')].forEach((c,i)=>{const img=doc.createElement('img');img.src=frames[i];img.width=c.width;img.height=c.height;img.style.cssText=c.style.cssText;c.replaceWith(img);});
 }});}finally{target.removeAttribute('data-capture-target');}
 const data=canvas.toDataURL('image/png');if(data.length<100)throw Error('画像を作成できませんでした。');return data;
},file(data){const encoded=data.split(',')[1],bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));return new File([bytes],'houseki-result.png',{type:'image/png'});}};
})(globalThis);
