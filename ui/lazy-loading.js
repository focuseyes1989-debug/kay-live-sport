// Page-entry fetching for desktop and Phone/Tablet. TV supplies its own adapter.
(()=>{document.addEventListener('DOMContentLoaded',()=>{
 if(window.kayTvPreview)return;
 const TTL=60000;let fixturesAt=0,fixturePending=null,resultsAt=0,resultsDateKey='',resultsPending=null,pendingDate='';
 const fixtures=refresh,recent=refreshResults,setFilter=setMatchFilter;
 async function loadFixtures(force=false,notify=false){
  if(fixturePending)return fixturePending;
  if(!fixturesAt&&scoreUpdated)fixturesAt=scoreUpdated;
  if(!force&&fixturesAt&&Date.now()-fixturesAt<TTL)return;
  if($('refresh').disabled)return;
  fixturePending=(async()=>{const previous=scoreUpdated;await fixtures(notify);if(scoreUpdated>previous)fixturesAt=Date.now();})();
  try{return await fixturePending;}finally{fixturePending=null;}
 }
 refreshResults=function(force=false){
  if(resultsContent==='highlights')return Promise.resolve({ok:true});
  const date=resultsDate;
  if(resultsPending&&pendingDate===date)return resultsPending;
  if(!force&&resultsAt&&resultsDateKey===date&&Date.now()-resultsAt<TTL){render();return Promise.resolve({ok:true});}
  pendingDate=date;
  const task=(async()=>{const result=await recent();if(result?.ok){resultsAt=Date.now();resultsDateKey=date;}return result;})();
  resultsPending=task;
  return task.finally(()=>{if(resultsPending===task)resultsPending=null;});
 };
 setMatchFilter=function(...args){myanmarPage=false;const result=setFilter(...args);if(filter!=='results')loadFixtures();return result;};
 // The existing filter and mobile-nav handlers call setMatchFilter dynamically.
 $('refresh').onclick=async()=>{
  if(myanmarPage)return refreshMyanmar(true);
  if(filter==='results'&&resultsContent==='highlights')return refreshHighlightsCatalog(true,true);
  if(filter==='results'){
   if($('refresh').disabled)return;
   $('refresh').disabled=true;$('refresh').setAttribute('aria-busy','true');
   try{const result=await refreshResults(true);showRefreshNotification(result?.ok?(result.partial?'warning':'success'):'error',result?.ok?'Scores updated.':'Could not update scores. Please try again.');}
   finally{$('refresh').disabled=false;$('refresh').setAttribute('aria-busy','false');}
   return;
  }
  return loadFixtures(true,true);
 };
 });})();
