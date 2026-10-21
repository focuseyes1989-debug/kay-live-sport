// TV has no background data polling. Fresh caches are reused until page entry.
(()=>{
 const TTL=60000;
 let fixturesAt=0,fixturesPending=null,resultsAt=0,resultsDay='',resultsPending=null;
 const refreshFixtures=refresh,refreshRecentScores=refreshResults;
 async function loadFixtures(force=false,notify=false){
  if(fixturesPending)return fixturesPending;
  if(!fixturesAt&&scoreUpdated)fixturesAt=scoreUpdated;
  if(!force&&fixturesAt&&Date.now()-fixturesAt<TTL)return;
  // Startup's initial Matches load is already running; do not duplicate it.
  if($('refresh').disabled)return;
  fixturesPending=(async()=>{
   const before=scoreUpdated;await refreshFixtures(notify);
   if(scoreUpdated>before)fixturesAt=Date.now();
  })();
  try{return await fixturesPending;}finally{fixturesPending=null;}
 }
 refreshResults=function(force=false){
  // Shared setMatchFilter also runs for Highlights; it must not fetch scores there.
  if(resultsContent==='highlights')return Promise.resolve({ok:true});
  if(resultsPending)return resultsPending;
  const day=localDay();
  if(!force&&resultsAt&&resultsDay===day&&Date.now()-resultsAt<TTL){render();return Promise.resolve({ok:true});}
  resultsPending=(async()=>{const result=await refreshRecentScores();if(result?.ok){resultsAt=Date.now();resultsDay=day;}return result;})();
  return resultsPending.finally(()=>{resultsPending=null;});
 };
 for(const id of ['mobile-matches','mobile-live']){
  const button=$(id),open=button.onclick;
  button.onclick=()=>{open();loadFixtures();};
 }
 // Back also re-enters the browse page; it is an entry, not a polling timer.
 const back=window.kayTvBack;
 window.kayTvBack=()=>{const wasWatch=document.body.classList.contains('mobile-watch'),handled=back();
  if(wasWatch&&!document.body.classList.contains('mobile-watch')&&!myanmarPage&&filter!=='results')loadFixtures();
  return handled;
 };
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
})();
