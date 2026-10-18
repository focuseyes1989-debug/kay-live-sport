## KAY LIVE SPORT Android 0.1.2 preview

Signed ARM64 debug APK for Android 8.0+. Package: `com.kaylivesport.mobile`.

- APK download progress bar with percentage and downloaded/total MB.
- Cancel download stops the active request and restores the Download update button.
- Retry resumes the saved partial APK using HTTP Range, including after network interruptions or an app restart.
- Partial files are tied to the release URL, SHA-256 and size. Changed assets restart safely; servers that ignore Range restart from zero, and invalid range responses are rejected.
- APK verification completes before Install update becomes available. Existing settings are preserved when updating in place with the same signing key.

### Validation

Rust tests cover interrupted downloads, resumed HTTP 206 responses, full-download fallback, changed assets, invalid ranges and checksum verification. Frontend tests cover progress, cancellation, retry, install-button gating, errors and Windows updater compatibility. The real GitHub download and Android installer flow was previously tested on the connected Redmi with version 0.1.1, preserving all six saved preferences. Resume-specific tests use a local HTTP server; device end-to-end testing of the new 0.1.2 release remains pending.

### Install

Use the app's update notification or General > Check for updates, then Download update and Install update. Android requires your installation confirmation; first-time installation may also require permission to install from KAY LIVE SPORT. Do not uninstall the existing app if you want to retain settings.

This is a debug-signed Android preview, not a Play Store production build. Notifications are foreground only. This Android prerelease leaves the latest Windows release unchanged.
