## KAY LIVE SPORT TV v0.1.21 Preview

Stable remote focus during refresh and a new Myanmar TV page.

- Restores focused fixture cards synchronously by fixture ID when data refresh replaces or reorders cards. If a fixture disappears, selects a nearby remaining card. Background refresh no longer falls back to the match list from Watch/Settings.
- Adds Myanmar TV to the TV navigation rail, with 18 channels from https://www.myanmartvchannels.com/channels/, bundled channel logos, four-column cards and search.
- Plays available public HLS streams in the app player, using its fullscreen, Back and Retry controls. A restricted source-page button opens the channel website when a browser session is needed.
- Refreshes the public channel directory when reachable and uses a bundled directory otherwise. Some channels require source authentication/session or may be unavailable on the current network; channel listing is not a guarantee of playback.
- Retains four-column Matches/Live, 15-second refresh and Settings-only startup persistence.

### APKs

- KAYLiveSport-tv-arm32-debug.apk: ARM32 / armeabi-v7a, for the existing Xiaomi TV Stick ARM32 installation.
- KAYLiveSport-tv-arm64-debug.apk: ARM64 / arm64-v8a.

Install over the existing app without uninstalling or clearing data. Settings-page preferences are retained; playback and browsing state reset on startup. Application ID and signing certificate are unchanged. If an older updater reports Signing key differs, transfer the official matching APK with Send to TV and install over the existing app.

Validation: synchronous focus retention after fixture label/order changes, rail focus, remote navigation, Settings retention/reset, fullscreen/Back and Exit; Myanmar TV directory/search/cards, shared playback routing, Retry and source fallback; Rust directory parsing and URL restrictions; WebView 81 layouts through 4K. DVB public HLS playback progressed at 1280x720 in the browser test. Both native APK builds, versions, architectures, signatures and alignment verified. Physical Mi Stick playback has not been verified for this release.
