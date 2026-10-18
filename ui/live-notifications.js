let liveNotificationsEnabled=true;
try{const saved=JSON.parse(localStorage.getItem('live-sport.live-notifications'));if(typeof saved==='boolean')liveNotificationsEnabled=saved;}catch{}
function updateLiveNotificationToggle(){
 const button=$('toggle-live-notifications');
 button.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>';
 button.setAttribute('aria-pressed',String(liveNotificationsEnabled));
 button.title=liveNotificationsEnabled?'Alerts: On · Click to turn off':'Alerts: Off · Click to turn on';
 button.setAttribute('aria-label',button.title);
}
function initializeLiveNotificationToggle(){
 updateLiveNotificationToggle();
 $('toggle-live-notifications').onclick=()=>{
  liveNotificationsEnabled=!liveNotificationsEnabled;
  try{localStorage.setItem('live-sport.live-notifications',JSON.stringify(liveNotificationsEnabled));}catch{}
  if(!liveNotificationsEnabled)for(const toast of Array.from($('match-live-notifications').children)){if(!toast.isGoalNotification)toast.dismissLiveNotification?.();}
  updateLiveNotificationToggle();
 };
}
// Observe confirmed provider states, not the countdown reaching zero.
const liveNotificationStates=new Map();
const liveNotificationSent=new Set();
function liveFixtureKey(match){return [match.sport,match.home,match.away,match.kickoff||match.id].join('|');}
function observeLiveTransitions(){
 for(const match of matches){
  const key=liveFixtureKey(match),previous=liveNotificationStates.get(key);
  if(previous==='upcoming'&&match.live&&!match.finished&&!liveNotificationSent.has(key)){
   liveNotificationSent.add(key);if(liveNotificationsEnabled)showMatchLiveNotification(match,key);
  }
  liveNotificationStates.set(key,match.finished?'finished':match.live?'live':hasKickoffCountdown(match)?'upcoming':'other');
 }
}
function showMatchLiveNotification(match,key){
 const toast=node('div','','match-live-toast');
 const open=node('button','','open-live-match');open.type='button';
 open.append(node('strong','● LIVE NOW'),node('span',displayName(match.home)+' vs '+displayName(match.away)),node('small','Click to watch'));
 const dismiss=node('button','×','dismiss-live-match');dismiss.type='button';dismiss.setAttribute('aria-label','Dismiss live notification');
 const remove=()=>{clearTimeout(timer);toast.remove();};
 toast.dismissLiveNotification=remove;
 open.onclick=()=>{
  const current=matches.find(m=>liveFixtureKey(m)===key);
  remove();
  if(current?.live&&!current.finished)choose(current);
  else $('message').textContent='This match is no longer live. Refresh the match list.';
 };
 dismiss.onclick=remove;toast.append(open,dismiss);
 $('match-live-notifications').append(toast);
 const timer=setTimeout(remove,20000);
}

let goalNotificationsEnabled=true;
try{const saved=JSON.parse(localStorage.getItem('live-sport.goal-notifications'));if(typeof saved==='boolean')goalNotificationsEnabled=saved;}catch{}
const goalStates=new Map(),goalToasts=[];
function initializeGoalNotificationToggle(){
 const button=$('toggle-goal-notifications');
 const update=()=>{button.setAttribute('aria-pressed',String(goalNotificationsEnabled));button.title='Goal notifications: '+(goalNotificationsEnabled?'On':'Off');button.setAttribute('aria-label',button.title);};
 button.onclick=()=>{
  goalNotificationsEnabled=!goalNotificationsEnabled;
  try{localStorage.setItem('live-sport.goal-notifications',JSON.stringify(goalNotificationsEnabled));}catch{}
  if(!goalNotificationsEnabled)for(const toast of [...goalToasts])toast.dismissLiveNotification();
  update();
 };
 update();
}
function observeGoalChanges(){
 const now=Date.now();
 for(const match of matches){
  if(match.sport!=='1'||!/^\d+$/.test(String(match.homeScore))||!/^\d+$/.test(String(match.awayScore)))continue;
  if(match.scoreChecked&&now-match.scoreChecked>60000)continue;
  const key=liveFixtureKey(match),home=Number(match.homeScore),away=Number(match.awayScore),source=match.scoreSource||'Listing';
  const previous=goalStates.get(key),scoreKey=home+':'+away;
  const seen=previous?.seen||new Set();
  if(previous&&previous.live&&match.live&&!match.finished&&previous.source===source&&home>=previous.home&&away>=previous.away&&(home>previous.home||away>previous.away)&&!seen.has(scoreKey)&&goalNotificationsEnabled){
   showGoalNotification(match,key,home>previous.home&&away>previous.away?'Score update':(home>previous.home?displayName(match.home):displayName(match.away))+' scored!');
  }
  seen.add(scoreKey);
  goalStates.set(key,{home,away,source,live:match.live&&!match.finished,seen,at:now});
 }
 for(const [key,state] of goalStates)if(now-state.at>21600000)goalStates.delete(key);
}
function showGoalNotification(match,key,heading){
 const toast=node('div','','match-live-toast goal-toast'),open=node('button','','open-live-match');open.type='button';
 open.append(node('strong','⚽ '+heading),node('span',displayName(match.home)+' '+match.homeScore+' : '+match.awayScore+' '+displayName(match.away)),node('small','Click to watch'));
 const dismiss=node('button','×','dismiss-live-match');dismiss.type='button';dismiss.setAttribute('aria-label','Dismiss goal notification');
 const remove=()=>{clearTimeout(timer);toast.remove();const index=goalToasts.indexOf(toast);if(index>=0)goalToasts.splice(index,1);};
 const timer=setTimeout(remove,20000);toast.dismissLiveNotification=remove;toast.isGoalNotification=true;
 open.onclick=()=>{const current=matches.find(m=>liveFixtureKey(m)===key);remove();if(current?.live&&!current.finished)choose(current);else $('message').textContent='This match is no longer live.';};
 dismiss.onclick=remove;toast.append(open,dismiss);goalToasts.push(toast);
 if(goalToasts.length>5)goalToasts[0].dismissLiveNotification();
 $('match-live-notifications').append(toast);
 playGoalNotificationSound();
}

let notificationSoundEnabled=true,lastGoalSoundAt=0,notificationSoundVolume=100;
try{const saved=JSON.parse(localStorage.getItem('live-sport.notification-volume'));if(typeof saved==='number'&&Number.isFinite(saved))notificationSoundVolume=Math.round(Math.max(0,Math.min(100,saved)));}catch{}
try{const saved=JSON.parse(localStorage.getItem('live-sport.notification-sound'));if(typeof saved==='boolean')notificationSoundEnabled=saved;}catch{}
function initializeNotificationSoundToggle(){
 const slider=$('notification-sound-volume'),value=$('notification-sound-volume-value');
 const updateVolume=()=>{slider.value=String(notificationSoundVolume);value.textContent=notificationSoundVolume+'%';slider.setAttribute('aria-valuetext',notificationSoundVolume+'%');};
 slider.oninput=()=>{const volume=Number(slider.value);if(!Number.isFinite(volume))return;notificationSoundVolume=Math.round(Math.max(0,Math.min(100,volume)));try{localStorage.setItem('live-sport.notification-volume',JSON.stringify(notificationSoundVolume));}catch{}updateVolume();};
 updateVolume();
 const button=$('toggle-notification-sound');
 const test=$('test-notification-sound');
 test.onclick=async event=>{
  event?.stopPropagation?.();
  if(test.disabled)return;
  test.disabled=true;test.setAttribute('aria-busy','true');test.title='Test sound';
  try{await rpc('notification_sound',{volume:notificationSoundVolume});}
  catch{test.title='Could not play sound. Check your Windows audio output.';}
  finally{test.disabled=false;test.setAttribute('aria-busy','false');}
 };

 const update=()=>{$('notification-volume-row').hidden=!notificationSoundEnabled;$('notification-volume-row').inert=!notificationSoundEnabled;test.hidden=!notificationSoundEnabled;test.inert=!notificationSoundEnabled;button.setAttribute('aria-pressed',String(notificationSoundEnabled));button.title='Notification sound: '+(notificationSoundEnabled?'On':'Off');button.setAttribute('aria-label',button.title);};
 button.onclick=()=>{
  notificationSoundEnabled=!notificationSoundEnabled;
  try{localStorage.setItem('live-sport.notification-sound',JSON.stringify(notificationSoundEnabled));}catch{}
  update();
 };
 update();
}
async function playGoalNotificationSound(){
 if(!goalNotificationsEnabled||!notificationSoundEnabled||Date.now()-lastGoalSoundAt<1500)return;
 lastGoalSoundAt=Date.now();
 await playNotificationSound();
}

async function playNotificationSound(){
 if(!notificationSoundEnabled)return;
 try{await rpc('notification_sound',{volume:notificationSoundVolume});}catch{} // Audio errors must not interrupt notifications.
}
