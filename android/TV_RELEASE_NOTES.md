## KAY LIVE SPORT TV v0.1.6 Preview

First TV preview for Xiaomi TV Stick 4K, Android TV and compatible Android boxes (Android 8+).

- Remote directional navigation with green focus highlights, OK selection and Back handling.
- Side-by-side match list and player, readable TV controls and launcher banner.
- Compact landscape preview on phones; fixes navigation items stacking vertically on narrow screens.
- Live playback, commentator selection, fullscreen, Fit/Fill and existing scores/highlights features.

### Downloads

- KAYLiveSport-tv-arm32-debug.apk: ARM32 / armeabi-v7a. Try this first on Xiaomi TV Stick 4K; check the device ABI list if needed.
- KAYLiveSport-tv-arm64-debug.apk: ARM64 / arm64-v8a devices.
- SHA256 checksums and third-party notices are included.

Install the APK using a TV file manager or authorized ADB. These previews retain the existing com.kaylivesport.mobile application ID and signing key: install over the existing app without uninstalling to retain settings. The TV interface replaces the mobile interface on that device. Updates are manual for this preview; the phone ARM64 update channel is disabled.

### Validation

Remote-style Arrow/OK/Back input and Settings navigation passed browser tests at 960x540, 1280x720, 1920x1080 and 806x331. Redmi phone landscape testing verified live Metalist 1925 Kharkiv vs FC Livyi Bereh playback, Pause/Resume, fullscreen entry/exit with hidden system bars, and retention of 10 saved settings. Phone key testing used the app WebView because Redmi blocked ADB input injection. Physical Xiaomi TV Stick playback and its actual Bluetooth remote still need device testing.
