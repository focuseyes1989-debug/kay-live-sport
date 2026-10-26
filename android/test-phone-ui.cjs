const {chromium}=require('@playwright/test'),http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{
 const root=path.join(__dirname,'www');let browser;
 const server=http.createServer((req,res)=>{const file=path.join(root,req.url==='/'?'index.html':req.url.split('?')[0]);if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/html');res.end(fs.readFileSync(file));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   localStorage.setItem('live-sport.match-league',JSON.stringify('La Liga'));
   window.calls=[];
   window.__TAURI__={core:{invoke:async(_,{command,args})=>{
    calls.push({command,args});
    if(command==='matches')return [{id:'live1',home:'Arsenal',away:'Liverpool',league:'English Premier League',homeScore:'0',awayScore:'0',live:true,sport:'1',kickoff:Math.floor(Date.now()/1000)-900,channels:[]},{id:'next1',home:'Barcelona',away:'Real Madrid',league:'La Liga',homeScore:'',awayScore:'',live:false,sport:'1',kickoff:Math.floor(Date.now()/1000)+3600,channels:[]}];
    if(command==='mobile_fullscreen')return {enabled:args.enabled};
    if(command==='check_update')return {status:'up_to_date',current:'0.1.26'};
    return {batches:[],errors:[],videos:[]};
   }}};
  });
  await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>document.querySelectorAll('#list .card').length===2&&!document.querySelector('#refresh').disabled);
  assert.equal(await page.title(),'KAY LIVE SPORT Phone');
  assert.equal(await page.locator('html').getAttribute('data-phone-theme'),'light');
  assert(!(await page.locator('#match-league-controls').isVisible()));
  assert.equal(await page.evaluate(()=>localStorage.getItem('live-sport.match-league')),'"La Liga"');
  await page.locator('#settings-menu-button').click();await page.locator('[data-settings-section="appearance"]').click();
  await page.locator('[data-theme="dark"]').click();
  await page.reload();await page.waitForFunction(()=>document.querySelectorAll('#list .card').length===2);
  assert.equal(await page.locator('html').getAttribute('data-phone-theme'),'dark');
  await page.screenshot({path:path.join(__dirname,'../dist/phone-dark-theme.png')});
  await page.locator('#settings-menu-button').click();
  if(await page.locator('[data-settings-section="appearance"]').getAttribute('aria-expanded')!=='true')await page.locator('[data-settings-section="appearance"]').click();
  await page.locator('[data-theme="light"]').click();await page.reload();
  await page.waitForFunction(()=>document.querySelectorAll('#list .card').length===2);
  assert.equal(await page.locator('html').getAttribute('data-phone-theme'),'light');
  await page.evaluate(()=>localStorage.setItem('live-sport.phone-theme','invalid'));await page.reload();
  await page.waitForFunction(()=>document.querySelectorAll('#list .card').length===2);
  assert.equal(await page.locator('html').getAttribute('data-phone-theme'),'light');
  assert.equal(await page.locator('#mobile-tabs button:visible').count(),2);
  await page.locator('#mobile-live').click();assert.equal(await page.locator('#list .card').count(),1);assert(await page.locator('#mobile-matches span').isVisible(),'Matches label remains visible when Live is selected');
  await page.locator('#mobile-matches').click();assert.equal(await page.locator('#list .card').count(),2);
  await page.locator('#search').fill('Barcelona');assert.equal(await page.locator('#list .card').count(),1);await page.locator('#search').fill('');
  await page.screenshot({path:path.join(__dirname,'../dist/phone-single-page.png')});
  await page.locator('#list .card').first().click();await page.waitForFunction(()=>document.querySelector('#stage').classList.contains('is-fullscreen'));
  assert(await page.locator('#phone-player-back').isVisible());assert(await page.locator('#retry').isVisible());
  assert(await page.evaluate(()=>calls.some(c=>c.command==='mobile_fullscreen'&&c.args.enabled)));
  await page.waitForFunction(()=>!fullscreenBusy);
  await page.clock.install();await page.clock.pauseAt(new Date(Date.now()+1000));
  // Virtual timers do not advance compositor transitions; test the final states.
  const controlsTestStyle=await page.addStyleTag({content:'.phone-player-options,#player-controls{transition:none!important}'});
  await page.evaluate(()=>{
   ++playToken;stop();waitingFixture=null;waitingManualLive=false;
   window.phoneTestPaused=false;window.phoneTestReady=4;window.phoneTestToggleCount=0;window.phoneOriginalToggle=togglePlayback;
   togglePlayback=()=>{phoneTestToggleCount++;};
   Object.defineProperty(video,'paused',{configurable:true,get:()=>phoneTestPaused});
   Object.defineProperty(video,'readyState',{configurable:true,get:()=>phoneTestReady});
   Object.defineProperty(video,'ended',{configurable:true,get:()=>false});
   video.hidden=false;$('empty').hidden=true;$('player-controls').hidden=false;$('recovery-bar').hidden=true;
  });
  for(const [width,height] of [[390,844],[844,390]]){
   await page.setViewportSize({width,height});
   await page.evaluate(()=>{phoneTestPaused=false;phoneTestReady=4;video.dispatchEvent(new Event('playing'));$('phone-player-back').focus();});
   await page.locator('#player-controls').dispatchEvent('mouseenter');
   await page.clock.runFor(50);
   await page.clock.fastForward(3300);
   const hiddenBars=await page.evaluate(()=>['.phone-player-options','#player-controls'].map(selector=>{const style=getComputedStyle(document.querySelector(selector));return {opacity:Number(style.opacity),pointerEvents:style.pointerEvents};}));
   for(const bar of hiddenBars){assert.equal(bar.opacity,0,'Both bars hide while playing, including touch hover/focus');assert.equal(bar.pointerEvents,'none');}
   await page.locator('#video').dispatchEvent('pointerdown',{pointerType:'touch'});await page.locator('#video').dispatchEvent('click');
   assert.equal(await page.locator('#stage').evaluate(e=>e.classList.contains('controls-hidden')),false);assert(await page.locator('#phone-player-back').isVisible());assert(await page.locator('#player-controls').isVisible());
   assert.equal(await page.evaluate(()=>phoneTestToggleCount),0,'Tap reveals controls without pausing playback');
   await page.clock.runFor(50);await page.clock.fastForward(3300);assert.equal(await page.locator('.phone-player-options').evaluate(e=>Number(getComputedStyle(e).opacity)),0,'Controls hide again after the touch');
   await page.evaluate(()=>{phoneTestPaused=true;video.dispatchEvent(new Event('pause'));});await page.clock.fastForward(3100);
   assert.equal(await page.locator('#stage').evaluate(e=>e.classList.contains('controls-hidden')),false,'Pause retains controls');
   await page.evaluate(()=>{phoneTestPaused=false;phoneTestReady=2;video.dispatchEvent(new Event('waiting'));});await page.clock.fastForward(3100);
   assert.equal(await page.locator('#stage').evaluate(e=>e.classList.contains('controls-hidden')),false,'Buffering retains controls');
   await page.evaluate(()=>{phoneTestReady=4;recoveryNotice('Test connection failure',true);});await page.clock.fastForward(3300);
   assert.equal(await page.locator('#stage').evaluate(e=>e.classList.contains('controls-hidden')),false,'Connection errors retain controls');
   await page.evaluate(()=>hidePlayerNotice());
  }
  await page.evaluate(()=>{delete video.paused;delete video.readyState;delete video.ended;togglePlayback=phoneOriginalToggle;showFullscreenControls();});
  await controlsTestStyle.evaluate(e=>e.remove());
  await page.clock.resume();
  await page.locator('#phone-player-back').click();await page.waitForFunction(()=>!document.body.classList.contains('mobile-watch')&&!document.querySelector('#stage').classList.contains('is-fullscreen'));
  assert.equal(await page.locator('#list .card').count(),2);
  await page.locator('#list .card').last().click();await page.waitForFunction(()=>document.querySelector('#stage').classList.contains('is-fullscreen'));
  assert.equal(await page.evaluate(()=>window.kayPhoneBack()),true);await page.waitForFunction(()=>!document.body.classList.contains('mobile-watch'));
  for(const [width,height] of [[320,740],[430,932],[844,390]]){await page.setViewportSize({width,height});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const stage=await page.locator('#matches-sidebar').boundingBox();assert(stage.width<=width);const nav=await page.locator('#mobile-tabs').evaluate(e=>{const s=getComputedStyle(e);return {width:e.getBoundingClientRect().width,shadow:s.boxShadow,radius:s.borderRadius,direction:s.flexDirection};});assert.equal(nav.shadow,'none');assert.equal(nav.radius,'0px');assert.equal(nav.direction,'row');assert(Math.abs(nav.width-(width-32))<2,JSON.stringify({width,nav}));}
  const landscapeTabs=await Promise.all(['#mobile-matches','#mobile-live'].map(id=>page.locator(id).boundingBox()));
  assert(Math.abs(landscapeTabs[0].width-landscapeTabs[1].width)<1);
  assert.equal(landscapeTabs[0].height,44);assert(landscapeTabs[0].width<=180);
  assert(landscapeTabs[1].x>=landscapeTabs[0].x+landscapeTabs[0].width+9);
  assert.equal(landscapeTabs[0].y,landscapeTabs[1].y);
  for(const theme of ['light','dark']){await page.evaluate(theme=>document.documentElement.dataset.phoneTheme=theme,theme);await page.locator('#mobile-live').click();assert(await page.locator('#mobile-matches span').isVisible());await page.locator('#mobile-matches').click();assert(await page.locator('#mobile-live .nav-live-label').isVisible());}
  await page.locator('#lazy-load-progress').waitFor({state:'hidden'});
  for(const theme of ['light','dark']){await page.evaluate(theme=>document.documentElement.dataset.phoneTheme=theme,theme);await page.screenshot({path:path.join(__dirname,'../dist/phone-landscape-'+theme+'.png')});}
  await page.evaluate(()=>{const match=matches.find(m=>!m.live);choose({...match,channels:[{id:'test-channel',name:'Test'}]});window.scheduledAttempted=!!manualStreamFixture;});
  assert(await page.evaluate(()=>window.scheduledAttempted),'Scheduled fixture with channels attempts playback');
  await page.waitForFunction(()=>document.querySelector('#stage').classList.contains('is-fullscreen'));
  await page.evaluate(()=>window.kayPhoneBack());await page.waitForFunction(()=>!document.body.classList.contains('mobile-watch'));
  assert.deepEqual(errors,[]);console.log('Phone: two filters, search, direct fullscreen, scheduled waiting/stream attempt, retry, native Back hook, list restoration and responsive widths passed');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
