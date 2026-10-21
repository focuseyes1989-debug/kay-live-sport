// Run before shared UI initialization: only Settings-page preferences survive TV startup.
(()=>{
 const retained=new Set([
  'live-sport.kickoff-autoplay','live-sport.live-notifications','live-sport.goal-notifications',
  'live-sport.notification-sound','live-sport.notification-volume','live-sport.refresh-notifications',
  'live-sport.retry-notifications','live-sport.update-notifications','live-sport.animations',
  'live-sport.animation-speed','live-sport.settings-sections','live-sport.time-format'
 ]);
 try{
  for(const key of Object.keys(localStorage)){
   if(key.startsWith('live-sport.')&&!retained.has(key))localStorage.removeItem(key);
  }
 }catch{}
})();
