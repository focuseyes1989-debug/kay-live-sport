const {chromium}=require('@playwright/test'),fs=require('fs'),path=require('path');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:320,height:180},deviceScaleFactor:1});
  const art='data:image/png;base64,'+fs.readFileSync(path.join(__dirname,'assets/app-icon.png')).toString('base64');
  // Keep all branding within the central square, even if a launcher crops 16:9.
  await page.setContent(`<style>html,body{margin:0;width:320px;height:180px;background:#091b17}body{display:flex;align-items:center;justify-content:center}img{width:156px;height:156px;object-fit:contain}</style><img src="${art}">`);
  await page.locator('img').evaluate(e=>e.decode());
  const res=path.join(__dirname,'src-tauri/gen/android/app/src/main/res');
  fs.mkdirSync(path.join(res,'drawable-nodpi'),{recursive:true});
  await page.screenshot({path:path.join(res,'drawable-nodpi/tv_banner.png')});
  await page.screenshot({path:path.join(__dirname,'../dist/tv-launcher-banner-preview.png')});
  // Simulate a center-cropped square launcher tile for visual verification.
  await page.screenshot({path:path.join(__dirname,'../dist/tv-launcher-square-preview.png'),clip:{x:70,y:0,width:180,height:180}});
 }finally{await browser.close()}
 console.log('TV banner generated with centered square-safe artwork');
})().catch(e=>{console.error(e);process.exit(1)});
