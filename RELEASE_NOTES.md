## KAY LIVE SPORT v0.1.9

Scheduled matches with commentator links now have a Try stream button on Windows, TV and Phone/Tablet.

- Refreshes commentator links before attempting playback without changing the source match status to Live.
- Shows the player and commentator choices while hiding the pre-match lineup overlay during manual playback.
- Keeps normal stream failover and reconnect behavior, and rejects stale requests after switching matches.
- Hides Try stream for finished matches, live matches and fixtures without commentator links.
- Fixes Android match-selection forwarding so manual playback and reconnect arguments reach the shared player.

### Downloads

- KAYLiveSport-windows-x64.exe: Windows x64; Microsoft Edge WebView2 required.
- KAYLiveSport-android-arm64-debug.apk: KAY LIVE SPORT Phone/Tablet, ARM64.
- KAYLiveSport-tv-arm32-debug.apk: KAY LIVE SPORT TV, ARM32 / armeabi-v7a.
- KAYLiveSport-tv-arm64-debug.apk: KAY LIVE SPORT TV, ARM64 / arm64-v8a.

Android APKs are Android 8+ previews. Install over the existing app without uninstalling to retain settings. TV and Phone/Tablet share the existing application ID and signing key; select the edition and architecture you want on that device. Android update discovery uses companion android-v0.1.9; TV selects its matching TV APK.

Validation covers manual scheduled playback, fresh commentator links, unchanged status, failures/stale selections, existing recovery/autostart/lineups, and Windows/Phone/TV UI integration. Source stream availability is still controlled by the broadcaster.
