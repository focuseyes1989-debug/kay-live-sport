## KAY LIVE SPORT TV v0.1.22 Preview

TV loads data on page entry instead of continuously polling in the background.

- Removes the 15-second match/score refresh timer and periodic lineup/highlights network refreshes on TV.
- Matches and Live share a short-lived cache; opening either page refreshes stale data. Scores refreshes on entry when its cache is stale. Highlights and Myanmar TV reuse their existing caches.
- Settings does not fetch sports data. Opening Highlights no longer requests score results unnecessarily.
- Manual Refresh forces a request for the current page. Duplicate in-flight page requests are reused.
- Retains the local clock/countdown display and stream playback/reconnection checks. Kickoff countdowns no longer trigger background data refreshes on TV.
- Live scores and goal/live notifications update when page-entry or manual refresh obtains new data; continuous background score/goal updates are intentionally disabled.
- Windows and Phone/Tablet polling behavior is unchanged.
- Includes stable refresh focus, Myanmar TV, four-column Matches/Live and Settings-only startup persistence.

### APKs

- KAYLiveSport-tv-arm32-debug.apk: ARM32 / armeabi-v7a, for the existing Xiaomi TV Stick ARM32 installation.
- KAYLiveSport-tv-arm64-debug.apk: ARM64 / arm64-v8a.

Install over the existing app without uninstalling or clearing data. Settings-page preferences are retained; playback and browsing state reset on startup. Application ID and signing certificate are unchanged. If an older updater reports Signing key differs, transfer the official matching APK with Send to TV and install over the existing app.

Validation: simulated idle time and due kickoffs produce no data requests; page-specific requests, fresh-cache reuse, stale-cache page entry and manual refresh; unchanged Phone/Tablet timers; TV remote navigation, focus retention, Settings retention/reset, Myanmar TV controls, fullscreen/Back and Exit; WebView 81 layouts through 4K. Both APK versions, architectures, signatures and alignment verified. Physical Mi Stick performance has not been benchmarked for this release.
