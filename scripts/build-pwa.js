'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),root=path.resolve(__dirname,'..');
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).filter(e=>!e.name.startsWith('.')&&e.name!=='scripts'&&e.name!=='README.md').flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const all=files(root).filter(f=>!['sw.js','online.html','online.js'].includes(path.basename(f)));
const clean=s=>s.replace(/[?&]build=[a-f0-9]{16}/g,'').replace(/<meta name="houseki-build" content="[a-f0-9]{16}">/g,'');
const hash=crypto.createHash('sha256');for(const f of all)hash.update(path.relative(root,f)).update(f.endsWith('.html')?clean(fs.readFileSync(f,'utf8')):fs.readFileSync(f));
const version=hash.digest('hex').slice(0,16);
for(const f of all.filter(f=>f.endsWith('.html'))){let html=clean(fs.readFileSync(f,'utf8'));html=html.replace(/((?:src|href)=")([^"#:]+\.(?:js|css)(?:\?[^"#]*)?)(")/g,(_,a,url,b)=>a+url+(url.includes('?')?'&':'?')+'build='+version+b).replace('</head>','<meta name="houseki-build" content="'+version+'"></head>');fs.writeFileSync(f,html);}
const assets=all.map(f=>'./'+path.relative(root,f).replaceAll('\\','/'));
fs.writeFileSync(path.join(root,'sw.js'),`'use strict';
const VERSION='${version}',CACHE='houseki-static-'+VERSION,ASSETS=${JSON.stringify(assets)},BASE=new URL('./',self.location.href);
self.addEventListener('install',event=>event.waitUntil((async()=>{try{const cache=await caches.open(CACHE);await cache.addAll(ASSETS.map(p=>new Request(new URL(p,BASE),{cache:'reload'})));await cache.put(new URL('./__offline_ready__',BASE),new Response(CACHE));await self.skipWaiting();}catch(e){await caches.delete(CACHE);throw e;}})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{const previous=(await caches.keys()).filter(k=>k.startsWith('houseki-static-')&&k!==CACHE);for(const key of previous.slice(0,-2))await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('message',event=>{if(event.data?.type==='BUILD_VERSION')event.ports[0]?.postMessage({version:VERSION});});
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==BASE.origin||!url.pathname.startsWith(BASE.pathname)||url.pathname.includes('/api/')||url.pathname.endsWith('/sw.js'))return;let relative='./'+url.pathname.slice(BASE.pathname.length);if(relative==='./')relative='./home.html';if(!ASSETS.includes(relative))return;
 event.respondWith((async()=>{const key=new URL(relative,BASE);
  // A navigation checks the server every time. Offline fallback remains a complete build.
  if(event.request.mode==='navigate'){try{const response=await fetch(event.request,{cache:'no-store'});if(response.ok)return response;}catch{}return await (await caches.open(CACHE)).match(key)||Response.error();}
  // An HTML document pins scripts and styles to its build, even across worker activation.
  const requested=url.searchParams.get('build'),name=requested?'houseki-static-'+requested:CACHE;
  const cached=await caches.match(key,{cacheName:name,ignoreSearch:true});if(cached)return cached;
  return fetch(event.request,{cache:'no-store'});
 })());});
`);
console.log('Offline cache:',version,assets.length,'files');
