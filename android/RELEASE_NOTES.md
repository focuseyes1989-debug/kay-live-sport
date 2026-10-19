## KAY LIVE SPORT Android 0.1.3 preview

Signed ARM64 debug APK for Android 8.0+. Package: `com.kaylivesport.mobile`.

### Fullscreen

- Immersive fullscreen hides status/navigation bars and removes content insets in portrait and landscape; normal insets return on exit.
- Fit / Fill controls: Fit shows the complete picture; Fill covers the screen by cropping edges while preserving the video aspect ratio.
- Saves the selected Fit / Fill mode across app restarts.

### Navigation and interface

- Rounded dark bottom navigation with green active highlights: Matches, Search, LIVE, Results and Watch.
- LIVE uses red text in place of its icon.
- Removes the duplicate Match centre filter buttons and old header show/hide button; bottom navigation remains available in landscape outside fullscreen.
- Compact refresh notification toast and hidden technical time/score/provider footer.

### Pre-match lineups

- Shows starting XI, formation and substitutes in the waiting area for upcoming football fixtures.
- Matches both teams and kickoff time before using ESPN or FotMob data. Falls back to FotMob when ESPN has no matching fixture, no confirmed lineup or a request error.
- Shows the data source, refreshes every minute and includes a manual Refresh line-ups button.
- Does not present predicted FotMob lineups as confirmed. Shows a clear unavailable/not-announced state when neither source provides a confirmed lineup.
- Returns to the existing playback flow when the match becomes live.

### Validation and installation

Rust normalization, match-identity and predicted-lineup tests, frontend fallback/stale-selection tests, and portrait/landscape UI checks passed. Fit / Fill restoration and navigation actions are covered. ESPN and FotMob public responses were checked, and development APKs were installed in place on the connected Redmi. End-to-end physical-device rotation/immersive-bar checks and this release's in-app installer upgrade remain pending.

Update from the app's Check for updates or install this APK over the existing app without uninstalling. Confirm installation in Android when asked. The package ID and signing key are unchanged so saved settings are retained. This is a debug-signed preview; notifications are foreground only. This Android prerelease does not replace the latest Windows release.
