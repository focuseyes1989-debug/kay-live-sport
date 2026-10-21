## KAY LIVE SPORT TV v0.1.20 Preview

Matches and Live now display four compact fixture cards per row on TV.

- Uses a four-column grid on Matches and Live, with smaller crests, text and card spacing.
- Keeps Scores and Highlights layouts unchanged.
- Remote Up/Down navigation follows the four-column grid.
- Retains the 15-second TV data refresh and Settings-only startup persistence from v0.1.19.

### APKs

- KAYLiveSport-tv-arm32-debug.apk: ARM32 / armeabi-v7a, for the existing Xiaomi TV Stick ARM32 installation.
- KAYLiveSport-tv-arm64-debug.apk: ARM64 / arm64-v8a.

Install over the existing app without uninstalling or clearing data. Settings-page preferences are retained; playback and browsing state intentionally reset on startup. Application ID and signing certificate are unchanged. If an older updater reports Signing key differs, transfer the official matching APK with Send to TV and install over the existing app.

Validation: four-card row geometry and spacing at widths 806, 960, 1280 and 1920; remote navigation, Settings retention/reset, fullscreen/Back and Exit confirmation; WebView 81 layouts through 4K. Both APK versions, architectures, signatures, alignment and launcher banner verified. Physical Mi Stick behavior has not been verified for this release.
