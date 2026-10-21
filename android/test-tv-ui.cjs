const {chromium}=require('@playwright/test'),fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert');
(async()=>{
 const root=path.join(__dirname,'www'),server=http.createServer((req,res)=>{const f=path.join(root,req.url==='/'?'index.html':req.url.split('?')[0]);if(!f.startsWith(root)||!fs.existsSync(f)){res.writeHead(404);return res.end()}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.svg')?'image/svg+xml':'text/html');res.end(fs.readFileSync(f))});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({executablePath:process.env.KAY_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('live-sport.match-league',JSON.stringify('Unavailable old league'));localStorage.setItem('live-sport.results-league',JSON.stringify('Unavailable old league'));window.__TAURI__={event:{listen:async()=>()=>{}},core:{invoke:async(_,{command})=>command==='check_update'?{status:'available',current:'0.1.7',latest:'99.0.0',notes:'TV update fixture'}:command==='download_update'?{version:'99.0.0',path:'/cache/updates/KAYLiveSport-tv-arm64-debug.apk'}:command==='install_update'?{installerOpened:true}:command==='matches'?[['Arsenal','Chelsea'],['Liverpool','Manchester City'],['Real Madrid','Sevilla'],['Barcelona','Valencia'],['Bayern Munich','Dortmund'],['PSG','Marseille']].map(([home,away],i)=>({id:'tv-'+i,post:'1',sport:'1',home,away,league:'Premier League',live:false,finished:false,kickoff:Date.now()/1000+3600,channels:[],homeScore:'',awayScore:''})):{batches:[],errors:[]}}};});
  await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('.card').first().waitFor();
  assert.equal(await page.locator('#results-date').isVisible(),false);
  assert.equal(await page.locator('#results-today').isVisible(),false);
  assert.equal(await page.locator('#results-yesterday').isVisible(),false);
  await page.evaluate(()=>{document.querySelector('#tv-highlights').click()});
  assert.equal(await page.locator('.catalog-days').isVisible(),false);
  await page.locator('#mobile-matches').click();
  await page.evaluate(()=>{
   localStorage.setItem('live-sport.match-search','old search');localStorage.setItem('live-sport.match-filter','live');
   localStorage.setItem('live-sport.last-playback',JSON.stringify({id:'tv-0',channel:'1'}));
   localStorage.setItem('live-sport.video-fit','fill');localStorage.setItem('live-sport.quality-height','720');
   localStorage.setItem('live-sport.notification-volume','37');localStorage.setItem('live-sport.time-format','"12"');
   localStorage.setItem('live-sport.kickoff-autoplay','false');localStorage.setItem('live-sport.animations','false');
  });
  await page.reload();await page.locator('.card').first().waitFor();
  const restored=await page.evaluate(()=>({search:$('search').value,filter,selected,watch:document.body.classList.contains('mobile-watch'),fit:localStorage.getItem('live-sport.video-fit'),quality:localStorage.getItem('live-sport.quality-height'),volume:notificationSoundVolume,time:timeFormat,autoplay:kickoffAutoplayEnabled,animations:animationsEnabled}));
  assert.deepEqual(restored,{search:'',filter:'all',selected:null,watch:false,fit:'fit',quality:null,volume:37,time:'12',autoplay:false,animations:false});
  for(const width of [806,960,1280,1920]){
   await page.setViewportSize({width,height:720});
   for(const mode of ['all','live']){
    await page.evaluate(mode=>{matches.forEach(m=>m.live=true);setMatchFilter(mode);showMobileView('matches')},mode);
    await page.waitForFunction(mode=>document.body.dataset.tvPage===(mode==='live'?'live':'matches'),mode);
    const boxes=await page.locator('#list>.card').evaluateAll(es=>es.slice(0,4).map(e=>{const r=e.getBoundingClientRect();return {top:r.top,left:r.left,right:r.right,width:r.width,scroll:e.scrollWidth,client:e.clientWidth}}));
    assert.equal(boxes.length,4);assert(boxes.every(b=>Math.abs(b.top-boxes[0].top)<1&&b.right<=width&&b.scroll<=b.client+1));
    assert(boxes.slice(1).every((b,i)=>b.left-boxes[i].right>=10));
   }
  }
  await page.setViewportSize({width:1280,height:720});await page.locator('#mobile-matches').click();
  const recent=await page.evaluate(async()=>{const original=rpc;let requested;rpc=async(command,args)=>{if(command==='scores'){requested=args.dates;return {batches:[],errors:[]}}return original(command,args)};try{await refreshResults();const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);return {requested,expected:[...new Set([localDay(),localDay(yesterday.getTime())].flatMap(resultsQueryDates))],day:catalogDay}}finally{rpc=original}});
  assert.deepEqual(recent.requested,recent.expected);assert.equal(recent.day,'both');
assert(await page.locator('body').evaluate(e=>e.classList.contains('tv-ui')));
  await page.evaluate(()=>{window.tvKeyboardCalls=[];const original=window.__TAURI__.core.invoke;window.__TAURI__.core.invoke=async(c,a)=>{if(a.command==='mobile_keyboard')window.tvKeyboardCalls.push(a.args.enabled);return original(c,a);};});
  await page.locator('#search').focus();assert(await page.locator('#search').evaluate(e=>e.readOnly));
  await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>document.activeElement.id),'refresh');assert.equal(await page.evaluate(()=>window.tvKeyboardCalls.length),0);
  await page.keyboard.press('ArrowLeft');assert(await page.evaluate(()=>!!document.activeElement.closest('#mobile-tabs')));await page.locator('#search').focus();await page.keyboard.press('Enter');assert(!await page.locator('#search').evaluate(e=>e.readOnly));
  await page.keyboard.type('Arsenal');await page.keyboard.press('Escape');assert(await page.locator('#search').evaluate(e=>e.readOnly));assert.deepEqual(await page.evaluate(()=>window.tvKeyboardCalls),[true,false]);
  await page.evaluate(()=>{document.querySelector('#search').value='';document.querySelector('#search').oninput();});
  // Real remote key events, no mouse clicks to navigate the cards.
  await page.locator('.card').first().focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('.card').nth(1).evaluate(e=>e===document.activeElement),true);
  await page.keyboard.press('ArrowDown');assert(await page.locator('.card').nth(5).evaluate(e=>e===document.activeElement));await page.keyboard.press('ArrowUp');assert(await page.locator('.card').nth(1).evaluate(e=>e===document.activeElement));
  await page.keyboard.press('ArrowLeft');assert(await page.evaluate(()=>!!document.activeElement.closest('#mobile-tabs')));await page.keyboard.press('ArrowRight');assert(await page.evaluate(()=>!!document.activeElement.closest('#matches-sidebar')));
  const focusedFixture=await page.evaluate(()=>document.activeElement.getAttribute('aria-label'));await page.evaluate(()=>render());await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),focusedFixture);
  const focusRefresh=await page.evaluate(()=>{
   const current=document.activeElement.dataset.fixtureId,match=matches.find(m=>m.id===current),original=match.home;
   match.home+=' Updated';match.live=!match.live;render();
   const immediate=document.activeElement.dataset.fixtureId;
   match.home=original;match.live=true;render();
   document.querySelector('#tv-settings').focus();render();const rail=document.activeElement.id;
   document.querySelector('[data-fixture-id="'+current+'"]').focus();
   return {current,immediate,rail};
  });
  assert.equal(focusRefresh.current,focusRefresh.immediate);assert.equal(focusRefresh.rail,'tv-settings');
  await page.keyboard.press('Enter');await page.waitForFunction(()=>document.body.classList.contains('mobile-watch'));
  await page.keyboard.press('Escape');assert(!await page.locator('body').evaluate(e=>e.classList.contains('mobile-watch')));
  await page.locator('#tv-settings').focus();await page.keyboard.press('Enter');await page.locator('#tv-settings-page').waitFor();await page.screenshot({path:path.join(__dirname,'../dist/tv-settings-page.png')});
  await page.keyboard.press('ArrowDown');assert(await page.evaluate(()=>document.activeElement.closest('#tv-settings-page')!==null));await page.keyboard.press('Escape');assert(await page.locator('#tv-settings-page').isHidden());
  await page.locator('#tv-settings').focus();await page.keyboard.press('Enter');await page.locator('#tv-settings-page').waitFor();await page.keyboard.press('Escape');
  await page.locator('.card').first().click();await page.waitForFunction(()=>document.body.classList.contains('mobile-watch'));await page.keyboard.press('Escape');await page.locator('#mobile-matches').click();assert(await page.locator('#matches-sidebar').isVisible());assert(await page.locator('main>section').isHidden());
  assert(await page.locator('#mobile-search').isHidden());assert(await page.locator('#mobile-results').isHidden());assert(await page.locator('#settings-menu-button').isHidden());assert(await page.locator('#match-league-controls').isHidden());
  await page.locator('#tv-scores').click();assert.equal(await page.locator('.list-heading h2').innerText(),'Scores');assert(await page.locator('.results-content-tabs').isHidden());assert(await page.locator('#results-league-search').isHidden());
  await page.locator('#tv-highlights').click();assert.equal(await page.locator('.list-heading h2').innerText(),'Highlights');assert(await page.locator('#catalog-controls').isVisible());assert(await page.locator('#results-controls').isHidden());await page.locator('#mobile-matches').click();
  // TV uses the existing update dialog and download/install controls.
  await page.locator('#tv-settings').click();await page.locator('[data-settings-section="general"]').click();await page.locator('#check-update').click();
  await page.waitForFunction(()=>document.querySelector('#update-status').textContent.includes('99.0.0 is available'));
  await page.locator('#download-update').click();await page.waitForFunction(()=>!document.querySelector('#install-update').hidden);
  await page.locator('#install-update').click();await page.waitForFunction(()=>document.querySelector('#update-status').textContent.includes('Android'));
  await page.locator('#close-update-dialog').click();await page.locator('#reset-settings').click();assert(await page.locator('#reset-dialog').isVisible());await page.locator('#cancel-reset').click();assert(await page.locator('#reset-dialog').isHidden());assert(await page.locator('#tv-settings-page').isVisible());
  await page.locator('#mobile-matches').click();
  for(const [width,height] of [[1280,720],[1920,1080],[960,540],[806,331]]){await page.setViewportSize({width,height});await page.waitForTimeout(200);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const panes=await page.evaluate(()=>({a:document.querySelector('#matches-sidebar').getBoundingClientRect().toJSON(),b:document.querySelector('main>section').getBoundingClientRect().toJSON()}));assert(panes.a.width>width*.75);assert.equal(panes.b.width,0);assert(await page.locator('.card').first().isVisible());assert(await page.evaluate(()=>[...document.querySelectorAll('#mobile-tabs button')].every(e=>{const r=e.getBoundingClientRect();return r.x>=0&&r.right<=innerWidth&&r.y>=0&&r.bottom<=innerHeight})));await page.screenshot({path:path.join(__dirname,`../dist/tv-preview-${width}.png`)});}
  assert.deepEqual(errors,[]);console.log('TV remote Arrow/OK/Back, Settings focus containment, TV rail, card grid, Watch/Back, update dialog and 540p/720p/1080p layout passed');
 }finally{if(browser)await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
