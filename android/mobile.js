const mobileLandscape=()=>matchMedia('(orientation:landscape) and (max-height:520px)').matches;
function showMobileView(view){document.body.classList.remove('landscape-matches');document.body.classList.toggle('mobile-watch',view==='watch');if(view==='watch')updateMobileSummary();updateMobileNavigation(view==='watch'?'watch':(document.querySelector('.filters .active')?.dataset.filter==='live'?'live':document.querySelector('.filters .active')?.dataset.filter==='results'?'results':'matches'));}
const desktopChoose=choose;
choose=async function(...args){showMobileView('watch');return desktopChoose(...args);};
$('mobile-matches').onclick=()=>showMobileView('matches');$('mobile-watch').onclick=()=>showMobileView('watch');
$('toggle-sidebar').onclick=()=>{if(mobileLandscape()&&document.body.classList.contains('mobile-watch'))document.body.classList.toggle('landscape-matches');else showMobileView(document.body.classList.contains('mobile-watch')?'matches':'watch');};
$('toggle-sidebar').title='Matches / Watch';$('toggle-sidebar').setAttribute('aria-label','Matches / Watch');
$('app-version').textContent='Android';
// Keep internal WebView navigation inside the app. Fullscreen exit restores its controls.
document.addEventListener('fullscreenchange',()=>{
 const enabled=!!document.fullscreenElement;
 // Includes fullscreen initiated inside the cross-origin YouTube iframe.
 invoke('mobile_fullscreen',{enabled}).catch(()=>{});
 if(!enabled){$('stage').classList.remove('is-fullscreen');document.body.classList.remove('player-fullscreen');$('fullscreen').textContent='⛶ Fullscreen';}
});

showMobileView('matches');

window.showMobileNetworkError=()=>{
 if(matches.length)return;
 const retry=node('button','Retry match list');retry.onclick=()=>refresh();
 $('list').replaceChildren(node('p','Could not load matches. Check your connection and try again.','meta'),retry);
 $('count').textContent='Connection unavailable';
};

const matchSummary=node('div','','mobile-match-summary');matchSummary.id='mobile-match-summary';
document.querySelector('header').insertBefore(matchSummary,$('settings-menu-button'));
function updateMobileSummary(){matchSummary.textContent=typeof catalogSelection!=='undefined'&&catalogSelection?catalogSelection.title:selected?displayName(selected.home)+' vs '+displayName(selected.away)+'  ·  '+score(selected):'Choose a match';}
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

// Fullscreen scaling keeps the picture proportional in both modes.
const fitFillControls=document.createElement('div');
fitFillControls.id='mobile-fit-fill';fitFillControls.setAttribute('role','group');fitFillControls.setAttribute('aria-label','Fullscreen video size');
function setMobileVideoFit(mode){
 const fill=mode==='fill';$('stage').classList.toggle('video-fill',fill);
 try{localStorage.setItem('live-sport.video-fit',fill?'fill':'fit');}catch{}
 for(const button of fitFillControls.children)button.setAttribute('aria-pressed',String(button.dataset.fit===(fill?'fill':'fit')));
}
for(const mode of ['fit','fill']){
 const button=document.createElement('button');button.type='button';button.textContent=mode==='fit'?'Fit':'Fill';button.dataset.fit=mode;
 button.title=mode==='fit'?'Fit: show the entire video':'Fill: fill the screen and crop the edges';button.onclick=()=>{setMobileVideoFit(mode);revealMobileControls();};fitFillControls.append(button);
}
$('fullscreen').before(fitFillControls);
let savedVideoFit='fit';
try{if(localStorage.getItem('live-sport.video-fit')==='fill')savedVideoFit='fill';}catch{}
setMobileVideoFit(savedVideoFit);

function updateMobileNavigation(view){
 document.querySelectorAll('#mobile-tabs button').forEach(button=>{const active=button.id==='mobile-'+view;button.classList.toggle('active',active);if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
}
$('mobile-matches').onclick=()=>{document.querySelector('[data-filter="all"]').click();showMobileView('matches');};
$('mobile-live').onclick=()=>{document.querySelector('[data-filter="live"]').click();showMobileView('matches');};
$('mobile-results').onclick=()=>{document.querySelector('[data-filter="results"]').click();showMobileView('matches');};
if($('mobile-search'))$('mobile-search').onclick=()=>{showMobileView('matches');updateMobileNavigation('search');$('search').focus();};
new MutationObserver(()=>{if(!document.body.classList.contains('mobile-watch')&&document.activeElement!==$('search'))showMobileView('matches');}).observe(document.querySelector('.filters'),{subtree:true,attributes:true,attributeFilter:['class']});

const liveNavigationLabel=document.createElement('strong');liveNavigationLabel.className='nav-live-label';liveNavigationLabel.textContent='LIVE';liveNavigationLabel.setAttribute('aria-hidden','true');$('mobile-live').querySelector('svg').replaceWith(liveNavigationLabel);
