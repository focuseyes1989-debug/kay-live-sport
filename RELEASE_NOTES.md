## Windows 0.1.18 / Android 0.1.34 — Remove AsianBookie browser fallback

- Removes Watch on AsianBookie actions from Windows, Phone, Tablet and TV.
- Removes the associated native browser commands, UI scripts and styling.
- No AsianBookie direct playback is added. The existing stream-source outage remains unresolved.

## Windows 0.1.17 / Android 0.1.33 — Watch on AsianBookie

- Adds Watch on AsianBookie to Windows, Phone, Tablet and TV. The match-list action remains accessible when the stream source fails or no fixtures load.
- Adds a playback fallback action; Phone places it in the auto-hiding player toolbar. Phone Light/Dark styling and TV button focus are retained.
- Opens the fixed public AsianBookie Live page in the external browser. Users select a match and follow the site's advertisement/Close flow. No direct stream integration or advertisement bypass is added.
- Reports browser launch errors, including Android TV without an installed browser, and re-enables the action for retry.
- Validation: all four edition UI tests passed for source failure, native command dispatch, browser failure and retry readiness. Windows and Android native builds compile. Physical external-browser launch is not yet verified.
- Existing source-site outage is not repaired by this release. This is a browser fallback. AsianBookie availability and ads depend on its website.
- Android preview/debug APKs retain the existing package and signing key. Install over the existing app to retain settings; do not uninstall first.

## Windows 0.1.16 / Android 0.1.32 — Live stream repair

- Fixes empty commentator lists after the provider switched to relative match/commentator URLs. Both relative and absolute links now resolve against the current public source origin.
- Updates the source origin to sutbong8.net, including Phone background live checks.
- Adds the public player's same-host HLS route for niur/niues FLV streams, preserving signed queries and original-route fallback. Existing numbered scstream HLS routing is retained.
- Shared fix covers Windows, Phone and Tablet. TV APKs are rebuilt with the same resolver to keep the shared Android updater compatible.
- Validation: Rust URL/signature regressions, bounded player fallback tests, live fixture/playlist/media fetch, and advancing 720p browser playback on both CDN routes passed. One sampled offline commentator returned 404; automatic commentator fallback remains available. Physical Windows/Android playback has not been verified.
- Android APKs remain preview/debug builds signed with the existing key. Install over the current app to retain settings; do not uninstall first.

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
