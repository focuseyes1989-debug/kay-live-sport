## KAY LIVE SPORT v0.1.11

Adds stream route fallback on Windows, Android TV and Phone/Tablet.

- Tries the provider-published alternate HLS CDN, then the original stream, before switching commentator.
- Remembers routes that produced video for up to five minutes to recover from temporary resolver outages. Cached playback does not extend the cache lifetime; Reset settings clears it.
- Uses bounded resolver timeouts, preserves signed stream queries and cancels stale recovery attempts after manual selection.
- Includes the TV WebView 81 compatibility and compact remote navigation improvements.

### Downloads

- KAYLiveSport-windows-x64.exe: Windows x64; Microsoft Edge WebView2 required.
- KAYLiveSport-android-arm64-debug.apk: KAY LIVE SPORT Phone/Tablet, ARM64.
- KAYLiveSport-tv-arm32-debug.apk: KAY LIVE SPORT TV, ARM32 / armeabi-v7a.
- KAYLiveSport-tv-arm64-debug.apk: KAY LIVE SPORT TV, ARM64 / arm64-v8a.

Install the Android APK over the existing app without uninstalling to retain settings. TV and Phone/Tablet share the existing application ID and signing key; choose the edition and architecture for your device. Android in-app update discovery uses companion android-v0.1.11 with the same APKs.

Validation: Rust and shared UI tests, route exhaustion and cancellation, cache expiry and non-renewal, Android APK signatures and TV UI on Chromium 81. Physical Mi Stick playback has not been verified.

Network limitation: alternate CDN fallback does not guarantee VPN-free playback. On the tested Redmi network with VPN disabled, the alternate CDN timed out as well. If both the resolver and media servers are unreachable, the app cannot create a working stream route; a valid recent cache only helps temporarily. No PC/server helper is required.
