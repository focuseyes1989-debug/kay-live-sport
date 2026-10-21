## KAY LIVE SPORT Windows v0.1.14 / Android v0.1.25

Adds compact page-data loading progress on Windows, Phone/Tablet and TV.

- Shows the data being fetched (matches, scores, highlights, Myanmar TV channels or line-ups), with completed and pending request counts.
- Uses an indeterminate progress bar while response sizes are unknown. The bar completes when requests settle; it does not invent a download percentage.
- Shows completion or partial/error feedback and dismisses it automatically. Cached page entries do not trigger unnecessary loading requests.
- Keeps concurrent and sequential loading stages together without adding background data polling. The indicator does not capture mouse or remote focus and is hidden in fullscreen playback.

### Downloads

- Windows x64: KAYLiveSport-windows-x64.exe (WebView2 required).
- Phone/Tablet: KAYLiveSport-android-arm64-debug.apk or KAYLiveSport-android-arm32-debug.apk.
- TV: KAYLiveSport-tv-arm32-debug.apk or KAYLiveSport-tv-arm64-debug.apk.

Install the matching edition and architecture over the existing app to preserve settings. Android packages retain the existing application ID and signing certificate and remain preview/debug builds. Companion Android update release: android-v0.1.25.

Validation: shared Rust/UI tests, three-edition progress integration tests (concurrent loading, completion counts, failures and unchanged RPC results), Myanmar TV and lazy-loading regression tests, native builds, APK version/signature/alignment and uploaded SHA-256 checksums. Physical-device verification of this new indicator is not included.
