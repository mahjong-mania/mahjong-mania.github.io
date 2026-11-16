'use strict';
(()=>{
 if(new URLSearchParams(location.search).get('custom')!=='1')return;
 const sanma=location.pathname.includes('sanma'),title='カスタム'+(sanma?'三麻':'四麻');
 const h=document.querySelector('h1');if(h)h.textContent=title+'・みんなで遊ぶ';document.title=title+' | 宝石麻雀';
 for(const a of document.querySelectorAll('a[href]')){const url=new URL(a.href,location.href);if(/\/(?:online|nearby|table-online)\.html$/.test(url.pathname)){url.searchParams.set('custom','1');if(new URLSearchParams(location.search).get('bingo')==='1')url.searchParams.set('bingo','1');a.href=url.href;}}
})();
