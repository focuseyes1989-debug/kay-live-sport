// Phone edition: one fixture page and direct immersive playback.
(()=>{
 document.body.classList.add('phone-edition');
 // Phone has no league filter. Ignore an old selection without changing Tablet preferences.
 matchLeague='';
 const themeRow=node('div','','phone-theme-row');
 themeRow.append(node('span','Theme'));
 const themeButtons=node('div','','phone-theme-buttons');themeButtons.setAttribute('role','group');themeButtons.setAttribute('aria-label','Theme');
 function applyTheme(theme){
  document.documentElement.dataset.phoneTheme=theme;
  for(const button of themeButtons.children)button.setAttribute('aria-pressed',String(button.dataset.theme===theme));
 }
 for(const theme of ['light','dark']){
  const button=node('button',theme==='light'?'Light':'Dark');button.type='button';button.dataset.theme=theme;
  button.onclick=()=>{applyTheme(theme);try{localStorage.setItem('live-sport.phone-theme',theme);}catch{}};
  themeButtons.append(button);
 }
 themeRow.append(themeButtons);document.querySelector('#appearance-content .settings-section-inner').prepend(themeRow);
 applyTheme(document.documentElement.dataset.phoneTheme==='dark'?'dark':'light');
 // Always open on the fixture list; keep preferences, not the last playback screen.
 restoreLastPlayback=function(){startupPlaybackChecked=true;};
 setMatchFilter('all');
 showMobileView('matches');
 const tabs=$('mobile-tabs');
 $('matches-sidebar').insertBefore(tabs,$('matches-sidebar').firstChild);
 $('mobile-matches').querySelector('span').textContent='Matches';
 const liveLabel=$('mobile-live').querySelector('.nav-live-label');
 if(liveLabel)liveLabel.textContent='● LIVE';
 const back=node('button','‹ Back','phone-player-back');back.id='phone-player-back';
 back.type='button';back.setAttribute('aria-label','Back to matches');
 const playerOptions=node('div','','phone-player-options');
 playerOptions.append(back,$('channels'),$('try-stream'),$('retry'));
 $('stage').append(playerOptions);
 let lastFixtureId=null,leaving=false;
 const originalChoose=choose;
 choose=function(match,...args){
  lastFixtureId=match.id;
  showMobileView('watch');
  // Start fullscreen during the tap, before asynchronous stream resolution.
  const entering=setFullscreen(true);
  // A scheduled listing can already have an active stream. Try it on the tap.
  if(!match.live&&!match.finished&&match.channels?.length)args[2]=true;
  const result=originalChoose(match,...args);
  entering.catch(()=>{});
  return result;
 };
 async function returnToMatches(){
  if(leaving)return;leaving=true;
  try{
   // Invalidate pending playback and recovery before showing the list.
   ++playToken;stop();wantPlayback=false;
   while(fullscreenBusy)await new Promise(resolve=>setTimeout(resolve,25));
   await setFullscreen(false);
   document.body.classList.remove('player-fullscreen');$('stage').classList.remove('is-fullscreen');
   showMobileView('matches');
   const card=Array.from($('list').querySelectorAll('.card')).find(e=>e.dataset.fixtureId===String(lastFixtureId));
   card?.focus({preventScroll:true});
  }finally{leaving=false;}
 }
 back.onclick=returnToMatches;
 window.kayPhoneBack=()=>{
  if(document.body.classList.contains('mobile-watch')||$('stage').classList.contains('is-fullscreen')){returnToMatches();return true;}
  if($('settings-menu-button').getAttribute('aria-expanded')==='true'){$('settings-menu-button').click();return true;}
  return false;
 };
 document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&document.body.classList.contains('mobile-watch')&&!leaving)returnToMatches();});
 const fullscreenBeforePhone=setFullscreen;
 setFullscreen=async function(enabled){
  if(!enabled&&document.body.classList.contains('mobile-watch')&&!leaving)return returnToMatches();
  return fullscreenBeforePhone(enabled);
 };
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&window.kayPhoneBack()){event.preventDefault();}});
})();
