const {chromium}=require('@playwright/test'),fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert');
(async()=>{
 const root=path.join(__dirname,'www'),server=http.createServer((req,res)=>{const f=path.join(root,req.url==='/'?'index.html':req.url.split('?')[0]);if(!f.startsWith(root)||!fs.existsSync(f)){res.writeHead(404);return res.end()}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.svg')?'image/svg+xml':'text/html');res.end(fs.readFileSync(f))});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.__TAURI__={core:{invoke:async(_,{command})=>command==='matches'?[['Arsenal','Chelsea'],['Liverpool','Manchester City'],['Real Madrid','Sevilla']].map(([home,away],i)=>({id:'tv-'+i,post:'1',sport:'1',home,away,league:'Premier League',live:false,finished:false,kickoff:Date.now()/1000+3600,channels:[],homeScore:'',awayScore:''})):{batches:[],errors:[]}}};});
  await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('.card').first().waitFor();assert(await page.locator('body').evaluate(e=>e.classList.contains('tv-ui')));
  // Real remote key events, no mouse clicks to navigate the cards.
  await page.locator('.card').first().focus();await page.keyboard.press('ArrowDown');assert.equal(await page.locator('.card').nth(1).evaluate(e=>e===document.activeElement),true);
  await page.keyboard.press('Enter');await page.waitForFunction(()=>document.body.classList.contains('mobile-watch'));
  await page.keyboard.press('Escape');assert(!await page.locator('body').evaluate(e=>e.classList.contains('mobile-watch')));
  await page.locator('#settings-menu-button').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('#settings-menu').matches(':popover-open'));
  await page.keyboard.press('ArrowDown');assert(await page.evaluate(()=>document.activeElement.closest('#settings-menu')!==null));await page.keyboard.press('Escape');assert(!await page.locator('#settings-menu').evaluate(e=>e.matches(':popover-open')));
  for(const [width,height] of [[1280,720],[1920,1080],[960,540],[806,331]]){await page.setViewportSize({width,height});await page.waitForTimeout(200);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const panes=await page.evaluate(()=>({a:document.querySelector('#matches-sidebar').getBoundingClientRect().toJSON(),b:document.querySelector('main>section').getBoundingClientRect().toJSON()}));assert(panes.b.x>=panes.a.right-1);assert(await page.evaluate(()=>[...document.querySelectorAll('#mobile-tabs button')].every(e=>{const r=e.getBoundingClientRect();return r.x>=0&&r.right<=innerWidth&&r.y>=0&&r.bottom<=innerHeight})));await page.screenshot({path:path.join(__dirname,`../dist/tv-preview-${width}.png`)});}
  assert.deepEqual(errors,[]);console.log('TV remote Arrow/OK/Back, Settings focus containment, 540p/720p/1080p split layout passed');
 }finally{if(browser)await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
