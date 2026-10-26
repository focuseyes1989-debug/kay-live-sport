// Phone loads eagerly: cached fixtures first, parallel network refresh afterwards.
(()=>{
 const KEY='live-sport.phone-fixtures',MAX_AGE=5*60*1000,INTERVAL=30000;
 let pending=null,lastAttempt=0,timer=null,showLoading=true;
 const status=node('p','','phone-data-status');status.id='phone-data-status';status.setAttribute('role','status');
 document.querySelector('.list-heading').after(status);
 const tracked=window.kayTrackDataRequest;
 window.kayTrackDataRequest=function(command,promise,args){
  if(!showLoading&&['matches','scores'].includes(command))return promise;
  return tracked?tracked(command,promise,args):promise;
 };
 // Background updates preserve the fixture being browsed and its scroll position.
 const baseRender=render;
 render=function(...args){
  const list=$('matches-sidebar'),scroll=list.scrollTop,active=document.activeElement;
  const fixture=active?.closest?.('.card')?.dataset.fixtureId;
  const result=baseRender(...args);list.scrollTop=scroll;
  if(fixture){const card=Array.from($('list').querySelectorAll('.card')).find(e=>e.dataset.fixtureId===fixture);card?.focus({preventScroll:true});}
  return result;
 };
 function validRows(rows){return Array.isArray(rows)&&rows.length<=500&&rows.every(m=>m&&['string','number'].includes(typeof m.id)&&typeof m.home==='string'&&typeof m.away==='string'&&Array.isArray(m.channels));}
 try{
  const text=localStorage.getItem(KEY);
  if(text&&text.length<=1500000){
   const cached=JSON.parse(text),age=Date.now()-cached.savedAt;
   if(cached.version===1&&age>=0&&age<MAX_AGE&&validRows(cached.matches)){
    matches=cached.matches;render();status.textContent='Saved matches · Updating…';
   }
  }
 }catch{}
 function remember(){try{localStorage.setItem(KEY,JSON.stringify({version:1,savedAt:Date.now(),matches}));}catch{}}
 function schedule(){clearTimeout(timer);if(!document.hidden&&navigator.onLine!==false)timer=setTimeout(()=>refresh(false),INTERVAL);}
 refresh=function(notify=false){
  if(pending)return pending;
  if(document.hidden){schedule();return Promise.resolve({ok:false});}
  if(navigator.onLine===false){status.textContent=matches.length?'Offline · Showing previous matches':'Offline · Connect and tap Refresh';if(notify)showRefreshNotification('error','You are offline. Connect and try Refresh again.');schedule();return Promise.resolve({ok:false});}
  lastAttempt=Date.now();clearTimeout(timer);showLoading=notify||!matches.length;
  $('refresh').disabled=true;$('refresh').setAttribute('aria-busy','true');
  status.textContent=matches.length?'Updating in background…':'Loading matches…';
  // Neither the fixture list nor the faster score source waits for the other.
  const fixtures=rpc('matches').then(rows=>{
   if(!validRows(rows))throw Error('Invalid match data');
   matches=rows;applyScores();
   if(selected)selected=matches.find(m=>m.id===selected.id)||selected;
   render();updateSelected();remember();return true;
  });
  const scores=refreshScores();
  pending=(async()=>{
   try{
    const [fixtureResult,scoreResult]=await Promise.allSettled([fixtures,scores]);
    const ok=fixtureResult.status==='fulfilled';
    const partial=scoreResult.status==='rejected'||!scoreResult.value?.ok||scoreResult.value?.partial;
    if(ok){remember();status.textContent='Updated '+timeFormatter.format(new Date())+(partial?' · Some scores delayed':'');observeLiveTransitions();observeGoalChanges();}
    else{status.textContent=matches.length?'Update unavailable · Showing previous matches':'Could not load matches · Tap Refresh';}
    if(notify)showRefreshNotification(ok?(partial?'warning':'success'):'error',ok?(partial?'Matches updated. Some scores are delayed.':'Matches and scores updated.'):'Could not update matches. Please try again.');
    return {ok,partial};
   }finally{pending=null;$('refresh').disabled=false;$('refresh').setAttribute('aria-busy','false');showLoading=true;schedule();}
  })();
  return pending;
 };
 $('refresh').onclick=()=>refresh(true);
 document.addEventListener('visibilitychange',()=>{clearTimeout(timer);if(!document.hidden){if(Date.now()-lastAttempt>=INTERVAL)refresh(false);else schedule();}});
 window.addEventListener('online',()=>refresh(false));
 window.addEventListener('offline',()=>{clearTimeout(timer);status.textContent='Offline · Showing previous matches';});
 // Start once at launch. Tab changes only filter this in-memory list.
 refresh(false);
})();
