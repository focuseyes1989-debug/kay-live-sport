const invoke=(command,args)=>window.__TAURI__.core.invoke('request',{command,args});
let mobileAudio;
function unlockMobileAudio(){try{mobileAudio??=new AudioContext();if(mobileAudio.state==='suspended')mobileAudio.resume().catch(()=>{});}catch{}}
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
  return {enabled:!!args.enabled};
 }
 if(command==='check_update')return {status:'no_release',current:'Android preview 0.1.0'};
 if(['download_update','install_update','open_update_folder'].includes(command))throw Error('Install an Android APK to update this preview.');
 try{return await invoke(command,args);}catch(error){
  if(command!=='matches')throw error;
  await new Promise(resolve=>setTimeout(resolve,1500));
  try{return await invoke(command,args);}catch(retryError){
   window.showMobileNetworkError?.();throw retryError;
  }
 }
})().then(data=>window.receive({id,data}),error=>window.receive({id,error:String(error.message||error)}));}};
