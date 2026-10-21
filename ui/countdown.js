function hasKickoffCountdown(match){
 return !match.live&&!match.finished&&Number.isFinite(Number(match.kickoff))&&Number(match.kickoff)>0&&!/postponed|cancelled|abandoned|interrupted|suspended/i.test(match.status||'');
}
function kickoffCountdown(match,now=Date.now()){
 if(!hasKickoffCountdown(match))return '';
 const seconds=Math.ceil((Number(match.kickoff)*1000-now)/1000);
 if(seconds<=0)return 'Awaiting live status';
 const days=Math.floor(seconds/86400),hours=Math.floor(seconds%86400/3600),minutes=Math.floor(seconds%3600/60),secs=seconds%60;
 const clock=[hours,minutes,secs].map(n=>String(n).padStart(2,'0')).join(':');
 return 'Starts in '+(days?days+'d ':'')+clock;
}
function countdownLabel(match){
 const label=node('span',kickoffCountdown(match),'kickoff-countdown');
 label.dataset.countdownId=String(match.id);label.hidden=!label.textContent;return label;
}
const kickoffChecks=new Set();
function tickKickoffCountdowns(){
 const now=Date.now(),byId=new Map(matches.map(m=>[String(m.id),m]));
 document.querySelectorAll('[data-countdown-id]').forEach(label=>{
  const match=byId.get(label.dataset.countdownId);
  label.textContent=match?kickoffCountdown(match,now):'';label.hidden=!label.textContent;
 });
 const due=matches.filter(m=>hasKickoffCountdown(m)&&Number(m.kickoff)*1000<=now&&!kickoffChecks.has(String(m.id)+'|'+m.kickoff));
 // Batch simultaneous kickoffs into one refresh; retain pending work while
 // another refresh is running. Wall-clock time also handles sleep/resume.
 if(!(typeof window!=='undefined'&&window.kayLazyLoading)&&due.length&&!scoreBusy&&!$('refresh').disabled){
  for(const m of due)kickoffChecks.add(String(m.id)+'|'+m.kickoff);
  refresh();
 }
}
