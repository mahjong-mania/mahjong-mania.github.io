'use strict';
const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..',process.env.SMOKE_ROOT||'public'),base=process.env.SMOKE_BASE||'/offline/';const server=http.createServer((req,res)=>{const urlPath=req.url.split('?')[0];const relative=process.env.SMOKE_ROOT?(urlPath.startsWith(base)?urlPath.slice(base.length):'__missing__'):urlPath;const p=path.join(root,relative||'index.html');fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);return res.end();}res.setHeader('Content-Type',p.endsWith('.js')?'application/javascript':p.endsWith('.css')?'text/css':p.endsWith('.svg')?'image/svg+xml':'text/html');res.end(b);});});await new Promise(r=>server.listen(8765,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:8765/'))external.push(r.url());});
  for(const file of ['about.html','privacy.html','support.html']){const response=await page.goto('http://127.0.0.1:8765'+base+file);assert.equal(response.status(),200);assert.equal(await page.locator('h1').count(),1);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(await page.locator('a[href="privacy.html"]').count()>0,true);}
  await page.goto('http://127.0.0.1:8765'+base+'home.html');assert.equal(await page.locator('.mode-section').count(),2);assert.equal(await page.locator('#solo-entry').getAttribute('href'),'index.html?setup=1');await page.locator('#solo-entry').click();await page.waitForSelector('#setup[open]');assert.equal(await page.evaluate(()=>!!game),false);await page.goto('http://127.0.0.1:8765'+base+'home.html');await page.locator('#records-entry').click();assert.match(await page.locator('#offline-records .record-history').textContent(),/保存済みの対局はありません/);
  await page.evaluate(()=>{const row=(id,rankChips,bonusChips)=>({id,rank:1,points:40000,rankChips,bonusChips});localStorage.setItem('jewel-offline-results-v1',JSON.stringify({games:[{at:'2026-10-22',results:[row(0,50,12)]}],totals:{0:{games:1,rankChips:50,bonusChips:12}}}));localStorage.setItem('houseki-online-results-v1',JSON.stringify([{self:0,at:'2026-10-22',rows:[row(0,25,3)]},{self:1,at:'2026-10-22',rows:[row(0,-50,-30),row(1,50,7)]}]));});await page.reload();assert.match(await page.locator('#offline-records .record-summary').textContent(),/62枚/);assert.match(await page.locator('#online-records .record-summary').textContent(),/85枚/);assert.equal(await page.locator('#online-records details').count(),2);await page.evaluate(()=>localStorage.setItem('jewel-offline-results-v1','broken'));await page.reload();assert.match(await page.locator('#offline-records .record-status').textContent(),/読み込めません/);assert.equal(await page.evaluate(()=>localStorage.getItem('jewel-offline-results-v1')),'broken');await page.evaluate(()=>{localStorage.removeItem('jewel-offline-results-v1');localStorage.removeItem('houseki-online-results-v1');});
  await page.goto('http://127.0.0.1:8765'+base+'index.html');assert.equal(await page.title(),'宝石麻雀');assert.equal(await page.locator('#online-entry').getAttribute('href'),'play.html');await page.waitForSelector('#hand button:enabled');await page.waitForFunction(()=>[...document.querySelectorAll('#hand .tile-image')].every(img=>img.complete&&img.naturalWidth>0));
  assert.equal(await page.locator('#hand .tile-image').count(),14);
  await page.evaluate(()=>document.body.style.paddingTop='48px');
  await page.locator('#open-table-menu').click();assert.equal(await page.locator('#online-entry').isVisible(),true);
  assert.ok((await page.locator('#settings').boundingBox()).y>=48);
  await page.locator('#settings').click();
  await page.locator('input[value=pearl]').check();assert.equal(await page.locator('input[value=turquoise]').isDisabled(),true);
  await page.locator('input[value=gold-pocchi]').check();await page.locator('input[value=gane-pocchi]').check();assert.equal(await page.locator('input[value=topaz]').isDisabled(),true);
  await page.screenshot({path:'mahjong-jewel-settings.png',fullPage:true});await page.locator('#apply-start').click();await page.evaluate(()=>{game.speed=0;document.body.style.paddingTop='';});await page.waitForSelector('#hand button:enabled');assert.equal(await page.evaluate(()=>tile('p0').querySelector('.jewel-tag').textContent),'アメ');assert.equal(await page.evaluate(()=>tile('pA').querySelector('.jewel-tag').textContent),'パル');
  for(let i=0;i<20;i++){
   if(await page.evaluate(()=>finished)){if(await page.locator('#match-complete[open]').count())await page.locator('.complete-buttons button').first().click();else await page.locator('#new').click();await page.evaluate(()=>{game.speed=0;});}
   await page.waitForFunction(()=>document.querySelector('#hand button:enabled')||document.querySelector('#actions button')||document.querySelector('#win-confirm[open]')||document.querySelector('#riichi-confirm[open]')||finished);
   if(await page.locator('#riichi-confirm').evaluate(el=>el.open)){await page.locator('#riichi-next').click();continue;}
   if(await page.locator('#win-confirm').evaluate(el=>el.open)){await page.locator('#win-next').click();continue;}
   let b=page.locator('#hand button:enabled').first();if(!await b.count())b=page.locator('#actions button').filter({hasText:'見送り'}).first();if(!await b.count())b=page.locator('#actions button').first();if(await b.count())await b.click();
  }
  await page.waitForFunction(()=>document.querySelector('#hand button:enabled')||document.querySelector('#actions button')||document.querySelector('#win-confirm[open]')||document.querySelector('#riichi-confirm[open]')||finished);
  // Freeze the random match before layout checks; a CPU win must not block menu clicks.
  await page.evaluate(()=>{game.stop();for(const id of ['win-confirm','riichi-confirm'])document.getElementById(id).close();globalThis.MatchComplete?.close();});
  assert.equal(await page.locator('.seat').count(),4);assert.ok(await page.locator('.river .tile').count()>0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.setViewportSize({width:844,height:390});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight+1));
  for(const selector of ['#table','.hand-panel','#unlock-badge','#hand']){const box=await page.locator(selector).boundingBox();assert.ok(box&&box.x>=0&&box.y>=0&&box.x+box.width<=844&&box.y+box.height<=391,selector);}
  for(const viewport of [{width:390,height:844},{width:844,height:290},{width:844,height:390}]){await page.setViewportSize(viewport);assert.ok(await page.evaluate(()=>{const c=document.querySelector('.center').getBoundingClientRect(),b=document.querySelector('#unlock-badge').getBoundingClientRect(),d=document.querySelector('#indicators').getBoundingClientRect();return b.right<c.left&&b.top>c.top&&d.right<c.left&&d.top<c.top&&d.width>=22&&[...document.querySelectorAll('.score')].every(s=>{const r=s.getBoundingClientRect();return r.bottom<=c.bottom&&r.top>=c.top;});}));}
  assert.equal(await page.locator('#live-chips').isVisible(),false);assert.equal(await page.locator('#unlock-central').textContent(),await page.evaluate(()=>human._rule.unlockedYaku));
  await page.locator('#open-table-menu').click();assert.equal(await page.locator('#live-chips').isVisible(),true);await page.locator('#close-table-menu').click();
  await page.evaluate(()=>{const before=human.shoupai;human.model.shoupai[human._menfeng]=E.M.Shoupai.fromString('m12p123s789z11555').zimo('m9');globalThis.openFixture={before,pending,points:human.model.defen.slice(),wall:human.model.shan.paishu};human.model.defen[human.model.player_id[human._menfeng]]=25000;human.model.shan.paishu=30;const opts=E.actions(human,{zimo:{l:human._menfeng,p:'m9'}});choose(opts,r=>{globalThis.pickedOpen=r;},null,human);});
  await page.locator('#actions button').filter({hasText:'オープンリーチ'}).click();await page.locator('#hand button:enabled').first().click();assert.equal(await page.evaluate(()=>pickedOpen.open),true);await page.evaluate(()=>{human.model.shoupai[human._menfeng]=openFixture.before;human.model.defen=openFixture.points;human.model.shan.paishu=openFixture.wall;pending=openFixture.pending;riichi=false;renderHand();});
  await page.evaluate(()=>{globalThis.riichiBackup={hand:human.shoupai,pending};human.model.shoupai[human._menfeng]=E.M.Shoupai.fromString('m123p555s789z1155*').zimo('p5');pending={options:[{reply:{dapai:'p5_'}}],reply:()=>{}};renderHand();});
  assert.equal(await page.locator('#hand button:enabled').count(),1);assert.equal(await page.locator('#hand button.draw:enabled').count(),1);assert.equal(await page.locator('#hand button[data-tile=p5]:disabled').count(),3);
  await page.evaluate(()=>{human.model.shoupai[human._menfeng]=riichiBackup.hand;pending=riichiBackup.pending;renderHand();});
  await page.screenshot({path:'mahjong-jewel-landscape.png',fullPage:true});await page.setViewportSize({width:390,height:844});
  console.log('Landscape table fits viewport, external information is in menu, bonus target is at bottom left, duplicate riichi hand tiles are disabled: OK');
  await page.screenshot({path:'mahjong-jewel-ui.png',fullPage:true});await page.setViewportSize({width:1200,height:1000});await page.screenshot({path:'mahjong-jewel-desktop.png',fullPage:true});
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);console.log('Mobile/desktop table, direct tile discards, 20 decisions, CPU turns, selection caps and no external requests: OK');
  if(await page.locator('#riichi-confirm').evaluate(el=>el.open))await page.locator('#riichi-next').click();
  if(await page.locator('#win-confirm').evaluate(el=>el.open))await page.locator('#win-next').click();
  await page.evaluate(()=>globalThis.MatchComplete?.close());
  // Replay the same 20-all settlement exercised through Game.hule in chip-ledger.test.js.
  await page.evaluate(()=>{game.stop();for(const p of game._players){p.onUpdate=()=>{};p.decide=()=>{};}pending=null;finished=false;localStorage.removeItem('jewel-offline-results-v1');totals();update({hule:{l:human._menfeng,baojia:null,defen:12000,hupai:[],jewelChips:20,jewelTotal:60,chipBalances:[60,-20,-20,-20],tobi:[]}},human);});
  assert.deepEqual(await page.locator('#live-chip-rows b').allTextContents(),['+60枚','−20枚','−20枚','−20枚']);
  assert.ok((await page.locator('#log').textContent()).includes('各家から20枚'));
  assert.ok((await page.locator('#totals').textContent()).includes('0戦'));
  assert.ok((await page.locator('#live-chip-state').textContent()).includes('進行中'));
  await page.evaluate(()=>{showWin({l:human._menfeng,baojia:null,shoupai:'m123p0A5s789z11555',defen:12000,fu:30,fanshu:6,hupai:[{name:'立直',fanshu:1}],jewelChips:20,jewelTotal:60,chipBalances:[60,-20,-20,-20],chipDelta:[60,-20,-20,-20],chipBreakdown:{lines:[{label:'ゴールド',amount:4,reason:''},{label:'アメジスト',amount:1,reason:''},{label:'全役解放',amount:5,reason:'翻牌 白'}],subtotal:10,multiplier:2,multipliers:['アメジスト'],perPayer:20},fenpei:[12000,-3000,-6000,-3000]},()=>{$('status').textContent='確認画面の続行を確認';},human);});
  assert.equal(await page.locator('#win-confirm').evaluate(el=>el.open),true);
  assert.ok((await page.locator('#win-receipt').textContent()).includes('各家から20枚'));
  assert.equal(await page.locator('#win-payments tr').count(),4);
  assert.ok((await page.locator('#win-breakdown').textContent()).includes('基本祝儀 +10枚 × 2'));
  await page.screenshot({path:'mahjong-jewel-win.png',fullPage:true});
  assert.notEqual(await page.locator('#status').textContent(),'確認画面の続行を確認');
  await page.waitForTimeout(200);assert.equal(await page.locator('#win-confirm').evaluate(el=>el.open),true);
  await page.locator('#win-next').click();assert.equal(await page.locator('#status').textContent(),'確認画面の続行を確認');
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>showRiichi({l:(human._menfeng+1)%4,p:'p5*'},()=>{$('status').textContent='リーチ確認済み';},human));
  assert.equal(await page.locator('#riichi-confirm').evaluate(el=>el.open),true);
  await page.screenshot({path:'mahjong-jewel-riichi.png',fullPage:true});
  await page.locator('#riichi-next').click();assert.equal(await page.locator('#status').textContent(),'リーチ確認済み');
  await page.evaluate(()=>{const b=document.createElement('button');actionFace(b,{label:'チー p40A-',reply:{fulou:'p40A-'}});$('actions').replaceChildren(b);});
  assert.equal(await page.locator('#actions .tile-image').count(),3);assert.equal(await page.locator('#actions .jewel-tag').count(),2);
  console.log('Riichi acknowledgement and image-based meld action tiles: OK');
  console.log('Win dialog holds continuation until confirmation and shows hand, points and chip payments: OK');
  console.log('Live 20-all receipt shows +60/-20/-20/-20 while finished-game totals stay separate: OK');
  await page.evaluate(()=>JewelOffline.saveResult(localStorage,'browser-persistence',JewelOffline.settle({defen:[40000,25000,20000,15000],rank:[1,2,3,4],bonusChips:[3,-1,-1,-1]})));await page.reload();await page.waitForFunction(()=>document.querySelector('#totals').textContent.includes('合計 53枚'));assert.deepEqual(errors,[]);console.log('Rank/bonus storage survives reload: OK');
  await page.evaluate(()=>{game.stop();for(const p of game._players){p.onUpdate=()=>{};p.decide=()=>{};}const fixture={defen:[40000,25000,20000,15000],rank:[1,2,3,4],bonusChips:[60,-20,-20,-20]};game._callback(fixture);game._callback(fixture);});
  assert.equal(await page.locator('#match-complete').evaluate(d=>d.open),true);assert.equal(await page.locator('.complete-ledger tbody tr').count(),4);assert.ok((await page.locator('.complete-summary').textContent()).includes('+110枚'));
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('jewel-offline-results-v1')).games.length),2);
  await page.screenshot({path:'mahjong-jewel-complete.png',fullPage:true});
  await page.locator('.complete-buttons button').first().click();await page.waitForSelector('#hand button:enabled');assert.equal(await page.locator('#match-complete').evaluate(d=>d.open),false);
  await page.evaluate(()=>{game.stop();game._callback({defen:[40000,25000,20000,15000],rank:[1,2,3,4],bonusChips:[0,0,0,0]});});
  await page.locator('.complete-buttons button').nth(1).click();await page.waitForURL('**/home.html');assert.equal(await page.locator('.web-home-card').count(),5);assert.deepEqual(errors,[]);
  console.log('Real end callback opens results, saves once, starts another match or returns to home: OK');

 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
