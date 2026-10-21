## KAY LIVE SPORT TV v0.1.14 Preview

A living-room TV layout inspired by familiar TV video apps, with remote and touch navigation.

- Fixed left navigation rail for Search, Matches, Live, Results, Watch and Settings.
- Full-width match and highlights card grids for browsing. Selecting a match opens a separate Watch screen; Back returns to browsing.
- Directional remote navigation follows card positions across rows and columns, with visible focus and remembered fixture focus after refresh.
- Search opens the keyboard only after OK; card and navigation taps also work.
- Preserves compact player messages, highlights fullscreen/Back, in-app update controls and certificate compatibility from v0.1.13.

### APKs

- KAYLiveSport-tv-arm32-debug.apk: ARM32 / armeabi-v7a, for the existing Xiaomi TV Stick ARM32 installation.
- KAYLiveSport-tv-arm64-debug.apk: ARM64 / arm64-v8a.

Install over the existing app without uninstalling or clearing data to retain settings. The application ID and signing certificate are unchanged.

If an older updater reports Signing key differs, transfer the official APK with Send to TV and open it with Android's installer to update over the existing app. Do not uninstall to work around an installation error.

Validation: remote grid navigation, touch selection, focus restoration, Search, Settings, update dialog, Watch/Back, player messages and Try stream integration; Chromium 81 layout checks through 4K including highlights fullscreen. APK version, architecture, signature and alignment verified. Physical Mi Stick testing remains outstanding.
