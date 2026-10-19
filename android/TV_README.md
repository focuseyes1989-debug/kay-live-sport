# KAY LIVE SPORT TV Preview

TV UI for Xiaomi TV Stick 4K, Android TV and compatible Android boxes (Android 8+).

## Install

Try `dist/KAYLiveSport-tv-arm32-debug.apk` first on a Xiaomi TV Stick 4K. An ARM64 alternative is also supplied. Check the device ABI list with `adb shell getprop ro.product.cpu.abilist` when using ADB; a 64-bit CPU does not guarantee a 64-bit Android app runtime.

Copy the APK to the TV using a file transfer app or USB storage/file manager, allow installation for that installer when Android asks, and install. The app appears in the TV launcher as KAY LIVE SPORT. With an already connected/authorized ADB device, use `adb install -r <APK>`.

This preview has the same application ID/signature as the mobile app. Installing over it retains its settings and replaces its interface with the TV interface. Do not uninstall if you want to retain settings. The updater selects the TV APK matching this build architecture from android-v or tv-v GitHub Releases. It supports update notifications, verified download, progress, Cancel/Resume and Android installer handoff. Android may ask you to allow this app to install updates and confirm installation; settings are retained. The first APK containing the updater must be installed manually.

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

## Older TV WebView compatibility

Android assets include early compatibility helpers for WebView 81 (replaceChildren, replaceAll, Settings popovers, viewport sizing and remote activation). Use `KAY_TV=1 node android/prepare-ui.cjs`, set `KAY_CHROME` to a Chromium 81 executable and run `node android/test-webview81.cjs` for the legacy runtime test. It uses native CDP so current Playwright browser setup is not required in Chromium 81. The test checks actual Chromium 81 script parsing, fixture data loading, Settings, Refresh, directional focus and TV viewport bounds.

TV text fields stay read-only while moving focus. Press OK to edit and open the keyboard; Enter/Back closes editing and returns to remote navigation. Header, sidebar, player and navigation use separate focus zones, and background score refreshes retain the focused fixture. The compact TV layout keeps player controls on screen.
