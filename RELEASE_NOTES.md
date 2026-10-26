## KAY LIVE SPORT Android v0.1.27 — Phone and Tablet editions

### Phone
- New single-page Matches / Live navigation, search and direct fullscreen playback when a fixture is selected.
- Tries available provider channels even when a fixture is still marked Scheduled. Fixtures without links show the waiting state.
- Back stops playback and returns to the fixture list. Commentator selection, Retry and Fit / Fill remain available in fullscreen.
- Removes the league filter and ignores old league selections without overwriting Tablet preferences.
- Light theme by default, with persistent Light / Dark buttons under Settings → Appearance.
- Clear, centered data-loading messages in both themes.
- Clean tab backgrounds, compact landscape controls and a single-row landscape header.

### Tablet and TV
- Tablet keeps the previous Phone/Tablet layout, including Scores, Highlights and Myanmar TV.
- Tablet has its own APK/update asset names; Phone and Tablet labels now identify the edition.
- TV retains its current UI. TV APKs are included to keep the shared Android update channel complete.

### Downloads and settings
- Phone: KAYLiveSport-android-arm64-debug.apk or KAYLiveSport-android-arm32-debug.apk.
- Tablet: KAYLiveSport-tablet-arm64-debug.apk or KAYLiveSport-tablet-arm32-debug.apk.
- TV: KAYLiveSport-tv-arm32-debug.apk or KAYLiveSport-tv-arm64-debug.apk.

Existing Phone/Tablet users who prefer the old layout should install the Tablet APK. All editions retain the existing application ID and signing certificate: install over the current app without uninstalling to preserve settings. Editions replace each other rather than installing side by side. Packages remain preview/debug builds. Windows is unchanged in this release.

Validation: shared Rust/UI tests, Phone integration checks for theme persistence, league-filter removal, fullscreen/Back and responsive tab geometry; Tablet/TV loading and lazy-page regressions; native builds; APK versions, signing certificates, alignment and uploaded SHA-256 verification. Redmi update installation was verified during development, but physical-device UI/playback testing remains incomplete because the device was asleep/disconnected.
