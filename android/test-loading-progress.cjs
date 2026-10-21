const {chromium}=require('@playwright/test'),http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{
 const root=path.join(__dirname,process.env.KAY_PROGRESS_WINDOWS==='1'?'../ui':'www');
 const server=http.createServer((req,res)=>{const f=path.join(root,req.url==='/'?'index.html':req.url.split('?')[0]);if(!f.startsWith(root)||!fs.existsSync(f)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(f));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   window.progressDeferred=[];window.holdProgress=false;
   const mock=(command)=>window.holdProgress&&command==='lineups'?new Promise((resolve,reject)=>progressDeferred.push({resolve,reject})):Promise.resolve(command==='matches'?[]:{batches:[],errors:[],videos:[]});
   window.__TAURI__={core:{invoke:async(_,{command})=>mock(command)}};
   window.ipc={postMessage(body){const {id,command}=JSON.parse(body);mock(command).then(data=>window.receive({id,data}),e=>window.receive({id,error:e.message}));}};
  });
  await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('#lazy-load-progress').waitFor({state:'hidden'});
  await page.evaluate(()=>{holdProgress=true;window.firstLoad=rpc('lineups').catch(e=>({error:e.message}));window.secondLoad=rpc('lineups').catch(e=>({error:e.message}));});
  const box=page.locator('#lazy-load-progress');assert(await box.isVisible());assert.equal(await box.locator('progress').getAttribute('value'),null);assert.match(await box.innerText(),/2 loading/);
  await page.evaluate(()=>progressDeferred[0].resolve({teams:['kept']}));await page.waitForFunction(()=>document.querySelector('#lazy-load-progress').textContent.includes('1 completed'));
  assert.equal(await box.locator('progress').getAttribute('value'),null);assert.match(await box.innerText(),/1 loading/);
  assert.deepEqual(await page.evaluate(()=>firstLoad),{teams:['kept']});
  await page.evaluate(()=>progressDeferred[1].reject(Error('Offline')));await page.waitForFunction(()=>document.querySelector('#lazy-load-progress').dataset.state==='warning');
  assert.equal(await box.locator('progress').getAttribute('value'),'100');assert.match(await box.innerText(),/1 unavailable/);assert.deepEqual(await page.evaluate(()=>secondLoad),{error:'Offline'});
  await page.screenshot({path:path.join(__dirname,'../dist/loading-progress-'+(process.env.KAY_PROGRESS_WINDOWS==='1'?'windows':process.env.KAY_TV==='1'?'tv':'phone')+'.png')});
  assert.deepEqual(errors,[]);console.log('Loading progress: concurrent requests, indeterminate state, real completion counts, failure and unchanged results passed');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
