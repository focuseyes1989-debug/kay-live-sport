## KAY LIVE SPORT TV v0.1.16 Preview

Dedicated TV Settings, Scores and Highlights pages with a simpler navigation rail.

- Removes Search and Results from the side menu, and removes the Settings icon beside the header search box. Header search remains available.
- Adds separate Scores and Highlights destinations instead of combined Results tabs.
- Opens Settings as a full page from the side menu. Update and Reset confirmation dialogs return to that page when closed.
- Removes league filter dropdowns from TV. Saved league choices no longer invisibly restrict the TV lists; existing saved preferences are retained for other editions.
- Keeps remote/touch navigation, fullscreen and Back behavior. Includes the native Back handler fix for using the TV APK on phones/tablets, originally tested on Redmi in v0.1.15.

### APKs

- KAYLiveSport-tv-arm32-debug.apk: ARM32 / armeabi-v7a, for the existing Xiaomi TV Stick ARM32 installation.
- KAYLiveSport-tv-arm64-debug.apk: ARM64 / arm64-v8a.

Install over the existing app without uninstalling or clearing data to retain settings. The application ID and signing certificate are unchanged.

If an older updater reports Signing key differs, transfer the official APK with Send to TV and open it with Android's installer to update over the existing app. Do not uninstall to work around an installation error.

Validation: TV page navigation, hidden filters including saved stale league choices, separate Scores/Highlights destinations, Search, Settings, update dialog, Reset confirmation/Cancel, Watch/Back and Chromium 81 layout/fullscreen checks through 4K. APK version, architecture, signature and alignment verified. The new v0.1.16 page layout has not been tested on a physical Mi Stick.
