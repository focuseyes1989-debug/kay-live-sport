## KAY LIVE SPORT 0.1.2

- Startup update notifications open the update dialog directly when clicked.
- New persistent Update notifications switch under Settings > Notifications. Manual update checks remain available when notifications are off.
- Update notifications use the shared Notification sound switch and saved volume.
- Score polling reduced from 15 seconds to 5 seconds. ESPN and FotMob responses update independently, and date requests run in parallel, reducing delays caused by slower fallback requests.
- Scoreboard match status text now uses the green highlight color.

### Installation

Windows x64; Microsoft Edge WebView2 Runtime required. From version 0.1.1, use Settings > General > Check updates, Download, then Install & Restart. Saved settings remain intact. The app folder must be writable.

Version 0.1.0 requires a one-time manual EXE replacement. Keep the existing `%LOCALAPPDATA%\LiveSport` folder to retain settings.

Goal notifications use the same score data as the scoreboard. Polling improvements cannot eliminate delays in the providers' own score feeds.
