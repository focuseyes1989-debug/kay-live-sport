# Phone and Tablet editions

The Phone edition has one fixture page with Matches and Live tabs. Selecting a fixture opens the immersive player immediately. Scheduled fixtures with provider channels attempt playback too; fixtures without a stream show the waiting state. Back stops playback and returns to the same list/filter. Commentator selection, Fit/Fill, Retry, settings, search and refresh remain available. Results, Highlights and Myanmar TV are not part of the Phone navigation.

The Tablet edition retains the previous Phone/Tablet layout and its existing pages. TV remains unchanged.

Phone does not show the league filter and ignores a previously saved league selection without overwriting it for Tablet. Settings → Appearance has Light/Dark buttons. Light is the default; the Phone theme preference persists across restarts and is cleared by Reset settings. Playback remains dark in both themes.

Phone loads fixtures eagerly rather than on page entry. A fixture snapshot no older than five minutes appears immediately on restart, followed by parallel fixture/score requests. Matches/Live switches filter the in-memory list without fetching. Visible foreground sessions refresh 30 seconds after the previous update completes; hidden/offline sessions pause polling and refresh on resume/reconnection. Background updates retain the list, scroll position and focused fixture and do not show the central loading box over an existing list. Manual refresh and cold launches still show loading feedback. Tablet and TV keep their previous lazy-loading behavior.

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
