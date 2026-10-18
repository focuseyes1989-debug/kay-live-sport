const mobileLandscape=()=>matchMedia('(orientation:landscape) and (max-height:520px)').matches;
function showMobileView(view){document.body.classList.remove('landscape-matches');document.body.classList.toggle('mobile-watch',view==='watch');document.querySelectorAll('#mobile-tabs button').forEach(button=>button.classList.toggle('active',button.id==='mobile-'+view));}
const desktopChoose=choose;
choose=async function(match){showMobileView('watch');return desktopChoose(match);};
$('mobile-matches').onclick=()=>showMobileView('matches');$('mobile-watch').onclick=()=>showMobileView('watch');
$('toggle-sidebar').onclick=()=>{if(mobileLandscape()&&document.body.classList.contains('mobile-watch'))document.body.classList.toggle('landscape-matches');else showMobileView(document.body.classList.contains('mobile-watch')?'matches':'watch');};
$('toggle-sidebar').title='Matches / Watch';$('toggle-sidebar').setAttribute('aria-label','Matches / Watch');
$('app-version').textContent='Android preview 0.1.0';
// Keep internal WebView navigation inside the app. Fullscreen exit restores its controls.
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement){$('stage').classList.remove('is-fullscreen');document.body.classList.remove('player-fullscreen');$('fullscreen').textContent='⛶ Fullscreen';}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshScores();});
showMobileView('matches');

window.showMobileNetworkError=()=>{
 if(matches.length)return;
 const retry=node('button','Retry match list');retry.onclick=()=>refresh();
 $('list').replaceChildren(node('p','Could not load matches. Check your connection and try again.','meta'),retry);
 $('count').textContent='Connection unavailable';
};

const matchSummary=node('div','','mobile-match-summary');matchSummary.id='mobile-match-summary';
document.querySelector('header').insertBefore(matchSummary,$('settings-menu-button'));
const updateMobileSummary=()=>{matchSummary.textContent=selected?displayName(selected.home)+' vs '+displayName(selected.away)+'  ·  '+score(selected):'Choose a match';};
const originalUpdateSelected=updateSelected;
updateSelected=function(){originalUpdateSelected();updateMobileSummary();};updateMobileSummary();
const drawerBackdrop=node('button','','mobile-drawer-backdrop');drawerBackdrop.id='mobile-drawer-backdrop';drawerBackdrop.setAttribute('aria-label','Close match list');drawerBackdrop.onclick=()=>document.body.classList.remove('landscape-matches');document.querySelector('main').append(drawerBackdrop);
let mobileControlsTimer;
function revealMobileControls(){
 clearTimeout(mobileControlsTimer);document.body.classList.remove('landscape-controls-hidden');
 if(!mobileLandscape()||!document.body.classList.contains('mobile-watch'))return;
 mobileControlsTimer=setTimeout(()=>{if(!video.paused&&!document.body.classList.contains('landscape-matches')&&!$('player-controls').querySelector(':focus-visible'))document.body.classList.add('landscape-controls-hidden');},3500);
}
$('stage').addEventListener('pointerdown',revealMobileControls);video.addEventListener('playing',revealMobileControls);video.addEventListener('pause',()=>{clearTimeout(mobileControlsTimer);document.body.classList.remove('landscape-controls-hidden');});
new MutationObserver(()=>document.body.classList.toggle('mobile-stream-playing',$('message').textContent.startsWith('● Playing'))).observe($('message'),{childList:true,subtree:true,characterData:true});
matchMedia('(orientation:landscape) and (max-height:520px)').addEventListener('change',()=>{document.body.classList.remove('landscape-matches');revealMobileControls();});

// Landscape taps reveal controls without interrupting the stream.
video.removeEventListener('click',togglePlayback);video.addEventListener('click',()=>{if(!mobileLandscape())togglePlayback();});
