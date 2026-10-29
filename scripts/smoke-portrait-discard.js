'use strict';
const {chromium}=require('playwright'),fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const server=http.createServer((req,res)=>{const p=path.join(root,decodeURI(req.url.split('?')[0]));fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/html');res.end(b);});});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.addInitScript(()=>localStorage.setItem('houseki-start-seat-v1','0'));
  for(const file of ['index.html','sanma.html']){
   await page.goto('http://127.0.0.1:'+server.address().port+'/'+file);await page.waitForSelector('#portrait-tsumogiri');
   if(file==='sanma.html')await page.evaluate(()=>{SanmaUI.start();});
   await page.waitForFunction(()=>!document.getElementById('portrait-tsumogiri').disabled);
   const hand=file==='index.html'?'#hand':'#sanma-hand';
   const drawn=await page.locator(hand+' button.draw').getAttribute('data-tile');
   await page.evaluate(sel=>{const d=document.querySelector(sel+' button.draw');window.drawClicks=0;d.addEventListener('click',()=>window.drawClicks++);},hand);
   assert.equal(await page.locator('#portrait-tsumogiri').isVisible(),true);
   assert.ok(await page.evaluate(sel=>document.querySelector('.portrait-discard').getBoundingClientRect().top>=document.querySelector(sel).getBoundingClientRect().bottom,hand));
   await page.locator('#portrait-tsumogiri').click();assert.equal(await page.evaluate(()=>window.drawClicks),1);
   assert.ok(drawn);
   await page.setViewportSize({width:844,height:390});assert.equal(await page.locator('#portrait-tsumogiri').isVisible(),false);
   await page.setViewportSize({width:390,height:844});
  }
  // Controlled DOM: no draw, illegal draw, riichi selection and modal cannot dispatch.
  await page.goto('http://127.0.0.1:'+server.address().port+'/home.html');
  await page.setContent('<main><div id="hand"><button class="draw">tile</button></div><div id="actions"></div></main><dialog id="test-modal">modal</dialog>');
  await page.addScriptTag({content:fs.readFileSync(path.join(root,'portrait-discard.js'),'utf8')});
  await page.evaluate(()=>{window.calls=0;document.querySelector('#hand button').onclick=()=>{window.calls++;document.querySelector('#hand button').disabled=true;};});
  await page.waitForFunction(()=>!document.getElementById('portrait-tsumogiri').disabled);
  await page.evaluate(()=>document.querySelector('#test-modal').showModal());await page.waitForFunction(()=>document.getElementById('portrait-tsumogiri').disabled);
  await page.evaluate(()=>document.querySelector('#test-modal').close());await page.waitForFunction(()=>!document.getElementById('portrait-tsumogiri').disabled);
  await page.evaluate(()=>document.querySelector('#actions').innerHTML='<button class="armed">リーチ</button>');await page.waitForFunction(()=>document.getElementById('portrait-tsumogiri').disabled);
  await page.evaluate(()=>document.querySelector('#actions').replaceChildren());await page.waitForFunction(()=>!document.getElementById('portrait-tsumogiri').disabled);
  await page.locator('#portrait-tsumogiri').click();await page.evaluate(()=>document.getElementById('portrait-tsumogiri').click());assert.equal(await page.evaluate(()=>window.calls),1);
  assert.deepEqual(errors,[]);console.log('PASS: four-player/sanma portrait draw discard; legal existing action; landscape hidden; modal/riichi/duplicate guards.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
