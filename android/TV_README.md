# KAY LIVE SPORT TV Preview

TV UI for Xiaomi TV Stick 4K, Android TV and compatible Android boxes (Android 8+).

## Install

Try `dist/KAYLiveSport-tv-arm32-debug.apk` first on a Xiaomi TV Stick 4K. An ARM64 alternative is also supplied. Check the device ABI list with `adb shell getprop ro.product.cpu.abilist` when using ADB; a 64-bit CPU does not guarantee a 64-bit Android app runtime.

Copy the APK to the TV using a file transfer app or USB storage/file manager, allow installation for that installer when Android asks, and install. The app appears in the TV launcher as KAY LIVE SPORT. With an already connected/authorized ADB device, use `adb install -r <APK>`.

This preview has the same application ID/signature as the mobile app. Installing over it retains its settings and replaces its interface with the TV interface. Do not uninstall if you want to retain settings. Updates are manual in this preview; it does not use the ARM64 phone update feed.

## Remote

- Arrow keys: move focus between cards, navigation and player/settings controls.
- OK: activate the focused button. On a search field, use the TV keyboard.
- Back: exit fullscreen, dismiss a dialog/Settings or return to Matches; from Matches, exit the app.
- Play/Pause media key: toggle live playback when supported by the remote/WebView.
- Embedded YouTube controls receive the remote after focus enters the video. Back returns to the app.

## Build and validation

`./android/build-tv.ps1 -Target armv7` builds ARM32; use `-Target aarch64` for ARM64. Install the Rust `armv7-linux-androideabi` target first for ARM32.

TV assets are included only for the TV build; normal phone builds retain the mobile interface. `KAY_TV=1 node android/prepare-ui.cjs` followed by `node android/test-tv-ui.cjs` runs the remote/layout browser checks. Clear KAY_TV and prepare again for mobile tests.

Automated checks cover directional navigation, OK, Back, Settings focus containment and 960x540 / 1280x720 / 1920x1080 layouts. APK signatures, alignment and ABIs are checked separately. Physical Mi Stick remote, WebView video codec support and live playback still need testing on the actual device.

Launcher setup follows the Android TV requirements: https://developer.android.com/training/tv/get-started/create
