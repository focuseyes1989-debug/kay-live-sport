const SAVED_SETTINGS = [
  'live-sport.sidebar-hidden', 'live-sport.match-filter', 'live-sport.match-search',
  'live-sport.audio', 'live-sport.quality-height', 'live-sport.last-playback', 'live-sport.live-notifications', 'live-sport.goal-notifications', 'live-sport.notification-sound', 'live-sport.notification-volume', 'live-sport.results-date', 'live-sport.results-league', 'live-sport.match-league', 'live-sport.kickoff-autoplay', 'live-sport.refresh-notifications', 'live-sport.update-notifications', 'live-sport.animations', 'live-sport.animation-speed', 'live-sport.retry-notifications', 'live-sport.settings-sections', 'live-sport.time-format'
];

async function resetSettings() {
  const button = $('reset-settings');
  if (button.disabled) return;
  button.disabled = true;
  // Prevent pending recovery or startup restore from rewriting saved playback.
  ++playToken;
  wantPlayback = false;
  startupPlaybackChecked = true;
  stop();
  try {
    await rpc('reset_window');
    for (const key of SAVED_SETTINGS) localStorage.removeItem(key);
    try { sessionStorage.setItem('live-sport.reset-success', 'true'); } catch {}
    location.reload();
  } catch {
    $('message').textContent = 'Settings could not be fully reset. Please try again.';
    button.disabled = false;
  }
}
function closeResetConfirmation() {
  $('reset-dialog').close();
}
$('reset-settings').onclick = () => {
  if ($('reset-settings').disabled || $('reset-dialog').open) return;
  $('reset-dialog').showModal();
  $('cancel-reset').focus();
};
$('cancel-reset').onclick = closeResetConfirmation;
$('confirm-reset').onclick = () => {
  closeResetConfirmation();
  return resetSettings();
};
$('reset-dialog').onclose = () => $('settings-menu-button').focus();

function consumeResetNotification() {
  try {
    if (sessionStorage.getItem('live-sport.reset-success') !== 'true') return;
    sessionStorage.removeItem('live-sport.reset-success');
  } catch { return; }
  $('reset-notification').hidden = false;
  setTimeout(() => { $('reset-notification').hidden = true; }, 6000);
}
$('dismiss-reset-notification').onclick = () => { $('reset-notification').hidden = true; };
consumeResetNotification();
