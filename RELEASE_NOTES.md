## KAY LIVE SPORT Android v0.1.30 — Phone player controls

Phone fullscreen now uses one idle timer for the Back/commentator bar and bottom playback controls.

- Both bars fade out together after three seconds while video is playing.
- Touching the picture reveals both bars without pausing playback; use the Play/Pause button to pause.
- Controls stay available while paused, buffering or showing a connection error.
- Avoids the older landscape/desktop timer conflict and touch-generated sticky hover/focus behavior.
- Keeps the existing animation preference and speed for the top-bar fade.

Includes portrait and landscape regression coverage with controlled media states for hide/reveal, repeat hiding, tap-without-pause, pause/buffering/error behavior and existing navigation/theme checks. Physical-device playback verification of this change is not included.

Tablet and TV UI behavior is unchanged. Phone cache-first data loading, themes, Matches/Live tab labels and saved settings remain available. Windows is unchanged.

### Downloads
- Phone: KAYLiveSport-android-arm64-debug.apk / KAYLiveSport-android-arm32-debug.apk.
- Tablet: KAYLiveSport-tablet-arm64-debug.apk / KAYLiveSport-tablet-arm32-debug.apk.
- TV: KAYLiveSport-tv-arm32-debug.apk / KAYLiveSport-tv-arm64-debug.apk.

Install the matching edition over the existing app without uninstalling to preserve settings. All editions retain the application ID and signing certificate and replace each other on a device. APKs remain preview/debug builds.

Validation: Phone UI integration checks, six native builds, APK version/edition/architecture, signing certificate and alignment checks, plus uploaded SHA-256 verification.
