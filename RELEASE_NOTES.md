## Android Phone 0.1.31

- Adds a saved Phone live notifications switch and Android notification permission.
- Checks for upcoming-to-live transitions through native WorkManager, including when the activity is closed or the screen is off. Checks are approximately every 15 minutes; Android/Redmi battery restrictions can defer them. Force stop pauses background checks until the app is reopened.
- Persists notification deduplication across process restarts. Turning the switch off cancels background checks. Notification taps open the app.
- Completes Phone Light theme styling for in-app notifications, connection/error messages, dialogs, player controls and Fit/Fill buttons.
- Phone ARM32/ARM64 preview APKs include these changes. Tablet/TV ARM32/ARM64 are rebuilt at the same version for compatibility with the shared Android release updater; their UI is unchanged. Windows remains at its existing release.
- Validation: Phone UI/data/notification tests and four native notification tests passed. Controlled Home/background notification delivery was verified on Redmi. Screen-off delivery is not yet verified: Redmi reported the job frozen with connectivity unavailable. No guarantee of immediate or reliable screen-off delivery under battery restrictions.
- Uses the existing app package/signing key; update over the installed app to retain settings. Do not uninstall first.

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
