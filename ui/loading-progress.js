// Progress follows real data requests; unknown download sizes stay indeterminate.
(()=>{
 const labels={matches:'matches',scores:'scores',highlights_catalog:'highlights',highlights:'match highlights',official_highlight:'official highlights',myanmar_channels:'Myanmar TV channels',lineups:'line-ups'};
 const box=document.createElement('div');box.id='lazy-load-progress';box.hidden=true;
 const status=document.createElement('div');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const title=document.createElement('strong'),detail=document.createElement('span');status.append(title,detail);
 const bar=document.createElement('progress');bar.max=100;bar.setAttribute('aria-label','Page data loading');box.append(status,bar);document.body.append(box);
 const style=document.createElement('style');style.textContent=`
 #lazy-load-progress{position:fixed;right:16px;bottom:40px;width:300px;max-width:calc(100vw - 32px);padding:11px 13px;border:1px solid #345447;border-radius:10px;background:#14241ff5;color:#dcf8ea;box-shadow:0 6px 22px #0005;z-index:1900;pointer-events:none}
 #lazy-load-progress strong,#lazy-load-progress span{display:block;font-size:12px;line-height:1.5}
 #lazy-load-progress span{font-size:10px;color:#a0bcaf;margin-top:2px}
 #lazy-load-progress progress{display:block;width:100%;height:5px;margin-top:8px;border:0;border-radius:4px;overflow:hidden;accent-color:#46e3aa;background:#2a3f36}
 #lazy-load-progress progress::-webkit-progress-bar{background:#2a3f36;border-radius:4px}
 #lazy-load-progress progress::-webkit-progress-value{background:#46e3aa;border-radius:4px}
 #lazy-load-progress[data-state=warning]{border-color:#8a7043}
 body.phone-tablet #lazy-load-progress{bottom:calc(86px + var(--safe-bottom,0px))}
 body.tv-ui #lazy-load-progress{bottom:18px;right:24px;width:320px}
 body.player-fullscreen #lazy-load-progress{display:none!important}
 `;document.head.append(style);
 const active=new Map();let serial=0,completed=0,failed=0,settleTimer,hideTimer;
 function update(){
  const requests=[...active.values()];box.hidden=false;box.dataset.state='loading';bar.removeAttribute('value');bar.setAttribute('aria-busy','true');
  title.textContent='Loading '+requests[requests.length-1]+'…';
  detail.textContent=completed+' completed · '+requests.length+' loading'+(failed?' · '+failed+' unavailable':'');
 }
 window.kayTrackDataRequest=function(command,promise,args={}){
  if(!labels[command])return promise;
  clearTimeout(settleTimer);clearTimeout(hideTimer);
  if(!active.size&&box.hidden){completed=0;failed=0;}
  const id=++serial;active.set(id,labels[command]+(command==='scores'&&['ESPN','FotMob'].includes(args.source)?' · '+args.source:''));update();
  let unsuccessful=false;
  return promise.then(result=>{unsuccessful=!!(result?.partial||result?.errors?.length);return result;},error=>{unsuccessful=true;throw error;}).finally(()=>{
   active.delete(id);completed++;if(unsuccessful)failed++;
   if(active.size){update();return;}
   // Adjacent stages (matches, then score providers) remain one visible load.
   settleTimer=setTimeout(()=>{
    if(active.size)return;
    bar.value=100;bar.setAttribute('aria-busy','false');box.dataset.state=failed?'warning':'complete';
    title.textContent=failed?'Some data could not be loaded':'Data loaded';
    detail.textContent=completed+' requests completed'+(failed?' · '+failed+' unavailable · Try Refresh':'');
    hideTimer=setTimeout(()=>{box.hidden=true;},failed?4500:1400);
   },200);
  });
 };
})();
