## KAY LIVE SPORT Windows v0.1.13 / Android v0.1.24

- Replaces MatchHighlights with a direct HooFoot highlights catalog, grouped by league with Today / Yesterday controls. Dates reflect the source match date and the device calendar.
- Tries ESPN official embedded recaps/highlights first. When no matching official video is available, opens the HooFoot fallback in the device browser. The fallback button remains available for player errors or regional restrictions. Official embeds can contain ads; native KAY-player playback of all highlights is not included.
- Retains usable catalog results when a slow source response is interrupted, with a partial-results notice.
- Removes seven unavailable Myanmar TV channels (5 Plus, Channel K, Fortune TV, HEY Play, M Channel, Mahar and Mahar Esports). The remaining 11 channels passed playlist and media-segment checks at verification time. Refresh cannot restore the removed entries.
- Adds a compact icon-only Windows navigation sidebar with tooltips and active-state highlighting.
- Removes the Search navigation item from Phone/Tablet; the header search box remains available.
- Improves Myanmar TV fallback routes and retry error messages.

### Downloads and updates

Windows: KAYLiveSport-windows-x64.exe (WebView2 required).
Phone/Tablet: KAYLiveSport-android-arm64-debug.apk or KAYLiveSport-android-arm32-debug.apk.
TV: KAYLiveSport-tv-arm32-debug.apk or KAYLiveSport-tv-arm64-debug.apk.

Select the existing edition and architecture and install over the existing app to preserve settings. Android artifacts retain the existing package ID and signing certificate. Companion Android update release: android-v0.1.24. The Android packages remain preview/debug builds.

Validation: Rust tests and all shared UI tests passed. Windows, Phone/Tablet and TV UI integration tests passed for highlights selection, official-player rendering, browser fallback, date grouping, Myanmar TV and lazy loading. Official-video lookup was checked against ESPN's public API. Redmi verified live playback and HooFoot browser playback in earlier test builds; official embed playback on hardware remains unconfirmed. APK signature/version/alignment and release asset checksums are checked for the final builds. Stream availability and region restrictions remain controlled by providers.
