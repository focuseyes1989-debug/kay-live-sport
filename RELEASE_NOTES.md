## KAY LIVE SPORT Android v0.1.29 — Phone tab label fix

Fixes the Phone navigation label: Matches now stays visible when Live is selected. The Phone-specific text visibility rule overrides the older mobile navigation rule that hid inactive labels.

The fix applies in portrait and landscape and in Light and Dark themes. Includes regression checks for inactive Matches text and the Live label. Phone cache-first loading, background updates, fullscreen/Back and saved settings remain available. Tablet, TV and Windows UI behavior is unchanged.

### Downloads
- Phone: KAYLiveSport-android-arm64-debug.apk / KAYLiveSport-android-arm32-debug.apk.
- Tablet (full UI): KAYLiveSport-tablet-arm64-debug.apk / KAYLiveSport-tablet-arm32-debug.apk.
- TV: KAYLiveSport-tv-arm32-debug.apk / KAYLiveSport-tv-arm64-debug.apk.

Install the matching edition over the existing app without uninstalling to preserve settings. All editions retain the existing application ID and signing certificate; editions replace each other on a device. APKs remain preview/debug builds.

Validation: Phone UI regression tests covering inactive labels, themes, portrait/landscape, fullscreen/Back, search and layout; six native APK builds; APK version/edition/architecture, signing certificate, alignment and uploaded SHA-256 verification. Physical-device verification of this label fix is not included.
