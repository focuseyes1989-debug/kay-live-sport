## KAY LIVE SPORT Windows v0.1.12 / Phone-Tablet v0.1.23

Myanmar TV and page-entry lazy loading are now available on Windows and Phone/Tablet.

- Adds a Myanmar TV destination with 18 channels, bundled logos and search, based on https://www.myanmartvchannels.com/channels/.
- Uses the shared in-app player for available public HLS streams, with Retry, fullscreen and a restricted source-website fallback. Some channels require a browser session or remain unavailable on the current network.
- Replaces continuous match/score, lineup and highlights polling with page-entry fetching and short-lived caches. Manual Refresh forces a request for the current page.
- Live score and goal/live notifications update when page-entry or manual refresh obtains new data, rather than continuously in the background.
- Preserves Windows and Phone/Tablet settings. Includes the existing TV lazy-loading and focus behavior through a shared channel backend/UI.
- Phone/Tablet ARM32 updates now select the ARM32 APK.

### Downloads

- KAYLiveSport-windows-x64.exe: Windows x64; Microsoft Edge WebView2 required.
- KAYLiveSport-android-arm64-debug.apk: Phone/Tablet ARM64, including the Redmi test device.
- KAYLiveSport-android-arm32-debug.apk: Phone/Tablet ARM32.

Companion Android release: android-v0.1.23. It also includes matching TV ARM32/ARM64 APKs to preserve compatibility with existing TV update discovery. TV and Phone/Tablet use the existing application ID and signing key; select the matching edition/architecture and install over the existing app without uninstalling to retain settings.

Validation: shared Rust directory parsing and source URL restrictions, shared UI unit tests, desktop/touch lazy-loading cache and request tests, Myanmar TV list/search/player/source controls, mobile layouts from portrait phones to landscape tablets, TV regressions and WebView 81. DVB public HLS playback progressed at 1280x720 in Windows and Phone browser tests. Native EXE/APK builds and APK version/signature/alignment checks passed. Physical Mi Stick/Redmi performance has not been benchmarked for this change.
