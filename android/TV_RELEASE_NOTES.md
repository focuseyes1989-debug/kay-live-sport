## KAY LIVE SPORT TV v0.1.8 Preview

TV now supports in-app updates from GitHub Releases.

- Shows update notifications and enables Check updates in Settings.
- Selects the TV APK matching the installed build: ARM32 or ARM64. Phone/tablet APKs are never selected by the TV updater.
- Discovers TV assets in tv-v releases and combined android-v releases.
- Downloads with progress and percentage, Cancel/Resume, SHA256 verification and Android installer handoff.
- Retains the existing application ID and signing key so saved settings remain when updating without uninstalling.

### Downloads

- KAYLiveSport-tv-arm32-debug.apk: ARM32 / armeabi-v7a; try this first on Xiaomi TV Stick 4K.
- KAYLiveSport-tv-arm64-debug.apk: ARM64 / arm64-v8a devices.

Android 8+ preview APKs. SHA256 checksums and third-party notices are included.

Install this APK manually once to enable the TV updater. Later updates can be downloaded inside the app. Android may ask you to allow installations from this app and confirm the installation.

### Validation

Updater tests cover edition/architecture separation, release selection, trusted URLs, checksum rejection, range validation and interrupted-download resume. TV UI tests cover remote navigation and the update check/download/install dialog using fixtures. APK version, title, signature and alignment are verified. Physical Mi Stick update installation still needs device testing.
