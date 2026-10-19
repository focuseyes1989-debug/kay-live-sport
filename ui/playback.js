// One recovery cycle visits each commentator at most once. Tokens invalidate
// in-flight requests and callbacks when a match/channel is changed manually.
let attemptedChannels = new Set();
let switchTimer = null;
let activeAttempt = null;
let wantPlayback = false;
let flvPlayer = null;
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

function recoveryNotice(message, canRetry = false) {
  $('message').textContent = message;
  $('recovery-status').textContent = message;
  $('recovery-bar').hidden = false;
  $('player-retry').hidden = !canRetry;
  // Keep the fullscreen exit control reachable, even when every link fails.
  if (!$('video').hidden) $('player-controls').hidden = false;
}

function stop() {
  clearTimeout(switchTimer);
  switchTimer = null;
  activeAttempt = null;
  $('recovery-bar').hidden = true;
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
  $('message').textContent='Refreshing commentator links · source still reports Scheduled.';
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
  }catch(e){if(token===playToken&&selected&&waitingFixtureKey(selected)===key)$('message').textContent='Could not open stream: '+e.message;}
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
  const next = selected?.channels.find(c => !attemptedChannels.has(c.id));
  ++playToken;
  stop();
  if (!shouldRecover) {
    retryInProgress=false;updateRetryState(false);
    recoveryNotice('Stream disconnected while paused. Reconnect to continue.', true);
    $('retry').hidden = false;
    return;
  }
  if (!next) {
    finishRetryOutcome(false);
    wantPlayback = false;
    recoveryNotice('All commentator links have been tried. No working stream is available. Press Retry all channels to try again.', true);
    $('retry').hidden = false;
    return;
  }
  const token = playToken;
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
  attempt.started = true;
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
  $('recovery-bar').hidden = true;
  $('retry').hidden = true;
}

async function startAttemptVideo(attempt) {
  if (!attemptIsCurrent(attempt)) return;
  try { await $('video').play(); }
  catch (e) {
    if (!attemptIsCurrent(attempt)) return;
    if (e.name === 'NotAllowedError') {
      setPlaybackIntent(false);finishRetryOutcome(false,'Automatic playback was blocked. Press Play to start.');$('retry').hidden=true;$('player-retry').hidden=true;
      $('message').textContent = 'Press Play to start watching.';
    } else failedStream(attempt, 'Video could not start.');
  }
}

async function play(c, automatic = false) {
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
    const r = await rpc('resolve', { post: selected.post, channel: c.id });
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
  } catch (e) { failedStream(attempt, 'This commentator is unavailable.'); }
}

function retryPlayback() {
  if(retryInProgress||kickoffReloadBusy)return;
  retryInProgress=true;updateRetryState(true);
  $('message').textContent='Reconnecting · refreshing commentator links…';
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
 $('message').textContent=retryInProgress?'Reconnecting · refreshing commentator links…':'Match is live · refreshing commentators…';
 try{
  const freshMatches=await rpc('matches');
  if((!kickoffAutoplayEnabled&&!waitingManualLive)||revision!==kickoffAutoplayRevision||token!==playToken||waitingFixture!==key||!selected||waitingFixtureKey(selected)!==key)return;
  const fixtures=freshMatches.filter(m=>waitingFixtureKey(m)===key&&!m.finished);
  if(fixtures.length!==1||!fixtures[0].channels?.length){$('message').textContent='Match is live · waiting for commentator links. Retrying automatically…';return;}
  const fresh=fixtures[0];
  // The listing can lag behind the confirmed score feed. Keep its live state
  // and scores while using freshly retrieved posts and commentator IDs.
  for(const field of ['live','finished','status','minute','homeScore','awayScore','scoreSource','scoreChecked'])fresh[field]=selected[field];
  const index=matches.findIndex(m=>waitingFixtureKey(m)===key);if(index>=0)matches[index]=fresh;
  choose(fresh,null,retryInProgress);
 }catch(e){if(token===playToken&&waitingFixture===key)$('message').textContent='Could not refresh commentators. Retrying automatically…';}
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
