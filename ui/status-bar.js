// Desktop status bar. Keep the mobile navigation area unchanged.
if(!window.kayAndroid){
 const bar=document.createElement('div');bar.id='app-status-bar';bar.setAttribute('role','status');bar.setAttribute('aria-live','off');
 const stateText=document.createElement('span'),countText=document.createElement('span'),scoreText=document.createElement('span'),lineupText=document.createElement('span');
 stateText.className='app-status-state';bar.append(stateText,countText,scoreText,lineupText);document.body.append(bar);document.body.classList.add('has-status-bar');
 function updateAppStatus(){
  const active=matches.filter(m=>!m.finished),offline=navigator.onLine===false,refreshing=$('refresh').disabled;
  stateText.textContent=offline?'Offline':refreshing?'Refreshing...':!video.hidden&&video.videoWidth>0?(video.paused?'Paused':'Playing'):'Ready';
  stateText.dataset.state=offline?'offline':refreshing?'busy':'ready';
  countText.textContent=active.length+' matches · '+active.filter(m=>m.live).length+' live';
  scoreText.textContent=scoreUpdated?'Scores checked '+timeFormatter.format(new Date(scoreUpdated)):'Scores pending';
  const panel=$('lineup-panel'),source=panel?.querySelector('.lineup-source')?.textContent;
  lineupText.hidden=!selected||!$('stage').classList.contains('has-lineup');
  lineupText.textContent=source?'Line-ups: '+source:'Line-ups pending';
 }
 updateAppStatus();setInterval(updateAppStatus,1000);window.addEventListener('online',updateAppStatus);window.addEventListener('offline',updateAppStatus);
}
