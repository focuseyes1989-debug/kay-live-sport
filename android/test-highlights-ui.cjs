const {chromium}=require('@playwright/test'),http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{
const windows=process.env.KAY_HIGHLIGHTS_WINDOWS==='1',tv=process.env.KAY_TV==='1',root=path.join(__dirname,windows?'../ui':'www');
const server=http.createServer((req,res)=>{const f=path.join(root,req.url==='/'?'index.html':req.url.split('?')[0]);if(!f.startsWith(root)||!fs.existsSync(f)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(f));});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const page=await browser.newPage({viewport:windows?{width:1366,height:768}:tv?{width:1280,height:720}:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{
window.highlightCalls=[];window.openedHighlights=[];window.failBrowser=false;
const date=offset=>{const d=new Date();d.setDate(d.getDate()+offset);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+'T00:00:00';};
const row=(id,league,offset)=>({videoId:id,title:id.replaceAll('-',' '),league,published:date(offset),url:'https://hoofoot.net/full-matches/'+league.toLowerCase().replaceAll(' ','-')+'/'+id+'-highlights-october-20-2026/'});
const mock=async(command,args)=>{window.highlightCalls.push(command);if(command==='official_highlight')return window.officialResult||{video:null};if(command==='matches')return [];if(command==='highlights_catalog')return {videos:[row('psg-vs-barcelona','Champions League',0),row('liverpool-vs-villarreal','Champions League',-1),row('a-vs-b','Premier League',-1),row('old-vs-match','La Liga',-3),row('future-vs-match','La Liga',1)]};if(command==='open_highlight'){if(window.failBrowser)throw Error('No browser');window.openedHighlights.push(args.url);return {opened:true};}return {batches:[],errors:[],videos:[]};};
window.__TAURI__={core:{invoke:async(_,{command,args})=>mock(command,args)}};window.ipc={postMessage(body){const {id,command,args}=JSON.parse(body);mock(command,args).then(data=>window.receive({id,data}),e=>window.receive({id,error:e.message}));}};
});
await page.goto('http://127.0.0.1:'+server.address().port);await page.locator(windows?'.filters [data-filter="results"]':tv?'#tv-highlights':'#mobile-results').click();if(!tv)await page.locator('[data-results-content="highlights"]').click();await page.locator('.catalog-card').first().waitFor();
assert.equal(await page.locator('.catalog-card').count(),3);assert.equal(await page.locator('.catalog-section').count(),2);assert(await page.locator('.catalog-days').isVisible());
await page.locator('[data-catalog-day="today"]').click();assert.equal(await page.locator('.catalog-card').count(),1);await page.locator('.catalog-card').first().click();await page.waitForFunction(()=>openedHighlights.length===1);assert.match(await page.evaluate(()=>openedHighlights[0]),/^https:\/\/hoofoot.net\//);assert.equal(await page.locator('iframe').count(),0);
await page.locator('[data-catalog-day="yesterday"]').click();assert.equal(await page.locator('.catalog-card').count(),2);await page.evaluate(()=>window.failBrowser=true);await page.locator('.catalog-card').first().click();await page.waitForFunction(()=>document.querySelector('#highlights-panel').textContent.includes('Could not open'));
await page.evaluate(()=>{window.failBrowser=false;window.officialResult={video:{source:'ESPN',title:'Official recap',embed:'https://www.espn.com/core/video/iframe?id=42&endcard=false'}}});
await page.route('https://www.espn.com/**',route=>route.fulfill({body:'<html>Official player test</html>',contentType:'text/html'}));
await page.locator('.catalog-card').first().click();await page.locator('.highlights-frame').waitFor();assert.equal(await page.locator('.highlights-frame').getAttribute('src'),'https://www.espn.com/core/video/iframe?id=42&endcard=false');
await page.locator('.highlights-actions button').filter({hasText:'HooFoot fallback'}).click();await page.waitForFunction(()=>openedHighlights.length===2);
if(!windows)await page.evaluate(()=>showMobileView('matches'));
await page.locator('[data-catalog-day="both"]').click();if(tv){await page.locator('#search').focus();await page.keyboard.press('Enter');}await page.locator('#search').fill('PSG');assert.equal(await page.locator('.catalog-card').count(),1);await page.locator('#search').fill('');if(tv)await page.keyboard.press('Escape');
const count=await page.evaluate(()=>highlightCalls.filter(c=>c==='highlights_catalog').length);await page.evaluate(()=>refreshHighlightsCatalog());assert.equal(await page.evaluate(()=>highlightCalls.filter(c=>c==='highlights_catalog').length),count);
assert.deepEqual(errors,[]);await page.screenshot({path:path.join(__dirname,'../dist/hoofoot-'+(windows?'windows':tv?'tv':'phone')+'-catalog.png')});console.log((windows?'Windows':tv?'TV':'Phone/Tablet')+': HooFoot catalog, league groups, local today/yesterday, old/future exclusion, search, browser open/error and cache passed');
}finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
