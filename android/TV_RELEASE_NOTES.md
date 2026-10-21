## KAY LIVE SPORT TV v0.1.19 Preview

TV refreshes match data every 15 seconds and starts fresh while retaining Settings-page preferences.

- Replaces the separate 60-second match refresh and 5-second score refresh timers with a single 15-second match/score refresh timer on TV. Manual Refresh remains available.
- Retains Settings-page choices: Auto play, notification switches, notification sound and volume, animations and speed, expanded Settings section, and time format.
- Clears previous search, match/page filters, last match/commentator, stream cache, player audio/quality and Fit/Fill preferences before shared UI startup. TV opens on Matches without restoring playback.
- Windows and Phone/Tablet startup behavior and refresh timers are unchanged.
- Includes the v0.1.18 button spacing, square-safe launcher banner and simplified Scores/Highlights pages.

### APKs

- KAYLiveSport-tv-arm32-debug.apk: ARM32 / armeabi-v7a, for the existing Xiaomi TV Stick ARM32 installation.
- KAYLiveSport-tv-arm64-debug.apk: ARM64 / arm64-v8a.

Install over the existing app without uninstalling or clearing data. Settings-page preferences are retained; playback and browsing state intentionally reset on startup. Application ID and signing certificate are unchanged. If an older updater reports Signing key differs, transfer the official matching APK with Send to TV and install over the existing app.

Validation: TV/Phone generated refresh intervals, browser restart preference retention/reset, remote navigation, fullscreen/Back, Exit confirmation, and WebView 81 layouts through 4K. Both APK versions, architectures, signatures, alignment and launcher banner verified. Physical Mi Stick behavior has not been verified for this release.
