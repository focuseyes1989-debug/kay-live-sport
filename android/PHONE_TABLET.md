# Phone and Tablet editions

The Phone edition has one fixture page with Matches and Live tabs. Selecting a fixture opens the immersive player immediately. Scheduled fixtures with provider channels attempt playback too; fixtures without a stream show the waiting state. Back stops playback and returns to the same list/filter. Commentator selection, Fit/Fill, Retry, settings, search and refresh remain available. Results, Highlights and Myanmar TV are not part of the Phone navigation.

The Tablet edition retains the previous Phone/Tablet layout and its existing pages. TV remains unchanged.

Phone does not show the league filter and ignores a previously saved league selection without overwriting it for Tablet. Settings → Appearance has Light/Dark buttons. Light is the default; the Phone theme preference persists across restarts and is cleared by Reset settings. Playback remains dark in both themes.

Phone loads fixtures eagerly rather than on page entry. A fixture snapshot no older than five minutes appears immediately on restart, followed by parallel fixture/score requests. Matches/Live switches filter the in-memory list without fetching. Visible foreground sessions refresh 30 seconds after the previous update completes; hidden/offline sessions pause polling and refresh on resume/reconnection. Background updates retain the list, scroll position and focused fixture and do not show the central loading box over an existing list. Manual refresh and cold launches still show loading feedback. Tablet and TV keep their previous lazy-loading behavior.

Phone fullscreen uses one three-second idle timer for the Back/commentator bar and bottom playback controls. Touching the picture reveals both without pausing playback. Pause, buffering and connection errors keep controls available; the fade follows the existing animation preference.

Build from the repository root in PowerShell:

```powershell
$env:KAY_TV='0'
$env:KAY_TABLET='0'
./android/build.ps1 -Target aarch64
# dist/KAYLiveSport-android-arm64-debug.apk (Phone)
$env:KAY_TABLET='1'
./android/build.ps1 -Target aarch64
# dist/KAYLiveSport-tablet-arm64-debug.apk
```

Use `-Target armv7` for ARM32. Always set KAY_TV and KAY_TABLET explicitly when switching editions. Tablet updater expects tablet-specific APK asset names in future Android releases; it will not install a Phone asset when the Tablet asset is missing.

The editions keep the existing application ID and certificate for upgrading without clearing settings. They replace each other on a device; they do not install side by side. Existing Phone/Tablet users who want the old layout should install the Tablet APK over their current app. Never uninstall first if settings must be retained.

UI integration checks use mocked network responses and the browser Fullscreen API; they do not establish live provider availability or physical-device playback.

### Phone Android system live notifications (development build)

Settings > Notifications > Phone live notifications is an independent, saved opt-in.
Android 13+ requires the user's notification permission. Denial is shown in the
settings hint; the toggle never changes Android permissions silently.

Native WorkManager checks the football provider with a connected-network constraint,
a minimum 15-minute periodic interval and a 25-second request timeout. It runs
without a WebView, including when the activity is closed or the screen is off.
Doze, offline periods and manufacturer battery restrictions can delay execution;
this is not real-time push. Force stop prevents checks until the user opens the
app again. No server or exact-alarm permission is used.

Only an observed upcoming -> live transition sends a notification. Already-live
fixtures at first enable are baselined. Native preferences retain the baseline
and a 48-hour sent ledger across process restarts. Foreground fixture updates and
the background worker share that ledger. Missing/invalid provider pages do not
clear the baseline. Notification taps return to the app (not direct fixture playback).
Turning the switch off cancels work and notifications. Replacing the shared package
with the TV/Tablet edition cancels Phone background checks.

Validation: four native JUnit tests (parser, sport filtering, state transitions,
finished matches, unavailable pages), JS opt-in/sync/cancel/error tests and existing
Phone data tests passed. ARM64 debug APK built successfully. Physical screen-off
notification delivery has not yet been verified.
