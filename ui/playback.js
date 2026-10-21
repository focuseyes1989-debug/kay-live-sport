// One recovery cycle visits each commentator at most once. Tokens invalidate
// in-flight requests and callbacks when a match/channel is changed manually.
let attemptedChannels = new Set();
let switchTimer = null;
let activeAttempt = null;
let wantPlayback = false;
let flvPlayer = null;
let playerNoticeTimer = null;
let kickoffAutoplayEnabled = true, kickoffAutoplayRevision = 0;
try { const saved=JSON.parse(localStorage.getItem('live-sport.kickoff-autoplay')); if(typeof saved==='boolean')kickoffAutoplayEnabled=saved; } catch {}
let retryInProgress = false,retryNotificationTimer=null,retryNotificationsEnabled=true;
try{const saved=JSON.parse(localStorage.getItem('live-sport.retry-notifications'));if(typeof saved==='boolean')retryNotificationsEnabled=saved;}catch{}
function initializeRetryNotificationToggle(){
 const button=$('toggle-retry-notifications');
 const update=()=>{button.setAttribute('aria-pressed',String(retryNotificationsEnabled));button.title=retryNotificationsEnabled?'Retry notifications: On · Click to turn off':'Retry notifications: Off · Click to turn on';button.setAttribute('aria-label',button.title);};
 button.onclick=()=>{
  retryNotificationsEnabled=!retryNotificationsEnabled;
  try{localStorage.setItem('live-sport.retry-notifications',JSON.stringify(retryNotificationsEnabled));}catch{}
  if(!retryNotificationsEnabled){clearTimeout(retryNotificationTimer);$('retry-notification').hidden=true;}
  update();
 };
 update();
}
function showRetryNotification(kind,message){
 if(!retryNotificationsEnabled||typeof document==='undefined')return;
 clearTimeout(retryNotificationTimer);
 const toast=$('retry-notification');toast.dataset.kind=kind;
 $('retry-notification-text').textContent=message;toast.hidden=false;
 retryNotificationTimer=setTimeout(()=>{toast.hidden=true;},6000);
}
function finishRetryOutcome(success,message){
 if(retryInProgress)showRetryNotification(success?'success':'error',message||(success?'Stream reconnected successfully.':'Could not reconnect the stream. Please try again.'));
 retryInProgress=false;updateRetryState(false);
}
function updateRetryState(busy){
 for(const id of ['retry','player-retry']){const button=$(id);button.disabled=busy;button.setAttribute?.('aria-busy',String(busy));button.setAttribute?.('data-reconnecting',String(busy));button.textContent=busy?'Reconnecting…':'↻ Retry stream';if(busy)button.hidden=false;}
}
let manualStreamFixture = null;
function isManualStreamMatch(m){return !!m&&manualStreamFixture===waitingFixtureKey(m);}
let waitingManualLive = false;
let waitingFixture = null, kickoffReloadBusy = false, nextKickoffReload = 0;
function waitingFixtureKey(m){return [m.home,m.away,m.kickoff].join('|');}
const START_TIMEOUT = 30000;
const STALL_TIMEOUT = 20000;
const HEALTHY_RESET = 30000;

function hidePlayerNotice(){
  clearTimeout(playerNoticeTimer);playerNoticeTimer=null;
  $('recovery-bar').hidden=true;
  $('stage').classList.toggle('has-player-notice',false);
}
function recoveryNotice(message, canRetry = false, kind = canRetry ? 'error' : 'connecting') {
  clearTimeout(playerNoticeTimer);playerNoticeTimer=null;
  $('message').textContent = message;
  $('recovery-status').textContent = message;
  const box=$('recovery-bar');
  box.setAttribute?.('data-kind',kind);
  box.setAttribute?.('aria-busy',String(kind==='connecting'));
  $('recovery-title').textContent=kind==='connected'?'Connected':kind==='error'?'Connection error':kind==='info'?'Playback paused':retryInProgress?'Reconnecting':'Connecting';
  box.hidden=false;
  $('stage').classList.toggle('has-player-notice',true);
  $('player-retry').hidden = !canRetry;
  if (!$('video').hidden) $('player-controls').hidden = false;
  if(kind==='connected'){
    const token=playToken;
    playerNoticeTimer=setTimeout(()=>{if(token===playToken)hidePlayerNotice();},3000);
  }
}

function stop() {
  clearTimeout(switchTimer);
  switchTimer = null;
  activeAttempt = null;
  hidePlayerNotice();
  $('player-retry').hidden = true;
  const v = $('video');
  v.onplaying = v.onerror = v.ontimeupdate = v.onended = null;
  resetPlayerControls();
  if (hls) { hls.destroy(); hls = null; }
  if (flvPlayer) { flvPlayer.destroy(); flvPlayer = null; }
  v.pause();
  v.removeAttribute('src');
  v.load();
}

function choose(m, preferredChannelId = null, reconnecting = false, manualStream = false) {
  if(!reconnecting){retryInProgress=false;updateRetryState(false);}
  waitingManualLive = false;
  waitingFixture = !m.live && !m.finished ? waitingFixtureKey(m) : null;
  nextKickoffReload = 0;
  ++playToken;
  stop();
  manualStreamFixture = manualStream && !m.finished ? waitingFixtureKey(m) : null;
  selected = m;
  channel = null;
  wantPlayback = false;
  attemptedChannels.clear();
  render();
  updateSelected();
  $('channels').replaceChildren();
  $('channel-label').hidden = !m.channels.length;
  $('try-stream').hidden = !!m.live || !!m.finished || !m.channels.length || manualStream;
  $('try-stream').disabled=false;$('try-stream').textContent='▶ Try stream';
  $('retry').hidden = true;$('retry').disabled=false;
  $('retry').textContent='↻ Retry stream';
  $('video').hidden = true;
  $('empty').hidden = false;
  setEmptyPlaybackState(m.live?'Connecting to live stream…':'Waiting for kickoff',m.live?'Loading commentator links.':'The stream will be available when the match starts.');
  $('stage').hidden = !!m.finished;
  if (m.finished) {
    $('channel-label').hidden = true;
    $('message').textContent = 'Full-time result · '+(m.scoreSource || 'Listing');
    return;
  }
  if (!m.live && !manualStream) {
    $('channel-label').hidden = true;
    $('message').textContent = kickoffAutoplayEnabled?'Waiting for kickoff · stream will open automatically when live.':'Waiting for kickoff · automatic playback is off.';
    return;
  }
  for (const c of m.channels) {
    const b = node('button', c.name || 'Channel ' + c.id);
    b.onclick = () => play(c);
    b.dataset.id = c.id;
    $('channels').append(b);
  }
  if (m.channels.length) play(m.channels.find(c => c.id === preferredChannelId) || m.channels[0]);
  else {
    waitingFixture=waitingFixtureKey(m);waitingManualLive=true;
    $('retry').hidden=false;
    setEmptyPlaybackState('Waiting for live stream','The match is live. Refreshing commentator links automatically…');
    $('message').textContent='Match is live · refreshing commentator links…';
    checkSelectedKickoff();
  }
}

async function tryScheduledStream(){
  const match=selected;
  if(!match||match.live||match.finished||!match.channels?.length||$('try-stream').disabled)return;
  const key=waitingFixtureKey(match),token=playToken;
  $('try-stream').disabled=true;$('try-stream').textContent='Connecting…';
  recoveryNotice('Refreshing commentator links · source still reports Scheduled.');
  try{
    const freshMatches=await rpc('matches');
    if(token!==playToken||!selected||waitingFixtureKey(selected)!==key)return;
    const candidates=freshMatches.filter(m=>waitingFixtureKey(m)===key&&!m.finished);
    if(candidates.length!==1||!candidates[0].channels?.length)throw Error('No commentator links are available. Try again later.');
    const fresh=candidates[0];
    // Preserve independently verified score/status while refreshing stream metadata.
    for(const field of ['live','finished','status','minute','homeScore','awayScore','scoreSource','scoreChecked'])fresh[field]=selected[field];
    if(fresh.finished)throw Error('This match has finished.');
    const index=matches.findIndex(m=>waitingFixtureKey(m)===key);if(index>=0)matches[index]=fresh;
    choose(fresh,null,false,true);
  }catch(e){if(token===playToken&&selected&&waitingFixtureKey(selected)===key)recoveryNotice('Could not open stream: '+e.message,true);}
  finally{if(token===playToken){$('try-stream').disabled=false;$('try-stream').textContent='▶ Try stream';}}
}
$('try-stream').onclick=tryScheduledStream;
const updateSelectedBeforeTryStream=updateSelected;
updateSelected=function(...args){
  updateSelectedBeforeTryStream(...args);
  $('try-stream').hidden=!selected||selected.live||selected.finished||!selected.channels?.length||isManualStreamMatch(selected);
};


function setPlaybackIntent(playing) {
  wantPlayback = playing;
  if (activeAttempt) {
    activeAttempt.progressAt = Date.now();
    activeAttempt.healthySince = null;
  }
}

function attemptIsCurrent(attempt) {
  return activeAttempt === attempt && attempt.token === playToken;
}

function failedStream(attempt, reason) {
  if (!attemptIsCurrent(attempt)) return;
  const shouldRecover = wantPlayback;
  const routes=attempt.routes, routeIndex=(attempt.routeIndex||0)+1;
  const nextRoute=routes && routeIndex<routes.length;
  const next = selected?.channels.find(c => !attemptedChannels.has(c.id));
  ++playToken;
  stop();
  if (!shouldRecover) {
    retryInProgress=false;updateRetryState(false);
    recoveryNotice('Stream disconnected while paused. Reconnect to continue.', true);
    $('retry').hidden = false;
    return;
  }
  if (!nextRoute && !next) {
    const message=selected?.myanmarChannel?reason+' Retry to refresh the channel link, or use Open channel website.':'All commentator links have been tried. No working stream is available. Press Retry all channels to try again.';
    finishRetryOutcome(false,message);
    wantPlayback = false;
    recoveryNotice(message, true);
    $('retry').hidden = false;
    return;
  }
  const token = playToken;
  if(nextRoute){
    recoveryNotice(`${reason} Trying another stream route…`);
    switchTimer=setTimeout(()=>{switchTimer=null;if(token===playToken)play(channel,true,routes,routeIndex,attempt.fromCache);},500);
    return;
  }
  recoveryNotice(`${reason} Switching to ${next.name || 'another commentator'}… (${attemptedChannels.size + 1}/${selected.channels.length})`);
  switchTimer = setTimeout(() => {
    switchTimer = null;
    if (token === playToken) play(next, true);
  }, 1500);
}

function playbackProgress(attempt) {
  if (!attemptIsCurrent(attempt) || !wantPlayback) return;
  const v = $('video');
  // `playing` alone is insufficient: only advancing video time resets the
  // stall deadline, so a stuck frame with an apparently playing tag recovers.
  if (v.currentTime <= attempt.lastTime + 0.01) return;
  const now = Date.now();
  attempt.lastTime = v.currentTime;
  attempt.progressAt = now;
  const firstFrame=!attempt.started;
  attempt.started = true;
  saveStreamCache(attempt);
  if (!attempt.saved && typeof rememberPlayback === 'function') {
    rememberPlayback(selected, channel);
    attempt.saved = true;
  }
  if (attempt.healthySince === null) attempt.healthySince = now;
  if (now - attempt.healthySince >= HEALTHY_RESET) {
    attemptedChannels = new Set([channel.id]);
  }
  finishRetryOutcome(true);$('player-retry').hidden=true;
  $('message').textContent = `● Playing live · ${channel.name || 'Commentator'}`;
  if(firstFrame)recoveryNotice(`Playing live · ${channel.name || 'Commentator'}`,false,'connected');
  $('retry').hidden = true;
}

async function startAttemptVideo(attempt) {
  if (!attemptIsCurrent(attempt)) return;
  try { await $('video').play(); }
  catch (e) {
    if (!attemptIsCurrent(attempt)) return;
    if (e.name === 'NotAllowedError') {
      setPlaybackIntent(false);finishRetryOutcome(false,'Automatic playback was blocked. Press Play to start.');$('retry').hidden=true;$('player-retry').hidden=true;
      recoveryNotice('Press Play to start watching.',false,'info');
    } else failedStream(attempt, 'Video could not start.');
  }
}

// Cache only routes that actually produced frames. Five minutes is a recovery
// window, not an offline source directory; signed links can expire sooner.
function readStreamCache(key){
  try{
    const entry=JSON.parse(localStorage.getItem('live-sport.stream-cache')||'{}')[key];
    if(entry && Date.now()>=entry.at && Date.now()-entry.at<300000 && Array.isArray(entry.sources))return entry.sources;
  }catch{}
  return null;
}
function saveStreamCache(attempt){
  if(attempt.cached || attempt.fromCache || !attempt.routes)return;
  attempt.cached=true;
  try{
    const cache=JSON.parse(localStorage.getItem('live-sport.stream-cache')||'{}');
    cache[attempt.cacheKey]={at:Date.now(),sources:attempt.routes};
    const keys=Object.keys(cache).sort((a,b)=>cache[b].at-cache[a].at);
    for(const key of keys.slice(40))delete cache[key];
    localStorage.setItem('live-sport.stream-cache',JSON.stringify(cache));
  }catch{}
}

async function play(c, automatic = false, routes = null, routeIndex = 0, fromCache = false) {
  waitingFixture = null;waitingManualLive=false;
  if (!automatic) attemptedChannels.clear();
  const token = ++playToken;
  stop();
  channel = c;
  attemptedChannels.add(c.id);
  wantPlayback = true;
  const attempt = { token, progressAt: Date.now(), lastTime: 0, started: false, healthySince: null };
  activeAttempt = attempt;
  recoveryNotice(`Connecting to ${c.name || 'live stream'}… (${attemptedChannels.size}/${selected.channels.length})`);
  $('retry').hidden = true;if(retryInProgress)updateRetryState(true);
  for (const b of $('channels').children) b.classList.toggle('active', b.dataset.id === c.id);
  const v = $('video');
  v.onplaying = () => playbackProgress(attempt);
  v.ontimeupdate = () => playbackProgress(attempt);
  v.onerror = () => failedStream(attempt, 'Video could not be decoded.');
  v.onended = () => failedStream(attempt, 'Stream ended.');
  try {
    attempt.cacheKey=selected.post+'|'+c.id;
    if(!routes){
      try{const result=await rpc('resolve',{post:selected.post,channel:c.id});routes=result.sources||[result];}
      catch(error){routes=readStreamCache(attempt.cacheKey);if(!routes)throw error;fromCache=true;}
    }
    if(!attemptIsCurrent(attempt))return;
    routes=routes.filter(r=>r && typeof r.url==='string' && /^https:\/\//i.test(r.url));
    if(!routes[routeIndex])throw Error('No stream route is available.');
    attempt.routes=routes;attempt.routeIndex=routeIndex;attempt.fromCache=fromCache;
    const r=routes[routeIndex];
    if (!attemptIsCurrent(attempt)) return;
    attempt.progressAt = Date.now();
    v.hidden = false;
    $('empty').hidden = true;
    $('player-controls').hidden = false;
    $('quality-info').hidden = false;
    if (r.format === 'flv' || /\.flv(?:\?|$)/i.test(r.url)) {
      if (typeof mpegts === 'undefined' || !mpegts.getFeatureList().mseLivePlayback) {
        failedStream(attempt, 'FLV playback is not supported.'); return;
      }
      const player = mpegts.createPlayer({type:'flv',isLive:true,url:r.url}, {enableWorker:false,liveBufferLatencyChasing:true});
      flvPlayer = player;
      player.on(mpegts.Events.ERROR, (type, detail, info) => {
        if (!attemptIsCurrent(attempt)) return;
        const code=Number(info?.code);
        failedStream(attempt, code===403?'Stream server denied access (403).':code===404?'Stream is offline (404).':'FLV stream connection failed.');
      });
      $('quality-info').textContent = 'Single quality FLV stream · provider controls resolution';
      player.attachMediaElement(v);
      player.load();
      startAttemptVideo(attempt);
    } else if (Hls.isSupported()) {
      const player = new Hls({ maxBufferLength: 20 });
      hls = player;
      player.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!attemptIsCurrent(attempt)) return;
        populateQualities(player);
        startAttemptVideo(attempt);
      });
      player.on(Hls.Events.LEVEL_SWITCHED, () => { if (attemptIsCurrent(attempt)) updateQualityInfo(); });
      player.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) failedStream(attempt, Number(data.response?.code)===403?'Stream server denied access (403).':'Stream connection failed.');
      });
      player.loadSource(r.url);
      player.attachMedia(v);
    } else if (v.canPlayType('application/vnd.apple.mpegurl')) {
      v.src = r.url;
      $('quality-info').textContent = 'Native playback · stream quality is managed automatically';
      startAttemptVideo(attempt);
    } else {
      wantPlayback = false;
      failedStream(attempt, 'HLS playback is not supported.');
    }
  } catch (e) { failedStream(attempt, selected?.myanmarChannel?(e?.message||'The channel source is unavailable.'):'This commentator is unavailable.'); }
}

function retryPlayback() {
  if(retryInProgress||kickoffReloadBusy)return;
  retryInProgress=true;updateRetryState(true);
  recoveryNotice('Reconnecting · refreshing commentator links…');
  if(selected?.live&&!selected.finished){waitingFixture=waitingFixtureKey(selected);waitingManualLive=true;nextKickoffReload=0;return checkSelectedKickoff();}
  const available = selected?.channels || [];
  if (available.length) play(available.find(c => c.id === channel?.id) || available[0]);
}

function checkPlaybackHealth() {
  const attempt = activeAttempt;
  if (!attempt || !wantPlayback || !attemptIsCurrent(attempt)) return;
  const timeout = attempt.started ? STALL_TIMEOUT : START_TIMEOUT;
  if (Date.now() - attempt.progressAt >= timeout) {
    attempt.healthySince = null;
    failedStream(attempt, attempt.started ? 'Video stopped progressing.' : 'Stream connection timed out.');
  }
}
setInterval(checkPlaybackHealth, 2000);
$('retry').textContent = '↻ Retry all channels';
$('retry').onclick = retryPlayback;
$('player-retry').onclick = retryPlayback;

async function checkSelectedKickoff(){
 if(!kickoffAutoplayEnabled&&!waitingManualLive){if(waitingFixture&&selected?.live&&!selected.finished)$('message').textContent='Match is live · select this match to start watching.';return;}
 if(!waitingFixture||!selected||waitingFixtureKey(selected)!==waitingFixture||!selected.live||selected.finished||kickoffReloadBusy||Date.now()<nextKickoffReload)return;
 const key=waitingFixture,token=playToken,revision=kickoffAutoplayRevision;
 kickoffReloadBusy=true;nextKickoffReload=Date.now()+15000;
 $('retry').hidden=false;$('retry').disabled=true;
 recoveryNotice(retryInProgress?'Reconnecting · refreshing commentator links…':'Match is live · refreshing commentators…');
 try{
  const freshMatches=await rpc('matches');
  if((!kickoffAutoplayEnabled&&!waitingManualLive)||revision!==kickoffAutoplayRevision||token!==playToken||waitingFixture!==key||!selected||waitingFixtureKey(selected)!==key)return;
  const fixtures=freshMatches.filter(m=>waitingFixtureKey(m)===key&&!m.finished);
  if(fixtures.length!==1||!fixtures[0].channels?.length){recoveryNotice('Match is live · waiting for commentator links. Retrying automatically…',true);return;}
  const fresh=fixtures[0];
  // The listing can lag behind the confirmed score feed. Keep its live state
  // and scores while using freshly retrieved posts and commentator IDs.
  for(const field of ['live','finished','status','minute','homeScore','awayScore','scoreSource','scoreChecked'])fresh[field]=selected[field];
  const index=matches.findIndex(m=>waitingFixtureKey(m)===key);if(index>=0)matches[index]=fresh;
  choose(fresh,null,retryInProgress);
 }catch(e){if(token===playToken&&waitingFixture===key)recoveryNotice('Could not refresh commentators. Retrying automatically…',true);}
 finally{kickoffReloadBusy=false;if(waitingFixture===key){finishRetryOutcome(false,'No working commentator link was found. Please try again.');$('retry').hidden=false;}else if(retryInProgress)updateRetryState(true);else $('retry').disabled=false;}
}

function initializeKickoffAutoplayToggle(){
 const button=$('toggle-kickoff-autoplay');
 const update=()=>{
  button.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 9a8 8 0 1 0 0 6M20 4v5h-5"/><path d="m10 8 6 4-6 4z" fill="currentColor" stroke="none"/></svg>';
  button.setAttribute('aria-pressed',String(kickoffAutoplayEnabled));
  button.title=kickoffAutoplayEnabled?'Auto play: On · Click to turn off':'Auto play: Off · Click to turn on';
  button.setAttribute('aria-label',button.title);
 };
 button.onclick=()=>{
  kickoffAutoplayEnabled=!kickoffAutoplayEnabled;++kickoffAutoplayRevision;
  try{localStorage.setItem('live-sport.kickoff-autoplay',JSON.stringify(kickoffAutoplayEnabled));}catch{}
  update();
  if(waitingFixture&&selected&&!selected.live&&!selected.finished)$('message').textContent=kickoffAutoplayEnabled?'Waiting for kickoff · stream will open automatically when live.':'Waiting for kickoff · automatic playback is off.';
  checkSelectedKickoff();
 };
 update();
}

function setEmptyPlaybackState(title,description){
 const heading=$('empty').querySelector?.('strong'),detail=$('empty').querySelector?.('p');
 if(heading)heading.textContent=title;if(detail)detail.textContent=description;
}
