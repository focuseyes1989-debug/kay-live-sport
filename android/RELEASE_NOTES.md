## KAY LIVE SPORT Android 0.1.1 preview

Signed ARM64 debug APK for Android 8.0+. Package: `com.kaylivesport.mobile`.

- Checks Android GitHub releases on startup and shows a clickable update notification.
- Downloads APK updates inside the app, verifies GitHub SHA-256 and size, and opens Android's installer.
- Verifies package ID, newer version code and matching signing certificate before installation. Updates retain saved settings without uninstalling.
- Uses the saved update notification, notification sound and volume preferences.
- Cleaner football + Play launcher icon, with adaptive, round and themed icon support; matching Android header logo.

### Installation

Install this APK over Android 0.1.0 without uninstalling to preserve settings. Version 0.1.0 needs this one-time manual update; version 0.1.1 supports future in-app updates. Android may ask you to allow installation from this app. Grant permission yourself, return to KAY LIVE SPORT and tap Install update again, then confirm Update in Android. Tap Open after installation.

### Validation

APK build, signing and 16 KB alignment checks passed. Rust updater integrity/release-selection tests and frontend tests passed, including Windows updater regression checks and Android installer UI states. Connected Redmi device checks confirmed in-place installation preserves saved preferences and GitHub version checks/native installer bridge work. A real future-release download followed by user-confirmed Android installation remains untested end to end.

Notifications are foreground only. This is a debug-signed preview; future APKs must retain the same package ID and signing key. This Android prerelease does not replace the latest Windows release.
