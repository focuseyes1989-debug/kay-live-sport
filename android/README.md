# KAY LIVE SPORT Android preview

Tauri 2 + Rust Android app. Shared provider parsing, stream resolution and score fetching live in `../src/provider.rs`, `../src/language.rs`, and `../src/scores.rs`; the Windows app uses the same code. The Android project has its own Cargo.lock and does not change the Windows release workflow.

## Install the test APK

Use `dist/KAYLiveSport-android-arm64-debug.apk` on an ARM64 Android 8.0+ phone. This is a signed debug preview for testing, not a Play Store release. Android asks the phone owner to authorize installation from the app opening the APK. No device settings are changed by the build tools.

The preview includes Matches / Watch navigation, live and upcoming soccer, scores and results, league search, commentator failover, HLS/FLV playback where supported by the phone's WebView, fullscreen, and saved preferences. Notifications work while the app is open. Background push notifications and Android automatic installation are not implemented. Windows EXE update installation is not exposed on Android. Sound starts after a user interaction, following Android WebView audio rules.

Stream availability depends on the provider and phone codecs/WebView. Keep Android System WebView current. Physical-device testing on the connected Redmi Note 15 Pro Plus (Android 16) verified 1280×720 FLV playback, pause/resume, player volume, fullscreen entry/exit, restored playback and the notification sound preview. Other streams/codecs and background behavior need broader testing. See DEVICE_TEST.md.

## Build

Install Java 21, Android SDK platform 36/build-tools 36.0.0/platform-tools, NDK 28.2.13676358, Node.js with npm, and Rust with `aarch64-linux-android`. Set JAVA_HOME, ANDROID_HOME and NDK_HOME. This workspace's `.tools` contains the local development toolchain when created by Codex.

```powershell
cd android
npm ci
node prepare-ui.cjs
./build.ps1
```

The Android project is checked in, so initialization is not required after cloning. Reinitialization can overwrite customized native files.

`build.ps1` defaults to an installable signed debug APK. On Windows without symlink privilege, it copies the successfully built ARM64 Rust library and packages it directly with Gradle; it does not change Windows developer/security settings. Gradle generates or reuses the local Android debug signing key. Keep the same signing key to update an existing preview without uninstalling and losing its app data. Production releases need a separate privately stored signing key; never commit signing secrets.

## Checks

```powershell
node android/prepare-ui.cjs
node tests/android.cjs
node android/test-ui.cjs
cargo test --release --locked
```

`test-ui.cjs` renders a clearly isolated fixture in a headless browser at 390×844 and 844×390, verifies navigation and overflow, and writes preview screenshots under dist. It currently uses the local Chrome executable on Windows. These layout checks do not substitute for an Android device/emulator playback test.

Documentation: https://v2.tauri.app/start/prerequisites/ and https://v2.tauri.app/distribute/sign/android/
