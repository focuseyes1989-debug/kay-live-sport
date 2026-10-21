## KAY LIVE SPORT TV v0.1.17 Preview

Compact TV playback with direct remote navigation and confirmed app exit.

- Removes TV volume/mute controls and the sidebar KAY heading. Use the TV/receiver volume controls; saved Phone/Tablet audio preferences are retained.
- Compacts sidebar spacing, match information and playback controls to give the player more room.
- Left moves directly to the side menu; Right returns to page content. Supports remote OK key variants and restores match focus after list refresh so Enter selects immediately. Stream startup still depends on the source/network.
- Clicking or pressing OK on the player opens fullscreen. Back leaves fullscreen while keeping the app open.
- Two quick normal Back presses open an Exit confirmation. Another Back or the Exit button closes the app; Cancel keeps it open. Held-key repeats do not confirm exit.
- Retains separate Settings, Scores and Highlights pages.

### APKs

- KAYLiveSport-tv-arm32-debug.apk: ARM32 / armeabi-v7a.
- KAYLiveSport-tv-arm64-debug.apk: ARM64 / arm64-v8a.

Install over the existing app without uninstalling or clearing data to retain settings. The application ID and signing certificate are unchanged.

If an older updater reports Signing key differs, transfer the official APK with Send to TV and open it with Android's installer to update over the existing app without uninstalling.

Validation: remote Left/Right/OK, match selection after refresh, compact player layouts, click/OK fullscreen, Back, Exit confirmation/Cancel and confirmed native exit request; Chromium 81 layouts through 4K. Both native APK builds, versions, architectures, signatures and alignment verified. Native exit request was tested with a mocked bridge; physical Mi Stick exit has not been verified.
