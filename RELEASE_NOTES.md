## KAY LIVE SPORT Windows 0.1.3

- Pre-match waiting area now shows starting XI, formation and substitutes from ESPN, with automatic FotMob fallback when ESPN has no matched fixture, confirmed lineup or a working response.
- Checks both team names and kickoff time before displaying lineups; predicted FotMob lineups are not shown as confirmed.
- Displays the lineup source, refreshes every minute and offers a Refresh line-ups button. Returns to the existing playback flow when the match becomes live.
- Removes the technical Match times / Scores / Streams footer for a cleaner player view.

### Validation

Rust lineup normalization, source identity and predicted/confirmed tests passed. Frontend fallback, stale-match protection and existing UI regression tests passed. Windows x64 EXE built successfully.

### Installation

Windows x64; Microsoft Edge WebView2 Runtime required. Use Settings > General > Check updates, Download, then Install & Restart. Saved settings remain intact. The app folder must be writable. Alternatively replace the existing EXE and retain the existing %LOCALAPPDATA%/LiveSport folder.

Lineup availability depends on ESPN/FotMob coverage and when confirmed teams are published. This release does not include an Android APK; Android 0.1.3 remains available from its separate preview release.
