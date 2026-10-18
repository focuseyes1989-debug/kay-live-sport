const fullscreenStage = $('stage');
const fullscreenBar = $('player-controls');
let fullscreenControlsTimer = null;
let fullscreenBarHovered = false;
let fullscreenKeyboardMode = false;

function showFullscreenControls() {
  clearTimeout(fullscreenControlsTimer);
  fullscreenStage.classList.remove('controls-hidden');
  if (!fullscreenStage.classList.contains('is-fullscreen')) return;
  fullscreenControlsTimer = setTimeout(() => {
    if (!fullscreenStage.classList.contains('is-fullscreen') || video.paused
        || fullscreenBarHovered || !$('recovery-bar').hidden
        || (fullscreenKeyboardMode && fullscreenBar.contains(document.activeElement))) return;
    fullscreenStage.classList.add('controls-hidden');
  }, 3000);
}

function setFullscreenControls() {
  fullscreenBarHovered = false;
  fullscreenKeyboardMode = false;
  showFullscreenControls();
}
fullscreenStage.addEventListener('pointermove', () => {
  fullscreenKeyboardMode = false;
  showFullscreenControls();
});
fullscreenStage.addEventListener('pointerdown', showFullscreenControls);
fullscreenBar.addEventListener('mouseenter', () => {
  fullscreenBarHovered = true;
  showFullscreenControls();
});
fullscreenBar.addEventListener('mouseleave', () => {
  fullscreenBarHovered = false;
  showFullscreenControls();
});
fullscreenBar.addEventListener('focusin', showFullscreenControls);
fullscreenBar.addEventListener('focusout', showFullscreenControls);
document.addEventListener('keydown', () => {
  fullscreenKeyboardMode = true;
  showFullscreenControls();
});
video.addEventListener('play', showFullscreenControls);
video.addEventListener('pause', showFullscreenControls);
