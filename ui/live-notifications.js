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
  if(!liveNotificationsEnabled)for(const toast of Array.from($('match-live-notifications').children))toast.dismissLiveNotification?.();
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
