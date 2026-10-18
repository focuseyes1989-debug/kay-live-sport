## KAY LIVE SPORT 0.1.1

- Download verified updates inside the app, then choose **Install & Restart**. Saved preferences and window state remain intact; replacement or launch failures restore the previous EXE.
- Goal notifications show the scoring team and updated score. Click a notification to open that live match.
- New notification sound switch and independent 0–100% volume slider, with preferences saved across restarts.
- Speaker icon with **Test sound** tooltip previews the chosen volume.
- Sound controls slide in and out when toggled, respecting the Animations setting and Slow / Normal / Fast speed.
- Initial scores, duplicate updates, score corrections and source changes do not produce repeated goal alerts.

### Updating from 0.1.0

Version 0.1.0 needs a one-time manual EXE replacement to gain Install & Restart. Close the app, replace its EXE with `KAYLiveSport-windows-x64.exe`, and reopen it. Keep the existing `%LOCALAPPDATA%\LiveSport` folder to retain settings. Future releases can be installed inside version 0.1.1 and later. The app folder must be writable.

Windows x64; Microsoft Edge WebView2 Runtime required. Goal alerts follow score polling (15 seconds) and provider latency.
