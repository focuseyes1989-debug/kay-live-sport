# Physical device test — 19 October 2026

Device: user-connected Redmi Note 15 Pro Plus, Android 16, ARM64. No phone identifiers or signing secrets are stored in this report.

## Verified

- Signed APK installs and launches.
- Rust command bridge returns the live/upcoming match list (42 fixtures during testing).
- Available provider channel plays HTTP-FLV at 1280×720. Playback time advanced beyond 80 seconds, readyState 4, paused false.
- Pause/resume, player volume adjustment and restoration, native fullscreen entry/exit.
- Saved match/commentator playback restores after installing the updated APK.
- Notification sound preview reaches a running phone AudioContext and retains the saved notification volume. Remote testing does not measure speaker loudness.
- Status/navigation-bar insets and dark system-bar background; landscape controls remain visible.

## Fixed during device testing

The initial mobile adapter replaced Tauri's own `window.ipc`, interfering with Rust commands. The adapter now uses `window.kayMobileIpc` and leaves native Tauri IPC intact. A regression check protects that separation. Initial match-list network failures retry once and show a visible Retry action if still unavailable. Landscape video no longer forces a minimum height that clips playback controls.

One listing fixture returned offline errors for all commentator links. A separate available fixture played successfully; channel availability still depends on the provider. HLS quality switching and actual goal/update notification delivery were not exercised on this physical device. Notifications remain foreground only.

## Landscape refinement

On the Redmi device, the landscape player measured 790×245 CSS pixels in an 806×331 viewport. Bottom tabs are hidden during playback, score/title move to the header, and commentator buttons remain in a compact strip. Verified match drawer opening/closing, overlay controls hiding and revealing on tap, and uninterrupted 1280×720 playback. Landscape video taps reveal controls without pausing the stream.
