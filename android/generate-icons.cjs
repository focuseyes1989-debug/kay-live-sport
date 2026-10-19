const {chromium}=require('@playwright/test'),fs=require('fs'),path=require('path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true}),page=await browser.newPage({deviceScaleFactor:1});
 const master=path.join(__dirname,'assets/app-icon.png'),source=fs.existsSync(master)?master:path.join(__dirname,'assets/logo.svg');
 const url='data:'+(source.endsWith('.png')?'image/png':'image/svg+xml')+';base64,'+fs.readFileSync(source).toString('base64'),res=path.join(__dirname,'src-tauri/gen/android/app/src/main/res');
 async function render(size,art,file){await page.setViewportSize({width:size,height:size});await page.setContent(`<style>html,body{margin:0;background:transparent}img{position:absolute;left:${(size-art)/2}px;top:${(size-art)/2}px;width:${art}px;height:${art}px}</style><img src="${url}">`);await page.locator('img').evaluate(e=>e.decode());await page.screenshot({path:file,omitBackground:true});}
 for(const [density,scale] of Object.entries({mdpi:1,hdpi:1.5,xhdpi:2,xxhdpi:3,xxxhdpi:4})){
  for(const name of ['ic_launcher.png','ic_launcher_round.png'])await render(Math.round(48*scale),Math.round(48*scale),path.join(res,'mipmap-'+density,name));
  await render(Math.round(108*scale),Math.round(68*scale),path.join(res,'mipmap-'+density,'ic_launcher_foreground.png'));
 }
 await render(512,512,path.join(__dirname,'src-tauri/icons/icon.png'));await render(512,512,path.join(__dirname,'../dist/android-icon-preview.png'));
 await browser.close();console.log('Android icon resources generated from '+path.basename(source));
})().catch(e=>{console.error(e);process.exit(1)});
