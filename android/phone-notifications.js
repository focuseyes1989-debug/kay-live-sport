// Phone-only opt-in; native WorkManager continues without the WebView.
(()=>{
 const KEY='live-sport.phone-system-notifications';
 let enabled=false,busy=false;
 try{enabled=localStorage.getItem(KEY)==='true';}catch{}
 const row=node('div','','settings-row'),label=node('span','Phone live notifications');
 const toggle=node('button','','setting-switch');toggle.type='button';toggle.setAttribute('role','switch');
 const hint=node('small','Background checks about every 15 minutes; Android may delay them.');
 const text=node('div');text.append(label,hint);row.append(text,toggle);
 text.style.display='grid';text.style.gap='4px';hint.style.fontSize='10px';hint.style.opacity='.7';
 document.querySelector('#notifications-content .settings-section-inner').prepend(row);
 function update(){toggle.setAttribute('aria-checked',String(enabled));toggle.setAttribute('aria-pressed',String(enabled));toggle.setAttribute('aria-label','Phone live notifications');}
 async function sync(){
  const fixtures=matches.filter(m=>m.sport==='1').map(m=>({key:liveFixtureKey(m),home:m.home,away:m.away,live:!!m.live,finished:!!m.finished}));
  const result=await rpc('phone_notifications',{enabled,fixtures:JSON.stringify(fixtures)});
  hint.textContent=enabled&&result?.granted===false?'Allow notifications in Android Settings.':'Background checks about every 15 minutes; Android may delay them.';
 }
 row.onclick=async()=>{
  if(busy)return;busy=true;toggle.disabled=true;
  enabled=!enabled;update();
  try{
   if(enabled)await rpc('phone_notification_permission',{});
   await sync();try{localStorage.setItem(KEY,String(enabled));}catch{}
  }catch{enabled=!enabled;update();hint.textContent='Could not save notifications. Tap to try again.';}
  finally{busy=false;toggle.disabled=false;}
 };
 update();sync().catch(()=>{hint.textContent='Notification connection unavailable. Reopen the app to retry.';});
 const observe=observeLiveTransitions;
 observeLiveTransitions=function(...args){const result=observe(...args);if(enabled)sync().catch(()=>{});return result;};
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync().catch(()=>{});});
})();
