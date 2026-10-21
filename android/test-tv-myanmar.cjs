const {chromium}=require('@playwright/test'),http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{
 const root=path.join(__dirname,'www'),seed=JSON.parse(fs.readFileSync(path.join(__dirname,'myanmar-tv-channels.json'),'utf8'));
 const channels=seed.map(c=>({...c,page:'https://www.myanmartvchannels.com/channels/'+c.id+'/',logo:'https://www.myanmartvchannels.com/channels/'+c.id+'.webp'}));
 const server=http.createServer((req,res)=>{const f=path.join(root,req.url==='/'?'index.html':req.url.split('?')[0]);if(!f.startsWith(root)||!fs.existsSync(f)){res.writeHead(404);return res.end()}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':f.endsWith('.svg')?'image/svg+xml':'text/html');res.end(fs.readFileSync(f))});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({channels})=>{window.mmCalls=[];window.mmFail=false;window.__TAURI__={core:{invoke:async(_,{command,args})=>{window.mmCalls.push({command,args});if(command==='matches')return [];if(command==='myanmar_channels'){if(window.mmFail)throw Error('Offline');return {channels,cached:true}}if(command==='myanmar_resolve'){const c=channels.find(c=>c.id===args.id);if(!c?.stream)throw Error('Source requires browser session');return {url:c.stream,format:'hls'}}if(command==='open_myanmar_tv')return {opened:true};return {batches:[],errors:[]}}}};},{channels});
  await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('#tv-myanmar').waitFor();await page.locator('#tv-myanmar').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelectorAll('.myanmar-card').length===18);
  assert.equal(await page.locator('.list-heading h2').innerText(),'Myanmar TV');assert(await page.locator('#tv-myanmar').evaluate(e=>e.classList.contains('active')));
  const top=await page.locator('.myanmar-card').evaluateAll(es=>es.slice(0,4).map(e=>e.getBoundingClientRect().top));assert(top.every(t=>t===top[0]));
  await page.locator('.myanmar-card').first().focus();await page.keyboard.press('ArrowRight');assert(await page.locator('.myanmar-card').nth(1).evaluate(e=>e===document.activeElement));
  await page.keyboard.press('ArrowDown');assert(await page.locator('.myanmar-card').nth(5).evaluate(e=>e===document.activeElement));await page.keyboard.press('ArrowLeft');assert(await page.evaluate(()=>!!document.activeElement.closest('#mobile-tabs')));
  await page.locator('#search').focus();await page.keyboard.press('Enter');await page.locator('#search').fill('DVB');await page.keyboard.press('Escape');assert.equal(await page.locator('.myanmar-card').count(),1);
  await page.locator('#search').focus();await page.keyboard.press('Enter');await page.locator('#search').fill('');await page.keyboard.press('Escape');
  await page.screenshot({path:path.join(__dirname,'../dist/tv-myanmar-page.png')});
  await page.evaluate(()=>{video.muted=true});await page.locator('[data-fixture-id="myanmar-dvb"]').click();await page.waitForFunction(()=>window.mmCalls.some(c=>c.command==='myanmar_resolve'&&c.args.id==='dvb'));
  assert(await page.locator('body').evaluate(e=>e.classList.contains('mobile-watch')));assert(await page.locator('#scoreboard').isHidden());assert(await page.locator('#myanmar-source').isVisible());
  if(process.env.KAY_MYANMAR_LIVE==='1'){
   await page.waitForFunction(()=>video.currentTime>1&&video.readyState>=2,{},{timeout:45000});console.log('DVB live playback progressed:',await page.evaluate(()=>({time:video.currentTime,width:video.videoWidth,height:video.videoHeight})));
   await page.screenshot({path:path.join(__dirname,'../dist/tv-myanmar-playing.png')});
  }
  await page.locator('#stage').click({position:{x:80,y:80}});await page.waitForFunction(()=>document.body.classList.contains('player-fullscreen'));await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.body.classList.contains('player-fullscreen'));
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.body.classList.contains('mobile-watch'));
  await page.locator('[data-fixture-id="myanmar-5plus"]').click();await page.waitForFunction(()=>!document.querySelector('#retry').hidden);await page.locator('#myanmar-source').click();assert(await page.evaluate(()=>window.mmCalls.some(c=>c.command==='open_myanmar_tv'&&c.args.url.endsWith('/5plus/'))));
  const calls=await page.evaluate(()=>window.mmCalls.filter(c=>c.command==='myanmar_resolve').length);await page.locator('#player-retry').click();await page.waitForFunction(n=>window.mmCalls.filter(c=>c.command==='myanmar_resolve').length>n,calls);
  await page.evaluate(()=>window.kayTvBack());await page.locator('#mobile-matches').click();assert(!await page.locator('#tv-myanmar').evaluate(e=>e.classList.contains('active')));
  assert.deepEqual(errors,[]);console.log('Myanmar TV: 18 channels, 4 columns, search, remote, shared player, fullscreen/Back, source fallback and retry passed');
 }finally{if(browser)await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
