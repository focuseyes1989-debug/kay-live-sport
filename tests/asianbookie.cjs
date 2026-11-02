const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert'),{execFileSync}=require('child_process'),{chromium}=require('../android/node_modules/@playwright/test');
(async()=>{
 let browser,currentRoot=path.resolve("android/www");const server=http.createServer((req,res)=>{const root=currentRoot;const relative=req.url.replace(/^\/desktop/,'').split('?')[0];const file=path.join(root,relative==='/'?'index.html':relative);if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.png')?'image/png':'text/html');res.end(fs.readFileSync(file));});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 for(const edition of ['Phone','Tablet','TV','Windows']){
  if(edition!=='Windows')execFileSync('node',['android/prepare-ui.cjs'],{env:{...process.env,KAY_TV:edition==='TV'?'1':'0',KAY_TABLET:edition==='Tablet'?'1':'0'}});
  currentRoot=path.resolve(edition==='Windows'?'ui':'android/www');
  const page=await browser.newPage({viewport:edition==='Phone'?{width:390,height:844}:{width:1280,height:720}});
  await page.addInitScript(()=>{
   window.calls=[];window.failBrowser=false;
   const answer=(command,args)=>{calls.push({command,args});if(command==='open_asianbookie'){if(failBrowser)throw Error('No browser available');return {opened:true};}if(command==='matches')throw Error('Source unavailable (403)');if(command==='scores')return {batches:[],errors:[]};if(command==='check_update')return {status:'up_to_date'};return {};};
   window.__TAURI__={core:{invoke:async(_,data)=>answer(data.command,data.args)}};
   window.ipc={postMessage:body=>{const {id,command,args}=JSON.parse(body);try{const data=answer(command,args);queueMicrotask(()=>receive({id,data}));}catch(e){queueMicrotask(()=>receive({id,error:e.message}));}}};
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/');
  await page.locator('#watch-asianbookie').waitFor({state:'visible'});
  await page.locator('#watch-asianbookie').click();await page.waitForFunction(()=>document.querySelector('#asianbookie-status').textContent.startsWith('Opened in browser'));
  assert(await page.evaluate(()=>calls.some(c=>c.command==='open_asianbookie')));
  await page.evaluate(()=>window.failBrowser=true);await page.locator('#watch-asianbookie').click();await page.waitForFunction(()=>document.querySelector('#asianbookie-status').textContent==='No browser available');assert(!(await page.locator('#watch-asianbookie').isDisabled()));
  if(edition==='Phone')assert.equal(await page.locator('.phone-player-options #watch-asianbookie-player').count(),1);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:'dist/asianbookie-'+edition.toLowerCase()+'.png'});console.log(edition+': fallback visible despite source failure, native command, browser error and button recovery passed');await page.close();
 }
 }finally{if(browser)await browser.close();server.close();execFileSync('node',['android/prepare-ui.cjs'],{env:{...process.env,KAY_TV:'0',KAY_TABLET:'0'}});}
})().catch(e=>{console.error(e);process.exitCode=1});
