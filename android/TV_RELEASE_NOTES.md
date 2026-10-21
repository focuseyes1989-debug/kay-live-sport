## KAY LIVE SPORT TV v0.1.18 Preview

Separated remote controls and simpler Scores/Highlights pages for TV.

- Fixes button spacing on older Mi Stick WebView 81, including the side menu, dialogs, playback controls and settings. Focus highlights stay inside controls instead of overlapping neighbors.
- Replaces the TV launcher banner with centered square-safe artwork so branding remains visible when the launcher crops its tile. Uses a density-independent banner resource.
- Removes date and league filter controls from TV Scores/Highlights. Scores automatically includes today and yesterday; Highlights shows publications from both days. Header Refresh remains available.
- Ignores stale saved date/league choices on TV without deleting preferences used by other editions.
- Includes the v0.1.17 compact player, direct Left/Right navigation, fullscreen/Back and confirmed Exit behavior.

### APKs

- KAYLiveSport-tv-arm32-debug.apk: ARM32 / armeabi-v7a, for the existing Xiaomi TV Stick ARM32 installation.
- KAYLiveSport-tv-arm64-debug.apk: ARM64 / arm64-v8a.

Install over the existing app without uninstalling or clearing data to retain settings. Application ID and signing certificate are unchanged. If an older updater reports Signing key differs, transfer the official matching APK with Send to TV and install over the existing app.

Validation: WebView 81 button geometry/focus, layouts through 4K, remote navigation, fullscreen/Back, Exit confirmation, hidden filters and today/yesterday score queries. Both APK builds, versions, architectures, signatures, alignment and packaged banner verified. These changes have not been verified on a physical Mi Stick.
