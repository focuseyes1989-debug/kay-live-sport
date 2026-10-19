## KAY LIVE SPORT TV v0.1.10 Preview

Fixes startup and controls on older TV WebViews and refines the remote-first TV interface.

- Supports WebView 81: removes unsupported Android bridge syntax and adds replaceChildren/replaceAll and Settings popover fallbacks.
- Fixes match data stuck at Loading, nonresponsive Settings/Refresh and hidden components appearing on screen.
- Sizes the layout using the actual viewport, including 540p, 720p and 1080p, without requiring dynamic viewport unit support.
- Uses a compact header, match cards, commentary controls and navigation bar to give the player more room.
- Keeps search fields read-only while navigating; OK/Enter opens editing and the keyboard. Enter/Back returns to remote navigation.
- Adds native keyboard show/hide support and handles IME dismissal.
- Uses separate header/sidebar/player/navigation focus zones, throttles held direction keys and retains the focused fixture during background score refreshes.
- Retains architecture-aware TV updates, Try stream and saved settings.

### Downloads

- KAYLiveSport-tv-arm32-debug.apk: ARM32 / armeabi-v7a; try this first on Xiaomi TV Stick 4K.
- KAYLiveSport-tv-arm64-debug.apk: ARM64 / arm64-v8a devices.

Android 8+ preview APKs. SHA256 checksums and third-party notices are included. Install over the existing app without uninstalling to retain settings. If an old build cannot load on WebView 81, install this APK manually once.

### Validation

Actual Chromium 81 tests passed for script parsing, fixture data loading, Settings OK/Back, Refresh, search keyboard activation requests, remote focus and 540p/720p/1080p layout bounds. Modern browser tests also cover focus retention after list replacement, TV update UI and phone UI compatibility. ARM32/ARM64 APK builds, signatures, alignment and checksums are verified. Physical Mi Stick remote/IME behavior still needs confirmation on the device.
