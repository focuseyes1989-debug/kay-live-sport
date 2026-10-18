const video = $('video');
let fullscreenBusy = false;
let fullscreenResizeAnimation = null;
video.volume = 0.8;
try {
  const audio = JSON.parse(localStorage.getItem('live-sport.audio'));
  if (audio && typeof audio.volume === 'number' && Number.isFinite(audio.volume)
      && audio.volume >= 0 && audio.volume <= 1) video.volume = audio.volume;
  if (audio && typeof audio.muted === 'boolean') video.muted = audio.muted;
} catch { /* Keep usable defaults if saved data is unavailable or invalid. */ }

function persistAudioPreferences() {
  try {
    localStorage.setItem('live-sport.audio', JSON.stringify({ volume: video.volume, muted: video.muted }));
  } catch { /* Storage failure must not interrupt live playback. */ }
}

function resetPlayerControls() {
  qualityRestorePending = false;
  qualitySavePending = false;
  $('player-controls').hidden = true;
  $('quality-info').hidden = true;
  $('quality').replaceChildren(new Option('Auto', '-1'));
  $('quality').disabled = true;
}

// Persist a resolution, never a playlist index: variant ordering differs
// between commentators. Automatic fallback does not erase the user's choice.
let preferredQuality = null;
let qualityRestorePending = false;
let qualitySavePending = false;
try {
  const saved = JSON.parse(localStorage.getItem('live-sport.quality-height'));
  if (Number.isInteger(saved) && saved > 0) preferredQuality = saved;
} catch { /* Default to Auto. */ }

function saveQualityPreference(height) {
  preferredQuality = height;
  try { localStorage.setItem('live-sport.quality-height', JSON.stringify(height)); } catch {}
}

function restoreQuality(player, detectedHeight = 0) {
  const index = preferredQuality === null ? -1 : player.levels.findIndex(level => level.height === preferredQuality);
  const restored = index !== -1 ? index : player.levels.length === 1 && detectedHeight > 0 && detectedHeight === preferredQuality ? 0 : -1;
  $('quality').value = String(restored);
  player.currentLevel = restored;
}

function qualityOptions(levels) {
  return levels.map((level, index) => {
    const resolution = level.height ? `${level.height}p` : level.width ? `${level.width}px wide` : `Stream ${index + 1}`;
    const bitrate = level.bitrate ? ` · ${(level.bitrate / 1000000).toFixed(1)} Mbps` : '';
    return { value: String(index), label: resolution + bitrate };
  });
}

function populateQualities(player) {
  const select = $('quality');
  select.replaceChildren(new Option('Auto', '-1'));
  for (const option of qualityOptions(player.levels)) {
    select.add(new Option(option.label, option.value));
  }
  qualitySavePending = false;
  qualityRestorePending = player.levels.length === 1 && !player.levels[0].height;
  restoreQuality(player);
  select.disabled = player.levels.length === 0;
  updateQualityInfo();
}

function updateQualityInfo(mediaDimensionsChanged = false) {
  if (!hls) return;
  if (qualityRestorePending && video.videoHeight > 0) {
    qualityRestorePending = false;
    restoreQuality(hls, video.videoHeight);
  }
  const level = hls.levels[hls.currentLevel];
  const height = level?.height || video.videoHeight;
  if (qualitySavePending && height > 0 && (hls.levels.length === 1 || mediaDimensionsChanged)) {
    qualitySavePending = false;
    saveQualityPreference(height);
  }
  if (hls.levels.length === 1 && height && $('quality').children[1]) {
    $('quality').children[1].text = `${height}p (only quality)`;
  }
  const active = height ? `${height}p` : 'detecting resolution…';
  const mode = $('quality').value === '-1' ? 'Auto' : 'Manual';
  $('quality-info').textContent = hls.levels.length <= 1
    ? `Single quality stream · ${active} · the provider offers no other resolutions`
    : `${mode} · ${active} · ${hls.levels.length} stream qualities available`;
}

$('quality').onchange = () => {
  if (!hls) return;
  const selectedLevel = Number($('quality').value);
  if (selectedLevel !== -1 && (!Number.isInteger(selectedLevel) || !hls.levels[selectedLevel])) return;
  qualityRestorePending = false;
  qualitySavePending = false;
  if (selectedLevel === -1) saveQualityPreference(null);
  else {
    const height = hls.levels[selectedLevel].height || (hls.levels.length === 1 ? video.videoHeight : 0);
    if (height > 0) saveQualityPreference(height);
    else qualitySavePending = true;
  }
  hls.currentLevel = selectedLevel;
  updateQualityInfo();
};

async function togglePlayback() {
  if (video.paused) {
    if (typeof setPlaybackIntent === 'function') setPlaybackIntent(true);
    try { await video.play(); } catch { $('message').textContent = 'Could not start playback. Try reconnecting the stream.'; }
  } else {
    if (typeof setPlaybackIntent === 'function') setPlaybackIntent(false);
    video.pause();
  }
}
$('toggle-play').onclick = togglePlayback;
function updatePlaybackButton() {
  $('toggle-play').innerHTML = video.paused
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4 21 12 7 20Z"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="5" height="16" rx="1"/><rect x="14" y="4" width="5" height="16" rx="1"/></svg>';
  $('toggle-play').setAttribute('aria-label', video.paused ? 'Play' : 'Pause');
  $('toggle-play').title = video.paused ? 'Play' : 'Pause';
}
updatePlaybackButton();
video.addEventListener('play', updatePlaybackButton);
video.addEventListener('pause', updatePlaybackButton);
video.addEventListener('loadedmetadata', () => updateQualityInfo(true));
video.addEventListener('resize', () => updateQualityInfo(true));
video.addEventListener('click', togglePlayback);

function updateVolumeControls() {
  const percent = Math.round(video.volume * 100);
  $('volume').value = String(percent);
  $('volume-value').textContent = video.muted ? 'Muted' : `${percent}%`;
  const silent = video.muted || video.volume === 0;
  $('mute').textContent = silent ? '🔇' : '🔊';
  $('mute').setAttribute('aria-label', silent ? 'Unmute' : 'Mute');
  $('mute').setAttribute('aria-pressed', String(silent));
  persistAudioPreferences();
}
$('volume').oninput = () => {
  video.volume = Number($('volume').value) / 100;
  video.muted = false;
  updateVolumeControls();
};
$('mute').onclick = () => {
  if (video.muted || video.volume === 0) {
    if (video.volume === 0) video.volume = 0.8;
    video.muted = false;
  } else video.muted = true;
  updateVolumeControls();
};
video.addEventListener('volumechange', updateVolumeControls);
updateVolumeControls();

async function animateFullscreenResize(stage,before){
  if(typeof animationsEnabled!=='undefined'&&!animationsEnabled)return;
  if(!before||!stage.animate||!stage.getBoundingClientRect)return;
  if(typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  if(typeof requestAnimationFrame==='function')await new Promise(resolve=>requestAnimationFrame(resolve));
  const after=stage.getBoundingClientRect();
  if(before.width<=0||before.height<=0||after.width<=0||after.height<=0)return;
  const animation=stage.animate([
    {transformOrigin:'top left',transform:'translate('+(before.left-after.left)+'px,'+(before.top-after.top)+'px) scale('+(before.width/after.width)+','+(before.height/after.height)+')'},
    {transformOrigin:'top left',transform:'translate(0,0) scale(1,1)'}
  ],{duration:typeof animationDuration==='function'?animationDuration(260):260,easing:'cubic-bezier(.22,.61,.36,1)'});
  fullscreenResizeAnimation=animation;
  try{await animation.finished;}catch{}finally{if(fullscreenResizeAnimation===animation)fullscreenResizeAnimation=null;}
}
async function setFullscreen(enabled) {
  if (fullscreenBusy) return;
  fullscreenBusy = true;
  const stage=$('stage');
  const before=stage.getBoundingClientRect?.();
  try {
    const result = await rpc('fullscreen', { enabled });
    $('stage').classList.toggle('is-fullscreen', result.enabled);
    document.body.classList.toggle('player-fullscreen', result.enabled);
    $('fullscreen').textContent = result.enabled ? '⛶ Exit fullscreen' : '⛶ Fullscreen';
    $('fullscreen').setAttribute('aria-label', result.enabled ? 'Exit fullscreen' : 'Enter fullscreen');
    $('fullscreen').setAttribute('aria-pressed', String(result.enabled));
    if (typeof setFullscreenControls === 'function') setFullscreenControls();
    await animateFullscreenResize(stage,before);
  } catch { $('message').textContent = 'Fullscreen could not be changed. Please try again.'; }
  finally { fullscreenBusy = false; }
}
function toggleFullscreen() { return setFullscreen(!$('stage').classList.contains('is-fullscreen')); }
$('fullscreen').onclick = toggleFullscreen;
video.addEventListener('dblclick', toggleFullscreen);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && $('stage').classList.contains('is-fullscreen')) {
    event.preventDefault(); setFullscreen(false); return;
  }
  if ($('video').hidden || /INPUT|SELECT|TEXTAREA|BUTTON/.test(event.target.tagName) || event.ctrlKey || event.altKey || event.metaKey) return;
  if (event.key.toLowerCase() === 'f') { event.preventDefault(); toggleFullscreen(); }
  if (event.key.toLowerCase() === 'm') { event.preventDefault(); $('mute').click(); }
  if (event.code === 'Space') { event.preventDefault(); togglePlayback(); }
});

