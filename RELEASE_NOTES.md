## KAY LIVE SPORT Android v0.1.28 — Faster Phone loading

Phone now shows a recent saved fixture list immediately and refreshes it in the background, instead of fetching on page entry.

- Starts fixture and ESPN/FotMob score requests in parallel; fixtures appear without waiting for slower score responses.
- Matches / Live switches filter the in-memory list without sending new data requests.
- Refreshes while visible, 30 seconds after the previous update completes. Hidden/offline sessions pause; resume and reconnection trigger an update when needed.
- Deduplicates concurrent refreshes and keeps existing fixtures, scroll position and focused card during background updates.
- Uses fixture snapshots for up to five minutes. Expired snapshots are ignored; failed updates keep the previous list, and valid empty responses clear old cached fixtures.
- Background updates over an existing list use a small status label. Cold launches and manual refresh retain the centered loading feedback.

Tablet and TV retain their existing lazy-loading behavior. Phone Light/Dark themes, fullscreen/Back, search and stream fallback remain available. Windows is unchanged.

### Downloads
- Phone: KAYLiveSport-android-arm64-debug.apk / KAYLiveSport-android-arm32-debug.apk.
- Tablet (previous full Phone/Tablet UI): KAYLiveSport-tablet-arm64-debug.apk / KAYLiveSport-tablet-arm32-debug.apk.
- TV: KAYLiveSport-tv-arm32-debug.apk / KAYLiveSport-tv-arm64-debug.apk.

Install the correct edition over the existing app without uninstalling to preserve settings. All editions use the existing application ID and signing certificate and replace each other rather than installing side by side. Packages remain preview/debug builds.

Validation: shared Rust/UI tests; Phone controlled-network tests for cache-first display, parallel fetches, instant tab switches, deduplication, foreground refresh/background pause, resume, failure retention and cache expiry; Phone fullscreen/theme/layout regressions; Tablet/TV loading/lazy-page regressions; native builds; APK versions, certificates, alignment and uploaded SHA-256 verification. Redmi v0.1.28 update installation succeeded, but physical-device UI/performance testing remains incomplete because the phone locked before the app test connection was established. No measured live-network speedup is claimed.
