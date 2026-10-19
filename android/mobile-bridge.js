window.kayAndroid=true;
async function invoke(command,args){
 // Older WebViews can inject the native initialization scripts after the page starts.
 for(let attempt=0;attempt<100;attempt++){
  if(window.__TAURI__&&window.__TAURI__.core&&typeof window.__TAURI__.core.invoke==='function')return window.__TAURI__.core.invoke('request',{command,args});
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 throw Error('Android connection did not initialize. Close and reopen the app.');
}
let mobileAudio;
function unlockMobileAudio(){try{if(!mobileAudio)mobileAudio=new AudioContext();if(mobileAudio.state==='suspended')mobileAudio.resume().catch(()=>{});}catch{}}
document.addEventListener('pointerdown',unlockMobileAudio,{passive:true});
async function mobileSound(volume){
 unlockMobileAudio();if(!mobileAudio||mobileAudio.state!=='running')return {played:false};
 const bytes=await (await fetch('/goal-notification.wav')).arrayBuffer();
 const buffer=await mobileAudio.decodeAudioData(bytes),source=mobileAudio.createBufferSource(),gain=mobileAudio.createGain();
 gain.gain.value=Math.max(0,Math.min(100,Number(volume)||0))/100;source.buffer=buffer;source.connect(gain).connect(mobileAudio.destination);source.start();return {played:true};
}
window.kayMobileIpc={postMessage(body){const {id,command,args={}}=JSON.parse(body);(async()=>{
 if(command==='notification_sound')return mobileSound(args.volume);
 if(command==='reset_window')return {reset:true};
 if(command==='fullscreen'){
  const stage=document.getElementById('stage');
  if(args.enabled){try{await stage.requestFullscreen();}catch{/* CSS fallback remains available. */}}
  else if(document.fullscreenElement)await document.exitFullscreen();
  await invoke("mobile_fullscreen",{enabled:!!args.enabled});
  return {enabled:!!args.enabled};
 }
 if(command==='download_update'){
  const unlisten=await window.__TAURI__.event.listen('update-download-progress',event=>window.kayUpdateProgress?.(event.payload));
  try{return await invoke(command,args);}finally{unlisten();}
 }
 try{return await invoke(command,args);}catch(error){
  if(command!=='matches')throw error;
  await new Promise(resolve=>setTimeout(resolve,1500));
 try{return await invoke(command,args);}catch(retryError){
   window.showMobileNetworkError?.();throw retryError;
  }
 }
})().then(data=>window.receive({id,data}),error=>window.receive({id,error:String(error.message||error)}));}};
