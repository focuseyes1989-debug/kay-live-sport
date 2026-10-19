const {chromium}=require('@playwright/test'),fs=require('fs'),http=require('http'),path=require('path');
(async()=>{
 const root=path.join(__dirname,'www');const server=http.createServer((req,res)=>{const file=path.join(root,req.url==='/'?'index.html':req.url.split('?')[0]);if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end()}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/html');res.end(fs.readFileSync(file));});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,deviceScaleFactor:1});
 await page.addInitScript(()=>{window.__TAURI__={core:{invoke:async(_,{command})=>command==='matches'?[{id:'test',post:'1',home:'Arsenal',away:'Chelsea',sport:'1',league:'English Premier League',kickoff:Math.floor(Date.now()/1000)+3600,live:false,finished:false,channels:[],homeScore:'',awayScore:''}]:{batches:[],errors:[]}}};});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);await page.getByRole('button',{name:/Arsenal vs Chelsea/}).waitFor();
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Mobile horizontal overflow');
 await page.screenshot({path:path.join(__dirname,'../dist/android-matches-preview.png')});
 await page.getByRole('button',{name:/Arsenal vs Chelsea/}).click();await page.locator('body.mobile-watch').waitFor();await page.screenshot({path:path.join(__dirname,'../dist/android-watch-preview.png')});
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 await page.locator('[data-settings-section="notifications"]').click();
 const switchBounds=await page.locator('#toggle-goal-notifications').boundingBox();
 if(switchBounds.width!==44||switchBounds.height!==26)throw Error('Switch dimensions changed inside header');
 const labelClipped=await page.evaluate(()=>[...document.querySelectorAll('#notifications-content .settings-row')].some(row=>row.querySelector('span').getBoundingClientRect().left<document.querySelector('#notifications-content').getBoundingClientRect().left));
 if(labelClipped)throw Error('Settings label is clipped');
 await page.screenshot({path:path.join(__dirname,'../dist/android-settings-preview.png'),animations:'disabled'});
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 await page.setViewportSize({width:844,height:390});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Landscape horizontal overflow');
 const stage=await page.locator('#stage').boundingBox();if(stage.height<200)throw Error('Landscape player is too small');await page.locator('#mobile-matches').click();await page.locator('#mobile-watch').click();await page.screenshot({path:path.join(__dirname,'../dist/android-landscape-preview.png'),animations:'disabled'});
 for(const size of [{width:390,height:844},{width:844,height:390}]){
  await page.setViewportSize(size);await page.evaluate(()=>{document.body.classList.add('player-fullscreen');document.querySelector('#stage').classList.add('is-fullscreen');const v=document.querySelector('video');v.hidden=false;v.style.display='block';document.querySelector('#player-controls').hidden=false;});
  await page.locator('#mobile-fit-fill button[data-fit=fill]').click();if(await page.locator('video').evaluate(v=>getComputedStyle(v).objectFit)!=='cover')throw Error('Fill does not cover the viewport');await page.locator('#mobile-fit-fill button[data-fit=fit]').click();if(await page.locator('video').evaluate(v=>getComputedStyle(v).objectFit)!=='contain')throw Error('Fit does not contain the full video');
  const bounds=await page.locator('#stage').boundingBox(),videoBounds=await page.locator('video').boundingBox();
  for(const rect of [bounds,videoBounds])if(Math.abs(rect.x)>1||Math.abs(rect.y)>1||Math.abs(rect.width-size.width)>1||Math.abs(rect.height-size.height)>1)throw Error('Fullscreen does not fill viewport: '+JSON.stringify({size,rect}));
  await page.evaluate(()=>{document.body.classList.remove('player-fullscreen');document.querySelector('#stage').classList.remove('is-fullscreen');});
 }
 await page.evaluate(()=>setMobileVideoFit('fill'));await page.reload();await page.locator('#mobile-fit-fill').waitFor({state:'attached'});if(!await page.locator('#stage').evaluate(el=>el.classList.contains('video-fill')))throw Error('Saved Fill was not restored');
 await page.evaluate(()=>setMobileVideoFit('fit'));await page.reload();await page.locator('#mobile-fit-fill').waitFor({state:'attached'});if(await page.locator('#stage').evaluate(el=>el.classList.contains('video-fill')))throw Error('Saved Fit was not restored');
 await page.evaluate(()=>localStorage.setItem('live-sport.video-fit','invalid'));await page.reload();await page.locator('#mobile-fit-fill').waitFor({state:'attached'});if(await page.locator('#stage').evaluate(el=>el.classList.contains('video-fill')))throw Error('Invalid saved mode did not fall back to Fit');
 await page.setViewportSize({width:390,height:844});
 await page.locator('#mobile-live').click();if(await page.locator('.filters .active').getAttribute('data-filter')!=='live')throw Error('Live navigation did not select Live now');
 await page.locator('#mobile-results').click();if(await page.locator('.filters .active').getAttribute('data-filter')!=='results')throw Error('Results navigation did not select Results');
 await page.locator('#mobile-matches').click();if(await page.locator('.filters .active').getAttribute('data-filter')!=='all')throw Error('Matches navigation did not select All matches');
 await page.locator('#mobile-search').click();if(!await page.locator('#search').evaluate(el=>document.activeElement===el))throw Error('Search navigation did not focus search');
 await page.locator('#mobile-watch').click();if(!await page.locator('body').evaluate(el=>el.classList.contains('mobile-watch')))throw Error('Watch navigation did not show the player');
 if(errors.length)throw Error(errors.join('\n'));await browser.close();server.close();console.log('Mobile 390x844 / 844x390 layout, match selection, tab navigation and script execution passed');
})().catch(e=>{console.error(e);process.exitCode=1});
