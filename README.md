# KAY LIVE SPORT

A portable Windows x64 soccer app built with Rust, Wry and WebView2.

## Features

- Live/upcoming match lists, team and league logos, searchable league filters, countdowns and live notifications.
- ESPN scores with FotMob fallback; dated results use the PC's local calendar.
- HLS and HTTP-FLV playback, commentator failover, manual Retry, volume/mute, fullscreen and available HLS quality selection.
- Persistent sidebar, window bounds, filters, last playback, notification preferences and animation settings.
- PC-local clock with 12-hour/24-hour selection.
- GitHub Releases update checks, startup notifications and verified EXE downloads with Install & Restart.
- Goal and update notification sounds with persistent volume, preview and notification switches.
- Scores checked every 5 seconds; sources update independently so delayed fallback responses do not hold up ESPN.

Video availability depends on the stream provider. Scores and video use separate services and may differ in latency. No stream URL or account credentials are embedded in the source.

## Download and run

Download `KAYLiveSport-windows-x64.exe` from [Releases](https://github.com/focuseyes1989-debug/kay-live-sport/releases). Windows x64 and Microsoft Edge WebView2 Runtime are required. Internet access is required for match data and video. No Node.js or local server is needed to run the EXE.

## Build

Install stable Rust with the MSVC toolchain, Microsoft C++ Build Tools with a Windows SDK, and WebView2 Runtime.

```powershell
cargo build --release --locked
```

The executable is `target/release/live-sport.exe`. Logo assets and browser player libraries are embedded. To regenerate logo assets, install Pillow and run `python assets/generate_logo.py`.

## Verification

```powershell
cargo clippy -- -D warnings
cargo test --release --locked
node tests/ui-syntax.cjs
node tests/update.cjs
```

The live-provider integration test is ignored by default because it needs an available broadcast. Additional focused tests are in `tests/`.

## Settings and updates

Settings are stored under `%LOCALAPPDATA%\LiveSport`; existing preferences remain compatible across updates. Reset settings requires confirmation.

Settings > General > Check updates reads stable public releases from this repository. A startup check marks Settings and shows a clickable notification when a newer version is available. Update notifications can be disabled under Notifications; manual checks remain available. Notification audio follows the shared sound switch and volume. Downloads verify the GitHub SHA-256 digest, file size and Windows executable header. Files are saved under `%LOCALAPPDATA%\LiveSport\Updates\<version>` without changing the running EXE. After downloading, choose **Install & Restart**. The updater rechecks the release and checksum, saves window state, waits for the app to close, backs up the old EXE, replaces it and relaunches it. Replacement or launch failures restore the backup. The app folder must be writable. Settings and the WebView profile remain in the same app-data folder. Version 0.1.0 requires a one-time manual replacement to gain this installer.

## Publish a release

Update Cargo.toml's version, run `cargo check` to update Cargo.lock, and commit both. Push a matching tag such as `v0.1.1`. The Windows release workflow validates the version, runs Rust tests, builds Windows x64, and publishes `KAYLiveSport-windows-x64.exe` and third-party license notices. GitHub Actions must be enabled with contents write permission.

## Third-party components

- hls.js: see `dist/HLS-LICENSE.txt`.
- mpegts.js 1.8.2: see `dist/MPEGTS-LICENSE.txt` and `dist/MPEGTS-THIRD-PARTY-LICENSES.txt`.
- Team/league images and remote data remain the property of their respective providers.

## Android preview

The Tauri 2 Android app and ARM64 test APK are documented in [android/README.md](android/README.md). Android releases use `android-v*` tags independently of Windows `v*` releases. The first Android preview was verified on a Redmi Note 15 Pro Plus with Android 16.
