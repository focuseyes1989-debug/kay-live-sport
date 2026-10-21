(()=>{
 document.body.classList.add('tv-ui');
 const selector='button,input,select,a[href],[tabindex],iframe',memory={},textInputs=[...document.querySelectorAll('input[type="text"],#search')];
 let editing=null,lastFocus=null,lastMove=0;
 const menuOpen=()=>window.kayPopoverOpen(document.querySelector('#settings-menu'));
 const visible=e=>!e.disabled&&e.tabIndex>=0&&e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('[hidden],[aria-hidden="true"]');
 const zone=e=>e?.closest('dialog[open]')||e?.closest('#settings-menu')||e?.closest('header')||e?.closest('#mobile-tabs')||e?.closest('#matches-sidebar')||e?.closest('main>section');
 function items(root){return [...(root||document).querySelectorAll(selector)].filter(visible);}
 function focusKey(e){const card=e?.closest('.card,.catalog-card');return card?'card:'+(card.getAttribute('aria-label')||'').split(',')[0]:e?.id||null;}
 function focus(e){if(!e||!visible(e))return;e.focus({preventScroll:true});e.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});}
 function keyboard(enabled){invoke('mobile_keyboard',{enabled}).catch(()=>{});}
 function endEdit(){if(!editing)return false;const input=editing;editing=null;input.readOnly=true;input.setAttribute('inputmode','none');input.classList.remove('tv-editing');input.blur();keyboard(false);focus(input);return true;}
 window.kayTvKeyboardHidden=()=>endEdit();
 function beginEdit(input){if(editing===input)return;endEdit();input.blur();editing=input;input.readOnly=false;input.setAttribute('inputmode','text');input.classList.add('tv-editing');input.focus({preventScroll:true});keyboard(true);}
 for(const input of textInputs){input.readOnly=true;input.setAttribute('inputmode','none');input.title='Press OK to type · Back to finish';input.addEventListener('click',()=>beginEdit(input));input.addEventListener('blur',()=>{if(editing===input){editing=null;input.readOnly=true;input.setAttribute('inputmode','none');input.classList.remove('tv-editing');keyboard(false);}});}
 document.querySelector('#mobile-search').onclick=()=>{showMobileView('matches');updateMobileNavigation('search');beginEdit(document.querySelector('#search'));};
 document.addEventListener('focusin',event=>{const e=event.target,z=zone(e);if(z)memory[z.id||z.tagName]=e;lastFocus=focusKey(e);});
 function entry(root){const remembered=memory[root?.id||root?.tagName];if(remembered?.isConnected&&visible(remembered))return remembered;return items(root).find(e=>e.matches('.card.active,#channels button.active'))||items(root)[0];}
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
  highlightPanel.classList.toggle('tv-highlight-playing',!!highlightPanel.querySelector('iframe'));
  if(highlightsFullscreen&&highlightPanel.hidden)highlightFullscreen(false);
 }).observe(highlightPanel,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
 window.kayTvBack=()=>{
  if(highlightsFullscreen){highlightFullscreen(false);focus(document.querySelector('#tv-highlights-fullscreen'));return true;}
  if(endEdit())return true;
  if(document.fullscreenElement){document.exitFullscreen().catch(()=>{});return true;}
  if(document.body.classList.contains('player-fullscreen')){setFullscreen(false);return true;}
  const dialog=document.querySelector('dialog[open]');if(dialog){dialog.close();focus(document.querySelector('#settings-menu-button'));return true;}
  if(menuOpen()){document.querySelector('#settings-menu').hidePopover();focus(document.querySelector('#settings-menu-button'));return true;}
  if(document.activeElement?.tagName==='IFRAME'){focus(document.querySelector('#fullscreen')||document.querySelector('#mobile-watch'));return true;}
  if(document.body.classList.contains('mobile-watch')){showMobileView('matches');focus(entry(document.querySelector('#matches-sidebar')));return true;}
  return false;
 };
 function nearest(active,list,key){const r=active.getBoundingClientRect(),horizontal=key==='ArrowLeft'||key==='ArrowRight',sign=key==='ArrowLeft'||key==='ArrowUp'?-1:1;return list.filter(e=>e!==active).map(e=>{const b=e.getBoundingClientRect(),dx=b.x+b.width/2-r.x-r.width/2,dy=b.y+b.height/2-r.y-r.height/2,forward=(horizontal?dx:dy)*sign,cross=Math.abs(horizontal?dy:dx);return {e,forward,score:forward+cross*4};}).filter(v=>v.forward>4).sort((a,b)=>a.score-b.score)[0]?.e;}
 document.addEventListener('keydown',event=>{
  const active=document.activeElement,ok=event.key==='Enter'||event.key==='NumpadEnter'||event.keyCode===23;
  if(event.key==='Escape'||event.key==='BrowserBack'){if(window.kayTvBack()){event.preventDefault();event.stopImmediatePropagation();}return;}
  if(editing){if(ok){event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)endEdit();}return;}
  if(ok&&textInputs.includes(active)){event.preventDefault();event.stopImmediatePropagation();beginEdit(active);return;}
  if(ok&&active?.tagName==='BUTTON'){event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)active.click();return;}
  if(event.key==='MediaPlayPause'){event.preventDefault();document.querySelector('#toggle-play')?.click();return;}
  if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))return;
  if(active?.matches('select,input[type="range"],input[type="date"]'))return;
  event.preventDefault();event.stopImmediatePropagation();
  if(event.repeat&&Date.now()-lastMove<90)return;lastMove=Date.now();
  const dialog=document.querySelector('dialog[open]'),menu=document.querySelector('#settings-menu'),nav=document.querySelector('#mobile-tabs'),sidebar=document.querySelector('#matches-sidebar'),player=document.querySelector('main>section'),header=document.querySelector('header');
  const root=dialog||(menuOpen()?menu:null),z=zone(active),key=event.key;
  if(root){const list=items(root),i=list.indexOf(active),next=key==='ArrowDown'?list[i+1]:key==='ArrowUp'?list[i-1]:nearest(active,list,key);focus(next||list[0]);return;}
  if(!z){focus(entry(nav));return;}
  if(z===nav){const list=items(nav),i=list.indexOf(active);if(key==='ArrowLeft'||key==='ArrowRight')focus(list[(i+(key==='ArrowRight'?1:list.length-1))%list.length]);else if(key==='ArrowUp')focus(entry(active.id==='mobile-watch'?player:sidebar));return;}
  if(z===header){if(key==='ArrowDown')focus(entry(active.closest('.search-wrap')?sidebar:player));else focus(nearest(active,items(header),key));return;}
  if(z===sidebar){const list=items(sidebar),i=list.indexOf(active);if(key==='ArrowRight'){const sibling=nearest(active,list,key);focus(sibling&&Math.abs(sibling.getBoundingClientRect().y-active.getBoundingClientRect().y)<20?sibling:entry(player));}else if(key==='ArrowLeft')focus(nearest(active,list,key));else focus(list[i+(key==='ArrowDown'?1:-1)]||(key==='ArrowUp'?document.querySelector('#search'):document.querySelector('#mobile-matches')));return;}
  if(z===player){const next=nearest(active,items(player),key);focus(next||(key==='ArrowLeft'?entry(sidebar):key==='ArrowUp'?document.querySelector('#settings-menu-button'):key==='ArrowDown'?document.querySelector('#mobile-watch'):null));}
 },true);
 // Score refreshes replace cards: restore the same fixture instead of jumping to the first one.
 let timer;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>{if(document.activeElement!==document.body)return;const target=items(document).find(e=>focusKey(e)===lastFocus);focus(target||entry(document.querySelector('#matches-sidebar')));},60);}).observe(document.querySelector('main'),{childList:true,subtree:true});
 focus(document.querySelector('#mobile-matches'));
})();
