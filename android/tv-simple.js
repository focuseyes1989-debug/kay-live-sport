(()=>{
 let lastBack=0,lastCard=null;
 document.querySelector('header').insertBefore($('mobile-tabs'),$('settings-menu-button'));
 $('search').closest('.search-wrap').hidden=true;
 const updateOnly=node('div');updateOnly.id='tv-update-only';
 const update=$('check-update');update.textContent='Update';updateOnly.append(update);
 $('settings-menu').append(updateOnly);
 window.kayTvKeyboardHidden=()=>false;
 const exit=node('dialog');exit.id='tv-simple-exit';
 exit.innerHTML='<h2>Exit KAY LIVE SPORT TV?</h2><p>Press Back once more to exit.</p><div class="dialog-actions"><button type="button" id="tv-simple-cancel">Cancel</button><button type="button" id="tv-simple-confirm">Exit</button></div>';
 document.body.append(exit);
 let exiting=false;
 async function exitApp(){
  if(exiting)return;exiting=true;
  try{await invoke('mobile_exit',{confirmed:true});}
  catch{exit.close();exiting=false;}
 }
 $('tv-simple-cancel').onclick=()=>{exit.close();lastBack=0;$('mobile-matches').focus();};
 $('tv-simple-confirm').onclick=exitApp;
 const phoneBack=window.kayPhoneBack;
 // Android's native callback tries kayPhoneBack before kayTvBack.
 window.kayPhoneBack=undefined;
 window.kayTvBack=()=>{
  if(exit.open){exitApp();return true;}
  const dialog=document.querySelector('dialog[open]');
  if(dialog){dialog.close();return true;}
  if(window.kayPopoverOpen($('settings-menu'))){$('settings-menu').hidePopover();$('settings-menu-button').focus();lastBack=0;return true;}
  if(phoneBack()){lastBack=0;return true;}
  const now=Date.now();
  if(lastBack&&now-lastBack<1600){exit.showModal();$('tv-simple-cancel').focus();}
  else $('mobile-matches').focus();
  lastBack=now;
  return true;
 };
 document.addEventListener('focusin',event=>{if(event.target.matches('.card'))lastCard=event.target.dataset.fixtureId;});
 const baseRender=render;
 render=function(...args){
  const owned=$('list').contains(document.activeElement),scroll=$('matches-sidebar').scrollTop;
  const result=baseRender(...args);
  if(owned){$('matches-sidebar').scrollTop=scroll;Array.from($('list').querySelectorAll('.card')).find(card=>card.dataset.fixtureId===lastCard)?.focus({preventScroll:true});}
  return result;
 };
 document.addEventListener('keydown',event=>{
  const active=document.activeElement;
  if(['Escape','BrowserBack'].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)window.kayTvBack();return;}
  const ok=['Enter','Accept','Select'].includes(event.key)||event.keyCode===23;
  if(ok&&active?.matches('button,summary')){event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)active.click();return;}
  if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))return;
  if(active?.matches('select,input[type=range]'))return;
  if((active?.id==='mobile-matches'&&event.key==='ArrowRight')||(active?.id==='mobile-live'&&event.key==='ArrowLeft')){event.preventDefault();event.stopImmediatePropagation();$(event.key==='ArrowRight'?'mobile-live':'mobile-matches').focus();return;}
  if(event.key==='ArrowUp'&&active?.closest('#list')){event.preventDefault();event.stopImmediatePropagation();$('mobile-matches').focus();return;}
  if(event.key==='ArrowDown'&&active?.closest('#mobile-tabs')){event.preventDefault();event.stopImmediatePropagation();$('list').querySelector('.card')?.focus();return;}
  event.preventDefault();event.stopImmediatePropagation();
  if(document.body.classList.contains('mobile-watch'))showFullscreenControls();
  const scope=document.querySelector('dialog[open]')||(window.kayPopoverOpen($('settings-menu'))?$('settings-menu'):document);
  const items=Array.from(scope.querySelectorAll('button,input,select,summary,a[href]')).filter(el=>!el.disabled&&el.tabIndex!==-1&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
  const r=active?.getBoundingClientRect();
  if(!r||active===document.body){items[0]?.focus();return;}
  const horizontal=['ArrowLeft','ArrowRight'].includes(event.key),sign=['ArrowLeft','ArrowUp'].includes(event.key)?-1:1;
  const next=items.filter(el=>el!==active).map(el=>{const b=el.getBoundingClientRect(),dx=b.x+b.width/2-r.x-r.width/2,dy=b.y+b.height/2-r.y-r.height/2;return {el,forward:(horizontal?dx:dy)*sign,cross:Math.abs(horizontal?dy:dx)};}).filter(v=>v.forward>4).sort((a,b)=>(a.forward+a.cross*4)-(b.forward+b.cross*4))[0]?.el;
  next?.focus();next?.scrollIntoView({block:'nearest',inline:'nearest'});
 },true);
 $('mobile-matches').focus();
})();
