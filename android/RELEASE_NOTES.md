## KAY LIVE SPORT Android 0.1.0 preview

Installable, signed **debug APK** for **ARM64 Android 8.0+**. Package: `com.kaylivesport.mobile`.

- Tauri 2 + Rust app sharing the Windows provider and score backend.
- Mobile Matches / Watch navigation, searchable leagues, live scores and dated results.
- HLS/FLV playback where supported by the device, commentator failover, pause/resume, volume and fullscreen.
- Persistent playback/settings, foreground goal notifications, saved notification switches, sound preview and notification volume.
- Compact aligned switches and unclipped Settings labels.
- Landscape player with compact score header, overlay controls that hide/reveal on tap, and a match-list drawer. Video taps reveal controls without pausing.
- Android command bridge isolation, initial network retry, and status/navigation-bar inset fixes.

### Tested

On a Redmi Note 15 Pro Plus running Android 16: 1280×720 FLV playback, pause/resume, volume, native fullscreen, restored playback, sound preview, landscape drawer and auto-hiding controls. Responsive layout checks cover portrait and landscape. See `android/DEVICE_TEST.md` for details and limitations.

Notifications are foreground only. Stream availability depends on the provider and phone WebView/codecs. This preview is not a Play Store/production-signed build. Future updates must use the same signing key to retain app data without uninstalling.

This Android preview does not replace the latest Windows release. Download the APK and SHA-256 file from this release.
