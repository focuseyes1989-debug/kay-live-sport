const LAST_PLAYBACK_KEY = 'live-sport.last-playback';
let startupPlaybackChecked = false;

function rememberPlayback(match, commentator) {
  if (!match || !commentator) return;
  try {
    localStorage.setItem(LAST_PLAYBACK_KEY, JSON.stringify({
      id: match.id, scoreId: match.scoreId, home: match.home, away: match.away,
      kickoff: match.kickoff, channelId: commentator.id
    }));
  } catch { /* Playback continues if preferences cannot be saved. */ }
}

function showMatchList(message) {
  setSidebarHidden(false);
  try {
    localStorage.setItem('live-sport.sidebar-hidden', 'false');
    localStorage.removeItem(LAST_PLAYBACK_KEY);
  } catch {}
  $('message').textContent = message;
}

function restoreLastPlayback() {
  if (startupPlaybackChecked) return;
  startupPlaybackChecked = true;
  // Never replace a match the user selected while startup data was loading.
  if (selected) return;
  let saved;
  try { saved = JSON.parse(localStorage.getItem(LAST_PLAYBACK_KEY)); } catch { return; }
  if (!saved || typeof saved.channelId !== 'string' || typeof saved.home !== 'string'
      || typeof saved.away !== 'string' || !Number.isFinite(saved.kickoff)) return;
  const match = matches.find(m => m.home === saved.home && m.away === saved.away
    && m.kickoff === saved.kickoff
    && (m.id === saved.id || m.scoreId === saved.scoreId));
  if (!match) {
    showMatchList('Your previous match is no longer listed. Choose another match.');
    return;
  }
  // The website's football player also expires matches three hours after
  // kickoff. This guards against stale cached listings still marked LIVE.
  const expiredFootball = match.sport === '1' && match.kickoff > 0
    && Date.now() / 1000 - match.kickoff > 3 * 3600;
  if (match.finished || !match.live || expiredFootball) {
    showMatchList('Your previous match has ended or is no longer live. Choose another match.');
    return;
  }
  if (!match.channels.length) {
    showMatchList('Your previous match has no available commentators. Choose another match.');
    return;
  }
  // A removed commentator falls back to the match's available channels, using
  // the normal automatic recovery. Signed stream URLs are always fetched fresh.
  choose(match, saved.channelId);
}
