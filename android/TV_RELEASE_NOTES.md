## KAY LIVE SPORT TV v0.1.13 Preview

Compact TV layout and update installer compatibility for ARM32 and ARM64 devices.

- Smaller header, buttons, navigation, match cards and commentary controls. The sidebar is capped so large displays leave more room for video.
- Highlights use the available player height on older WebViews without relying on aspect-ratio. Adds a remote-accessible Fullscreen / Exit button and Back support.
- Adds legacy certificate lookup when Android does not return modern SigningInfo. Unreadable certificates and actual signing-key mismatches have separate errors; unknown or different keys remain blocked.
- Includes compact Connecting/Reconnecting, Error with Retry, and Connected player messages. Connected appears after video progress and dismisses after three seconds.

### APKs

- KAYLiveSport-tv-arm32-debug.apk: ARM32 / armeabi-v7a; use this for the existing Xiaomi TV Stick ARM32 installation.
- KAYLiveSport-tv-arm64-debug.apk: ARM64 / arm64-v8a.

Both use application ID com.kaylivesport.mobile and the same signing certificate as the published TV v0.1.10 and v0.1.11 APKs. Install over the existing app without uninstalling or clearing data to retain settings.

If an older in-app updater still reports Signing key differs, transfer this official APK using Send to TV and open it with the Android installer to update over the existing app. The old updater cannot repair itself before installation. If Android itself rejects the update, keep the installed app and its data for diagnosis.

Validation: shared UI tests, four certificate fallback/mismatch unit tests, remote Settings/navigation tests, and Chromium 81 layout checks at 960x540, 1280x720, 1920x1080 and 3840x2160 including highlights fullscreen and Back. APK signatures, version, architecture and alignment verified. These are runtime/layout checks; the updated APK has not been tested on the physical Mi Stick.
