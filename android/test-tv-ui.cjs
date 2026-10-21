const {chromium}=require('@playwright/test'),fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert');
(async()=>{
 const root=path.join(__dirname,'www'),server=http.createServer((req,res)=>{const f=path.join(root,req.url==='/'?'index.html':req.url.split('?')[0]);if(!f.startsWith(root)||!fs.existsSync(f)){res.writeHead(404);return res.end()}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.svg')?'image/svg+xml':'text/html');res.end(fs.readFileSync(f))});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.KAY_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.__TAURI__={event:{listen:async()=>()=>{}},core:{invoke:async(_,{command})=>command==='check_update'?{status:'available',current:'0.1.7',latest:'99.0.0',notes:'TV update fixture'}:command==='download_update'?{version:'99.0.0',path:'/cache/updates/KAYLiveSport-tv-arm64-debug.apk'}:command==='install_update'?{installerOpened:true}:command==='matches'?[['Arsenal','Chelsea'],['Liverpool','Manchester City'],['Real Madrid','Sevilla'],['Barcelona','Valencia'],['Bayern Munich','Dortmund'],['PSG','Marseille']].map(([home,away],i)=>({id:'tv-'+i,post:'1',sport:'1',home,away,league:'Premier League',live:false,finished:false,kickoff:Date.now()/1000+3600,channels:[],homeScore:'',awayScore:''})):{batches:[],errors:[]}}};});
  await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('.card').first().waitFor();assert(await page.locator('body').evaluate(e=>e.classList.contains('tv-ui')));
  await page.evaluate(()=>{window.tvKeyboardCalls=[];const original=window.__TAURI__.core.invoke;window.__TAURI__.core.invoke=async(c,a)=>{if(a.command==='mobile_keyboard')window.tvKeyboardCalls.push(a.args.enabled);return original(c,a);};});
  await page.locator('#search').focus();assert(await page.locator('#search').evaluate(e=>e.readOnly));
  await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>document.activeElement.id),'settings-menu-button');assert.equal(await page.evaluate(()=>window.tvKeyboardCalls.length),0);
  await page.keyboard.press('ArrowLeft');assert.equal(await page.evaluate(()=>document.activeElement.id),'search');await page.keyboard.press('Enter');assert(!await page.locator('#search').evaluate(e=>e.readOnly));
  await page.keyboard.type('Arsenal');await page.keyboard.press('Escape');assert(await page.locator('#search').evaluate(e=>e.readOnly));assert.deepEqual(await page.evaluate(()=>window.tvKeyboardCalls),[true,false]);
  await page.evaluate(()=>{document.querySelector('#search').value='';document.querySelector('#search').oninput();});
  // Real remote key events, no mouse clicks to navigate the cards.
  await page.locator('.card').first().focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('.card').nth(1).evaluate(e=>e===document.activeElement),true);
  await page.keyboard.press('ArrowDown');assert(await page.locator('.card').nth(4).evaluate(e=>e===document.activeElement));await page.keyboard.press('ArrowUp');assert(await page.locator('.card').nth(1).evaluate(e=>e===document.activeElement));
  const focusedFixture=await page.evaluate(()=>document.activeElement.getAttribute('aria-label'));await page.evaluate(()=>render());await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),focusedFixture);
  await page.keyboard.press('Enter');await page.waitForFunction(()=>document.body.classList.contains('mobile-watch'));
  await page.keyboard.press('Escape');assert(!await page.locator('body').evaluate(e=>e.classList.contains('mobile-watch')));
  await page.locator('#settings-menu-button').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>window.kayPopoverOpen(document.querySelector('#settings-menu')));
  await page.keyboard.press('ArrowDown');assert(await page.evaluate(()=>document.activeElement.closest('#settings-menu')!==null));await page.keyboard.press('Escape');assert(!await page.locator('#settings-menu').evaluate(e=>window.kayPopoverOpen(e)));
  await page.locator('#tv-settings').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>window.kayPopoverOpen(document.querySelector('#settings-menu')));await page.keyboard.press('Escape');
  await page.locator('.card').first().click();await page.waitForFunction(()=>document.body.classList.contains('mobile-watch'));await page.keyboard.press('Escape');await page.locator('#mobile-matches').click();assert(await page.locator('#matches-sidebar').isVisible());assert(await page.locator('main>section').isHidden());
  // TV uses the existing update dialog and download/install controls.
  await page.locator('#settings-menu-button').click();await page.locator('[data-settings-section="general"]').click();await page.locator('#check-update').click();
  await page.waitForFunction(()=>document.querySelector('#update-status').textContent.includes('99.0.0 is available'));
  await page.locator('#download-update').click();await page.waitForFunction(()=>!document.querySelector('#install-update').hidden);
  await page.locator('#install-update').click();await page.waitForFunction(()=>document.querySelector('#update-status').textContent.includes('Android'));
  await page.locator('#close-update-dialog').click();
  for(const [width,height] of [[1280,720],[1920,1080],[960,540],[806,331]]){await page.setViewportSize({width,height});await page.waitForTimeout(200);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const panes=await page.evaluate(()=>({a:document.querySelector('#matches-sidebar').getBoundingClientRect().toJSON(),b:document.querySelector('main>section').getBoundingClientRect().toJSON()}));assert(panes.a.width>width*.75);assert.equal(panes.b.width,0);assert(await page.locator('.card').first().isVisible());assert(await page.evaluate(()=>[...document.querySelectorAll('#mobile-tabs button')].every(e=>{const r=e.getBoundingClientRect();return r.x>=0&&r.right<=innerWidth&&r.y>=0&&r.bottom<=innerHeight})));await page.screenshot({path:path.join(__dirname,`../dist/tv-preview-${width}.png`)});}
  assert.deepEqual(errors,[]);console.log('TV remote Arrow/OK/Back, Settings focus containment, TV rail, card grid, Watch/Back, update dialog and 540p/720p/1080p layout passed');
 }finally{if(browser)await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
