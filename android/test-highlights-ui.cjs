const {chromium}=require('@playwright/test'),fs=require('fs'),http=require('http'),path=require('path');
(async()=>{
 const root=path.join(__dirname,'www');
 const server=http.createServer((req,res)=>{const file=path.join(root,req.url==='/'?'index.html':req.url.split('?')[0]);if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end()}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/html');res.end(fs.readFileSync(file))});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://www.youtube-nocookie.com/**',r=>r.fulfill({contentType:'text/html',body:'<body>Player layout fixture</body>'}));
  await page.addInitScript(()=>{window.__TAURI__={core:{invoke:async(_,{command})=>command==='matches'?[]:command==='highlights_catalog'?{videos:[{title:'Recent Real Madrid highlights',videoId:'SjxTxaJUvpU',published:new Date(Date.now()-60000).toISOString(),url:'https://www.youtube.com/watch?v=SjxTxaJUvpU',league:'LALIGA',sections:['trending','la_liga'],views:100},{title:'Yesterday football highlights',videoId:'3uoy7oVLriY',published:new Date(new Date().setHours(-1,0,0,0)).toISOString(),url:'https://www.youtube.com/watch?v=3uoy7oVLriY',league:'Premier League',sections:['premier_league']},{title:'Old highlights',videoId:'abcdefghijk',published:new Date(Date.now()-4*86400000).toISOString(),url:'https://www.youtube.com/watch?v=abcdefghijk'}]}:command==='highlights'?{videos:[{title:'Real Madrid vs Villarreal highlights',videoId:'SjxTxaJUvpU',url:'https://www.youtube.com/watch?v=SjxTxaJUvpU'}]}:{batches:[],errors:[]}}}});
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.evaluate(()=>choose({id:'test-result',sport:'1',home:'Real Madrid',away:'Villarreal',league:'LALIGA',finished:true,live:false,kickoff:Math.floor(Date.now()/1000)-3600,channels:[],homeScore:'1',awayScore:'0'}));
  for(const [name,width,height] of [['portrait',390,844],['landscape',844,390],['wide',1366,768]]){
   await page.setViewportSize({width,height});await page.getByRole('button',{name:'▶ Watch highlights',exact:true}).click();
   await page.locator('.highlights-frame').waitFor({state:'attached'});
   const source=page.getByRole('button',{name:'Open in YouTube',exact:true});await source.scrollIntoViewIfNeeded();const box=await source.boundingBox();
   if(!box||box.y<0||box.y+box.height>height)throw Error(name+' source button clipped');
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error(name+' horizontal overflow');
   await page.screenshot({path:path.join(__dirname,'../dist/highlights-'+name+'-player-layout.png')});
  }
  await page.setViewportSize({width:390,height:844});await page.locator('#mobile-results').click();await page.locator('[data-results-content="highlights"]').click();await page.locator('.catalog-card').first().waitFor();
  if(await page.locator('.catalog-card').count()!==3)throw Error('Trending/league grouping failed');
  if(await page.locator('#count').innerText()!=='2 highlights')throw Error('Duplicate trending video counted twice');
  const groups=await page.locator('.catalog-section').evaluateAll(items=>items.map(e=>e.dataset.catalogSection));if(JSON.stringify(groups)!==JSON.stringify(['trending','premier_league','la_liga']))throw Error('Wrong category order: '+groups);
  await page.locator('.catalog-card').first().evaluate(e=>e.dataset.identity='retained');await page.evaluate(()=>render());if(await page.locator('.catalog-card').first().getAttribute('data-identity')!=='retained')throw Error('Score poll rebuilt catalog cards');
  await page.locator('[data-catalog-day="today"]').click();if(await page.locator('.catalog-card').count()!==2)throw Error('Today filter failed');if(await page.locator('[data-catalog-section=premier_league]').count())throw Error('Empty section not hidden');
  await page.locator('[data-catalog-day="yesterday"]').click();if(await page.locator('.catalog-card').count()!==1)throw Error('Yesterday filter failed');if(await page.locator('[data-catalog-section=trending]').count())throw Error('Trending ignored date filter');
  await page.locator('[data-catalog-day="both"]').click();await page.locator('.catalog-card img').first().evaluate(img=>img.decode().catch(()=>{}));await page.screenshot({path:path.join(__dirname,'../dist/results-highlights-mobile.png')});
  await page.locator('.catalog-card').first().click();await page.locator('.highlights-frame').waitFor();
  if(!await page.locator('body').evaluate(e=>e.classList.contains('mobile-watch')))throw Error('Card did not open mobile Watch');
  if(!await page.locator('.highlights-frame').getAttribute('src').then(s=>s.includes('SjxTxaJUvpU')))throw Error('Wrong catalog video');
  await page.evaluate(()=>updateSelected());if(!await page.locator('#highlights-panel').isVisible())throw Error('Score poll hid catalog player');
  await page.setViewportSize({width:844,height:390});await page.getByRole('button',{name:'Open in YouTube',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:path.join(__dirname,'../dist/results-highlights-landscape.png')});
  await page.evaluate(()=>choose({id:'upcoming',sport:'1',home:'A',away:'B',league:'Football',finished:false,live:false,kickoff:Date.now()/1000+3600,channels:[]}));if(await page.locator('.highlights-frame').count())throw Error('Old highlight kept playing after choosing a match');
  await page.locator('#mobile-results').click();await page.locator('[data-results-content="scores"]').click();if(!await page.locator('#results-controls').isVisible())throw Error('Scores controls did not return');
  if(errors.length)throw Error(errors.join('\n'));
  console.log('Highlights layout: embedded player and source button remain reachable in portrait, landscape and wide views');
 }finally{if(browser)await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
