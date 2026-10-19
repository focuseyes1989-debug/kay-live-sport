(()=>{
 document.body.classList.add('tv-ui');
 document.querySelector('#app-version').textContent='TV Preview - Manual APK updates';document.querySelector('#check-update').hidden=true;
 const help=document.createElement('span');help.id='tv-help';help.textContent='Remote: ↑ ↓ ← → Move · OK Select · Back Return';document.querySelector('header').append(help);
 const selector='button,input,select,a[href],[tabindex],iframe';
 const visible=e=>!e.disabled&&e.tabIndex>=0&&e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('[hidden],.settings-group.collapsed .settings-section-content');
 function controls(){const dialog=document.querySelector('dialog[open]');const pop=document.querySelector('#settings-menu:popover-open');return [...(dialog||pop||document).querySelectorAll(selector)].filter(visible)}
 function focus(e){e?.focus({preventScroll:true});e?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});}
 window.kayTvBack=()=>{
  if(document.fullscreenElement){document.exitFullscreen().catch(()=>{});return true;}
  if(document.body.classList.contains('player-fullscreen')){setFullscreen(false);return true;}
  const dialog=document.querySelector('dialog[open]');if(dialog){dialog.close();focus(document.querySelector('#settings-menu-button'));return true;}
  const menu=document.querySelector('#settings-menu:popover-open');if(menu){menu.hidePopover();focus(document.querySelector('#settings-menu-button'));return true;}
  if(document.activeElement?.tagName==='IFRAME'){focus(document.querySelector('#mobile-matches'));return true;}
  if(document.body.classList.contains('mobile-watch')){showMobileView('matches');focus(document.querySelector('.card')||document.querySelector('#mobile-matches'));return true;}
  return false;
 };
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'||e.key==='BrowserBack'){if(window.kayTvBack()){e.preventDefault();e.stopImmediatePropagation();}return;}
  if(e.key==='MediaPlayPause'){e.preventDefault();document.querySelector('#toggle-play')?.click();return;}
  const active=document.activeElement;
  if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;
  // Preserve native editing, volume and quality controls.
  if(active?.matches('input,select')&&((e.key==='ArrowLeft'||e.key==='ArrowRight')||active.tagName==='SELECT'))return;
  const items=controls();if(!items.length)return;
  e.preventDefault();e.stopImmediatePropagation();
  if(!items.includes(active)){focus(items[0]);return;}
  const r=active.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,horizontal=e.key==='ArrowLeft'||e.key==='ArrowRight',sign=e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:1;
  const ranked=items.filter(el=>el!==active).map(el=>{const b=el.getBoundingClientRect(),dx=b.x+b.width/2-x,dy=b.y+b.height/2-y,forward=(horizontal?dx:dy)*sign,cross=Math.abs(horizontal?dy:dx);return {el,forward,score:forward+cross*3};}).filter(c=>c.forward>4).sort((a,b)=>a.score-b.score);
  if(ranked.length)focus(ranked[0].el);
 },true);
 // Lists are refreshed in the background: retain a usable focus after replacement.
 let focusTimer;new MutationObserver(()=>{clearTimeout(focusTimer);focusTimer=setTimeout(()=>{if(document.activeElement===document.body)focus(document.querySelector('.card')||document.querySelector('#mobile-matches'));},100)}).observe(document.querySelector('main'),{childList:true,subtree:true});
 focus(document.querySelector('#mobile-matches'));
})();
