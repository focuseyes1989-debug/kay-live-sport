const {chromium}=require('@playwright/test'),fs=require('fs'),http=require('http'),path=require('path');
(async()=>{
 const root=path.join(__dirname,'www'),server=http.createServer((req,res)=>{const file=path.join(root,req.url==='/'?'index.html':req.url.split('?')[0]);if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end()}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/html');res.end(fs.readFileSync(file))});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.__TAURI__={core:{invoke:async(_,{command})=>command==='matches'?[['Arsenal','Chelsea'],['Liverpool','Manchester City'],['Real Madrid','Sevilla'],['Barcelona','Valencia']].map(([home,away],i)=>({id:'responsive-'+i,post:'1',sport:'1',home,away,league:i<2?'English Premier League':'LALIGA',live:false,finished:false,kickoff:Date.now()/1000+3600+i*900,channels:[],homeScore:'',awayScore:''})):{batches:[],errors:[]}}};});
  await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('.card').first().waitFor();
  for(const [name,width,height,layout] of [['phone-landscape',667,375,'rail'],['phone-wide',853,394,'rail'],['tablet-landscape',1280,800,'split'],['tablet-small',1024,768,'split'],['tablet-portrait',800,1280,'grid'],['tablet-compact',600,960,'grid']]){
   await page.setViewportSize({width,height});await page.locator('#mobile-matches').click();
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error(name+' horizontal overflow');
   const sidebar=await page.locator('#matches-sidebar').boundingBox(),nav=await page.locator('#mobile-tabs').boundingBox();
   if(!sidebar||!nav||nav.y<0||nav.y+nav.height>height+1)throw Error(name+' invalid navigation bounds');
   if(layout==='rail'&&(nav.width>65||sidebar.x<70))throw Error(name+' side rail missing');
   if(layout==='grid'){const cards=await page.locator('.card').all();const a=await cards[0].boundingBox(),b=await cards[1].boundingBox();if(Math.abs(a.y-b.y)>2||b.x<=a.x)throw Error(name+' two-column cards missing');await page.screenshot({path:path.join(__dirname,'../dist/android-'+name+'-preview.png')});}
   await page.getByRole('button',{name:/Arsenal vs Chelsea/}).click();
   const stage=await page.locator('#stage').boundingBox();if(!stage||stage.height<150)throw Error(name+' insufficient player space');
   if(layout==='split'){
    if(!await page.locator('#matches-sidebar').isVisible())throw Error(name+' sidebar disappeared during Watch');
    const panes=await page.evaluate(()=>({sidebar:document.querySelector('#matches-sidebar').getBoundingClientRect().toJSON(),content:document.querySelector('main>section').getBoundingClientRect().toJSON()}));if(panes.content.x<panes.sidebar.right-1||panes.content.width<400)throw Error(name+' split panes overlap');
   }
   await page.getByRole('button',{name:'Settings',exact:true}).click();const menu=await page.locator('#settings-menu').boundingBox();if(!menu||menu.x<0||menu.y<0||menu.x+menu.width>width+1||menu.y+menu.height>height+1)throw Error(name+' settings menu clipped');await page.getByRole('button',{name:'Settings',exact:true}).click();
   if(layout!=='grid')await page.screenshot({path:path.join(__dirname,'../dist/android-'+name+'-preview.png'),animations:'disabled'});
  }
  if(errors.length)throw Error(errors.join('\n'));
  console.log('Responsive Android: phone landscape rail, tablet split panes, portrait card grid, player area and settings bounds passed at six screen sizes');
 }finally{if(browser)await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
