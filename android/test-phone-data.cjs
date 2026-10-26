const {chromium}=require('@playwright/test'),http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{
 const root=path.join(__dirname,'www');let browser;
 const server=http.createServer((req,res)=>{const f=path.join(root,req.url==='/'?'index.html':req.url.split('?')[0]);if(!f.startsWith(root)||!fs.existsSync(f)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(f));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
  browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  async function setup(expired=false){
   const page=await browser.newPage({viewport:{width:390,height:844}});await page.clock.install();
   await page.addInitScript(({expired})=>{
    const row={id:'cached',home:'Cached Home',away:'Cached Away',league:'League',sport:'1',kickoff:Math.floor(Date.now()/1000),live:true,homeScore:'0',awayScore:'0',channels:[]};
    localStorage.setItem('live-sport.phone-fixtures',JSON.stringify({version:1,savedAt:Date.now()-(expired?600000:1000),matches:[row]}));
    window.dataCalls=[];window.fixtureDeferred=[];window.scoreDeferred=[];window.hiddenForTest=false;
    Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.hiddenForTest});
    window.__TAURI__={core:{invoke:async(_,{command,args})=>{
     dataCalls.push(command);
     if(command==='matches')return new Promise(resolve=>fixtureDeferred.push(resolve));
     if(command==='scores')return new Promise(resolve=>scoreDeferred.push(resolve));
     if(command==='check_update')return {status:'up_to_date',current:'0.1.27'};
     return {};
    }}};
   },{expired});
   await page.goto('http://127.0.0.1:'+server.address().port);return page;
  }
  const page=await setup(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  assert.equal(await page.locator('#list .card').count(),1,'Cache renders before network completes');
  assert(await page.locator('#list').innerText().then(t=>t.includes('Cached Home')));
  assert.equal(await page.evaluate(()=>dataCalls.filter(c=>c==='matches').length),1);
  assert.equal(await page.evaluate(()=>dataCalls.filter(c=>c==='scores').length),2,'Both score sources run before fixtures resolve');
  assert(!(await page.locator('#lazy-load-progress').isVisible()),'Cached background refresh has no center loading box');
  await page.locator('#mobile-live').click();await page.locator('#mobile-matches').click();
  await page.evaluate(()=>{refresh();refresh(true);});
  assert.equal(await page.evaluate(()=>dataCalls.filter(c=>c==='matches').length),1,'Tabs and in-flight refresh do not duplicate requests');
  await page.evaluate(()=>fixtureDeferred.shift()([{id:'fresh',home:'Fresh Home',away:'Fresh Away',league:'League',sport:'1',live:true,kickoff:Math.floor(Date.now()/1000),channels:[],homeScore:'1',awayScore:'0'}]));
  await page.waitForFunction(()=>document.querySelector('#list').textContent.includes('Fresh Home'));
  assert(await page.locator('#refresh').isDisabled(),'Fixtures render while slow scores are still loading');
  await page.evaluate(()=>scoreDeferred.splice(0).forEach(resolve=>resolve({batches:[],errors:[]})));
  await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('live-sport.phone-fixtures')).matches[0].id),'fresh');
  await page.evaluate(()=>{hiddenForTest=true;document.dispatchEvent(new Event('visibilitychange'));});
  await page.clock.fastForward(90000);
  assert.equal(await page.evaluate(()=>dataCalls.filter(c=>c==='matches').length),1,'No polling in background');
  await page.evaluate(()=>{hiddenForTest=false;document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('online'));});
  await page.waitForFunction(()=>fixtureDeferred.length===1);
  assert.equal(await page.evaluate(()=>dataCalls.filter(c=>c==='matches').length),2,'Resume refresh deduplicates online event');
  await page.evaluate(()=>{fixtureDeferred.shift()(null);scoreDeferred.splice(0).forEach(resolve=>resolve({batches:[],errors:[]}));});
  await page.waitForFunction(()=>!document.querySelector('#refresh').disabled);
  assert((await page.locator('#list').innerText()).includes('Fresh Home'),'A failed update preserves the previous list');
  assert((await page.locator('#phone-data-status').innerText()).includes('previous matches'));
  await page.clock.fastForward(30000);await page.waitForFunction(()=>fixtureDeferred.length===1);
  assert.equal(await page.evaluate(()=>dataCalls.filter(c=>c==='matches').length),3,'Visible app refreshes proactively');
  await page.close();
  const expired=await setup(true);
  assert.equal(await expired.locator('#list .card').count(),0,'Expired cache is not displayed as current data');
  assert(await expired.locator('#lazy-load-progress').isVisible());
  await expired.evaluate(()=>{fixtureDeferred.shift()([]);scoreDeferred.splice(0).forEach(resolve=>resolve({batches:[],errors:[]}));});
  await expired.waitForFunction(()=>!document.querySelector('#refresh').disabled);
  assert.equal(await expired.evaluate(()=>JSON.parse(localStorage.getItem('live-sport.phone-fixtures')).matches.length),0,'A valid empty result replaces old cached data');
  await expired.close();assert.deepEqual(errors,[]);
  console.log('Phone eager data: cache-first display, parallel requests, instant tabs, deduplication, visible refresh, hidden pause, resume, failure retention and cache expiry passed');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
