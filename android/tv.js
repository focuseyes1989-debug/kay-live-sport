(()=>{
 document.body.classList.add('tv-ui');
 const tvNav=document.querySelector('#mobile-tabs');tvNav.setAttribute('aria-label','TV navigation');
 const settingsMenu=document.querySelector('#settings-menu'),headerSettings=document.querySelector('#settings-menu-button');
 const settingsPage=document.createElement('section');settingsPage.id='tv-settings-page';settingsPage.hidden=true;settingsPage.setAttribute('aria-label','Settings');
 const pageHeading=document.createElement('h2');pageHeading.textContent='Settings';settingsPage.append(pageHeading);document.body.append(settingsPage);
 settingsMenu.removeAttribute('popover');settingsMenu.classList.remove('kay-popover-open');settingsPage.append(settingsMenu);
 function closeSettings(){settingsPage.hidden=true;document.body.classList.remove('tv-settings-page');updateMobileNavigation(document.body.classList.contains('mobile-watch')?'watch':'matches');}
 function openSettings(){endEdit();settingsPage.hidden=false;document.body.classList.add('tv-settings-page');updateMobileNavigation('settings');focus(entry(settingsPage));}
 // Shared dialog actions close popovers; a Settings page stays underneath dialogs.
 settingsMenu.showPopover=openSettings;settingsMenu.hidePopover=()=>{};
 const settingsNav=document.createElement('button');settingsNav.id='tv-settings';settingsNav.type='button';settingsNav.innerHTML=headerSettings.innerHTML+'<span>Settings</span>';settingsNav.setAttribute('aria-label','Settings');settingsNav.onclick=openSettings;tvNav.append(settingsNav);
 for(const [id,label,content] of [['tv-scores','Scores','scores'],['tv-highlights','Highlights','highlights']]){
  const button=document.createElement('button');button.id=id;button.type='button';button.innerHTML=document.querySelector(content==='highlights'?'#mobile-watch svg':'#mobile-results svg').outerHTML+'<span>'+label+'</span>';button.setAttribute('aria-label',label);
  button.onclick=()=>{closeSettings();resultsContent=content;setMatchFilter('results',true);showMobileView('matches');render();if(content==='highlights')refreshHighlightsCatalog();updateMobileNavigation('matches');updateTvHeading();focus(entry(document.querySelector('#matches-sidebar')));};tvNav.insertBefore(button,document.querySelector('#mobile-watch'));
 }
 const baseNavigation=updateMobileNavigation;
 updateMobileNavigation=function(view){baseNavigation(view);const id=!settingsPage.hidden?'tv-settings':document.body.classList.contains('mobile-watch')?'mobile-watch':filter==='results'?(resultsContent==='highlights'?'tv-highlights':'tv-scores'):filter==='live'?'mobile-live':'mobile-matches';
  for(const button of tvNav.children){const active=button.id===id;button.classList.toggle('active',active);if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}
 };
 for(const id of ['mobile-matches','mobile-live','mobile-watch']){const button=document.querySelector('#'+id),handler=button.onclick;button.onclick=()=>{closeSettings();handler();updateTvHeading();updateMobileNavigation(id==='mobile-watch'?'watch':'matches');};}
 // Hidden league controls must not retain an invisible filter on TV.
 matchLeague='';resultsLeague='';catalogDay='both';resultsDate=localDay();
 // TV has no date/league filter controls: show recent scores automatically.
 refreshResults=async function(){
  const token=++resultsToken,today=localDay(),yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);
  const dates=[today,localDay(yesterday.getTime())];resultsDate=today;
  $('results-status').textContent='Loading recent scores…';
  try{
   const response=await rpc('scores',{dates:[...new Set(dates.flatMap(resultsQueryDates))]});
   if(token!==resultsToken)return {ok:false};
   resultMatches=dates.flatMap(date=>historyMatches(response,date));updateResultsLeagues();
   $('results-status').textContent=response.errors?.length?'Some score sources unavailable':resultMatches.length+' scores · Today / Yesterday';
   if(selected?.id?.startsWith('result-')){selected=resultMatches.find(m=>m.id===selected.id)||selected;updateSelected();}
   render();return {ok:true,partial:!!response.errors?.length};
  }catch(e){if(token===resultsToken){$('results-status').textContent='Could not load scores. Press Refresh to retry.';render();}return {ok:false};}
 };
 render();
 document.querySelector('#reset-dialog').onclose=()=>focus(document.querySelector('#reset-settings'));
 const originalTvView=showMobileView;
 showMobileView=function(view){const changed=document.body.classList.contains('mobile-watch')!==(view==='watch');originalTvView(view);if(changed&&view==='watch')requestAnimationFrame(()=>focus(entry(document.querySelector('main>section'))));};

 const selector='button,input,select,a[href],[tabindex],iframe',memory={},textInputs=[...document.querySelectorAll('input[type="text"],#search')];
 let editing=null,lastFocus=null,lastMove=0,lastBack=0;
 const exitDialog=document.createElement('dialog');exitDialog.id='tv-exit-dialog';exitDialog.setAttribute('aria-labelledby','tv-exit-title');
 exitDialog.innerHTML='<h2 id="tv-exit-title">Exit KAY LIVE SPORT TV?</h2><p>Press Back once more to exit, or choose Cancel to keep watching.</p><p id="tv-exit-error" role="status"></p><div class="dialog-actions"><button id="tv-exit-cancel" type="button">Cancel</button><button id="tv-exit-confirm" type="button">Exit</button></div>';document.body.append(exitDialog);
 let exitRequested=false,exitFocus=null;
 function cancelExit(){exitDialog.close();lastBack=0;focus(exitFocus);}
 async function exitApp(){if(exitRequested)return;exitRequested=true;
  ++playToken;wantPlayback=false;stop();
  try{await invoke('mobile_exit',{confirmed:true});}
  catch(error){exitRequested=false;document.querySelector('#tv-exit-error').textContent='Could not exit. Please try again.';}
 }
 document.querySelector('#tv-exit-cancel').onclick=cancelExit;document.querySelector('#tv-exit-confirm').onclick=exitApp;
 exitDialog.addEventListener('cancel',event=>{event.preventDefault();exitApp();});
 function backSequence(){const now=Date.now(),twice=lastBack>0&&now-lastBack<=1600;lastBack=now;if(twice){exitFocus=document.activeElement;document.querySelector('#tv-exit-error').textContent='';exitDialog.showModal();focus(document.querySelector('#tv-exit-cancel'));return true;}return false;}
 // TV sound is controlled by the television/receiver, without changing phone audio preferences.
 persistAudioPreferences=()=>{};video.volume=1;video.muted=false;
 const tvStage=document.querySelector('#stage');tvStage.tabIndex=0;tvStage.setAttribute('aria-label','Video player. Press OK for fullscreen');
 tvStage.addEventListener('click',event=>{if(event.target.closest('#player-controls,#recovery-bar'))return;event.preventDefault();event.stopImmediatePropagation();if(!tvStage.classList.contains('is-fullscreen'))setFullscreen(true);else if(typeof showFullscreenControls==='function')showFullscreenControls();},true);
 tvStage.addEventListener('dblclick',event=>{event.preventDefault();event.stopImmediatePropagation();},true);
 document.addEventListener('pointerdown',()=>{lastBack=0;},{passive:true});
 const menuOpen=()=>false;
 const visible=e=>!e.disabled&&e.tabIndex>=0&&e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('[hidden],[aria-hidden="true"]');
 const zone=e=>e?.closest('dialog[open]')||e?.closest('#tv-settings-page')||e?.closest('header')||e?.closest('#mobile-tabs')||e?.closest('#matches-sidebar')||e?.closest('main>section');
 function items(root){return [...(root||document).querySelectorAll(selector)].filter(visible);}
 function focusKey(e){const card=e?.closest('.card,.catalog-card');return card?'card:'+(card.getAttribute('aria-label')||'').split(',')[0]:e?.id||null;}
 function focus(e){if(!e||!visible(e))return;e.focus({preventScroll:true});e.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});}
 function keyboard(enabled){invoke('mobile_keyboard',{enabled}).catch(()=>{});}
 function endEdit(){if(!editing)return false;const input=editing;editing=null;input.readOnly=true;input.setAttribute('inputmode','none');input.classList.remove('tv-editing');input.blur();keyboard(false);focus(input);return true;}
 window.kayTvKeyboardHidden=()=>endEdit();
 function beginEdit(input){if(editing===input)return;endEdit();input.blur();editing=input;input.readOnly=false;input.setAttribute('inputmode','text');input.classList.add('tv-editing');input.focus({preventScroll:true});keyboard(true);}
 for(const input of textInputs){input.readOnly=true;input.setAttribute('inputmode','none');input.title='Press OK to type Â· Back to finish';input.addEventListener('click',()=>beginEdit(input));input.addEventListener('blur',()=>{if(editing===input){editing=null;input.readOnly=true;input.setAttribute('inputmode','none');input.classList.remove('tv-editing');keyboard(false);}});}
 document.querySelector('#mobile-search').onclick=()=>{showMobileView('matches');updateMobileNavigation('search');beginEdit(document.querySelector('#search'));};
 document.addEventListener('focusin',event=>{const e=event.target,z=zone(e);if(z)memory[z.id||z.tagName]=e;lastFocus=focusKey(e);});
 function entry(root){const remembered=memory[root?.id||root?.tagName];if(remembered?.isConnected&&visible(remembered))return remembered;return items(root).find(e=>e.matches('.card.active,#channels button.active'))||items(root).find(e=>e.matches('.card,.catalog-card'))||items(root)[0];}
 let highlightsFullscreen=false;
 function highlightFullscreen(enabled){
  highlightsFullscreen=enabled;document.body.classList.toggle('tv-highlights-fullscreen',enabled);
  const button=document.querySelector('#tv-highlights-fullscreen');if(button){button.textContent=enabled?'Exit fullscreen':'Fullscreen';button.setAttribute('aria-pressed',String(enabled));}
  invoke('mobile_fullscreen',{enabled}).catch(()=>{});
 }
 const renderTvHighlights=renderHighlights;
 renderHighlights=function(...args){
  if(highlightsFullscreen)highlightFullscreen(false);
  renderTvHighlights(...args);
  if(!document.querySelector('#highlights-panel .highlights-card'))return;
  const button=document.createElement('button');button.id='tv-highlights-fullscreen';button.type='button';button.textContent='Fullscreen';button.setAttribute('aria-pressed','false');button.onclick=()=>{if(!document.querySelector('.highlights-frame'))document.querySelector('.highlights-actions button')?.click();highlightFullscreen(!highlightsFullscreen);};
  document.querySelector('.highlights-heading').append(button);
 };
 const highlightPanel=document.querySelector('#highlights-panel');
 new MutationObserver(()=>{
  const frame=highlightPanel.querySelector('iframe');
  highlightPanel.classList.toggle('tv-highlight-playing',!!frame);
  if(frame&&!highlightPanel.querySelector('#tv-highlight-expand')){
   const expand=document.createElement('button');expand.id='tv-highlight-expand';expand.type='button';expand.setAttribute('aria-label','Open highlights fullscreen');expand.innerHTML='<span>Fullscreen</span>';expand.onclick=()=>highlightFullscreen(true);frame.parentElement.append(expand);
  }
  if(highlightsFullscreen&&highlightPanel.hidden)highlightFullscreen(false);
 }).observe(highlightPanel,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
 window.kayTvBack=()=>{
  if(exitDialog.open){exitApp();return true;}
  if(highlightsFullscreen){lastBack=0;highlightFullscreen(false);focus(document.querySelector('#tv-highlights-fullscreen'));return true;}
  if(endEdit()){lastBack=0;return true;}
  if(document.fullscreenElement){lastBack=0;document.exitFullscreen().catch(()=>{});return true;}
  if(document.body.classList.contains('player-fullscreen')){lastBack=0;setFullscreen(false);return true;}
  const dialog=document.querySelector('dialog[open]');if(dialog){dialog.close();focus(!settingsPage.hidden?entry(settingsPage):document.querySelector('#search'));return true;}
  if(backSequence())return true;
  if(!settingsPage.hidden){closeSettings();focus(document.querySelector('#tv-settings'));return true;}
  if(menuOpen()){document.querySelector('#settings-menu').hidePopover();focus(document.querySelector('#settings-menu-button'));return true;}
  if(document.activeElement?.tagName==='IFRAME'){focus(document.querySelector('#tv-highlights-fullscreen')||document.querySelector('#fullscreen')||document.querySelector('#mobile-watch'));return true;}
  if(document.body.classList.contains('mobile-watch')){showMobileView('matches');focus(entry(document.querySelector('#matches-sidebar')));return true;}
  return true;
 };
 function nearest(active,list,key){const r=active.getBoundingClientRect(),horizontal=key==='ArrowLeft'||key==='ArrowRight',sign=key==='ArrowLeft'||key==='ArrowUp'?-1:1;return list.filter(e=>e!==active).map(e=>{const b=e.getBoundingClientRect(),dx=b.x+b.width/2-r.x-r.width/2,dy=b.y+b.height/2-r.y-r.height/2,forward=(horizontal?dx:dy)*sign,cross=Math.abs(horizontal?dy:dx);return {e,forward,score:forward+cross*4};}).filter(v=>v.forward>4).sort((a,b)=>a.score-b.score)[0]?.e;}
 document.addEventListener('keydown',event=>{
  let active=document.activeElement;const ok=['Enter','NumpadEnter','Accept','Select','DPAD_CENTER'].includes(event.key)||[13,23,66,160].includes(event.keyCode);
  if(event.key==='Escape'||event.key==='BrowserBack'){if(event.repeat){event.preventDefault();return;}if(window.kayTvBack()){event.preventDefault();event.stopImmediatePropagation();}return;}
  lastBack=0;
  if(editing){if(ok){event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)endEdit();}return;}
  if(ok&&(!active||active===document.body)){const remembered=items(document).find(e=>focusKey(e)===lastFocus);if(remembered){focus(remembered);active=remembered;}}
  if(ok&&active?.id==='stage'){event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)setFullscreen(true);return;}
  if(ok&&textInputs.includes(active)){event.preventDefault();event.stopImmediatePropagation();beginEdit(active);return;}
  if(ok&&active?.tagName==='BUTTON'){event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)active.click();return;}
  if(event.key==='MediaPlayPause'){event.preventDefault();document.querySelector('#toggle-play')?.click();return;}
  if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))return;
  if(active?.matches('select,input[type="range"],input[type="date"]')&&['ArrowUp','ArrowDown'].includes(event.key))return;

  event.preventDefault();event.stopImmediatePropagation();
  if(event.repeat&&Date.now()-lastMove<90)return;lastMove=Date.now();
  const dialog=document.querySelector('dialog[open]'),menu=document.querySelector('#settings-menu'),nav=document.querySelector('#mobile-tabs'),sidebar=document.querySelector('#matches-sidebar'),player=document.querySelector('main>section'),header=document.querySelector('header');
  const root=dialog||(menuOpen()?menu:null),z=zone(active),key=event.key;
  if(root){const list=items(root),i=list.indexOf(active),next=key==='ArrowDown'?list[i+1]:key==='ArrowUp'?list[i-1]:nearest(active,list,key);focus(next||list[0]);return;}
  if(!z){focus(entry(nav));return;}
  if(!root&&key==='ArrowLeft'&&z!==nav){focus(entry(nav));return;}
  if(!root&&key==='ArrowRight'&&z===nav){focus(entry(!settingsPage.hidden?settingsPage:document.body.classList.contains('mobile-watch')?player:sidebar));return;}
  if(z===nav){const list=items(nav),i=list.indexOf(active);if(key==='ArrowUp'||key==='ArrowDown')focus(list[Math.max(0,Math.min(list.length-1,i+(key==='ArrowDown'?1:-1)))]);else if(key==='ArrowRight')focus(entry(!settingsPage.hidden?settingsPage:document.body.classList.contains('mobile-watch')?player:sidebar));return;}
  if(z===settingsPage){const next=nearest(active,items(settingsPage),key);focus(next||(key==='ArrowLeft'?document.querySelector('#tv-settings'):null));return;}
  if(z===header){if(key==='ArrowDown')focus(entry(active.closest('.search-wrap')?sidebar:player));else focus(nearest(active,items(header),key));return;}
  if(z===sidebar){const next=nearest(active,items(sidebar),key);focus(next||(key==='ArrowLeft'?entry(nav):key==='ArrowUp'?document.querySelector('#search'):null));return;}
  if(z===player){const next=nearest(active,items(player),key);focus(next||(key==='ArrowLeft'?entry(nav):key==='ArrowUp'?document.querySelector('#search'):key==='ArrowDown'?document.querySelector('#mobile-watch'):null));}
 },true);
 // Score refreshes replace cards: restore the same fixture instead of jumping to the first one.
 let timer;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>{if(document.activeElement!==document.body)return;const target=items(document).find(e=>focusKey(e)===lastFocus);focus(target||entry(document.querySelector('#matches-sidebar')));},60);}).observe(document.querySelector('main'),{childList:true,subtree:true});
 const browseHeading=document.querySelector('.list-heading h2');
 function updateTvHeading(){const current=document.querySelector('.filters .active')?.dataset.filter;document.body.dataset.tvPage=current==='live'?'live':current==='results'?resultsContent:'matches';browseHeading.textContent=current==='live'?'Live now':current==='results'?(resultsContent==='highlights'?'Highlights':'Scores'):'All matches';}
 new MutationObserver(updateTvHeading).observe(document.querySelector('.filters'),{subtree:true,attributes:true,attributeFilter:['class']});updateTvHeading();updateMobileNavigation(document.body.classList.contains('mobile-watch')?'watch':'matches');
 focus(document.querySelector('#mobile-matches'));
})();
