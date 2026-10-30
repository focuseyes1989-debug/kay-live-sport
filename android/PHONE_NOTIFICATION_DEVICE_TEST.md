# Redmi Phone live notification device verification

Date: 2026-10-30 (Asia/Rangoon)
Device: Redmi 2510ERA8BC, ADB 19651d3e
Build: Phone 0.1.30 development build; dist/KAYLiveSport-phone-background-notifications.apk

- Update installed with `adb install -r`; no uninstall or app data clearing.
- Android POST_NOTIFICATIONS granted by user.
- Home/background test: controlled upcoming-to-live baseline using real provider
  fixtures; a debug one-time request used the same PhoneLiveWorker as production.
  Four LIVE notifications were registered by Android while MIUI Home was foreground.
- This does not measure the production periodic 15-minute delivery latency.
- Screen-off test: power state Dozing confirmed. Android JobScheduler reports the
  app jobs `Restricted due to: frozen`, standby bucket RARE, and CONNECTIVITY
  unsatisfied. The due one-time test job remains inactive, including after an
  explicit scheduler run request. No fresh screen-off notification was verified.
- Separate instrumentation test APK install was rejected by Redmi with
  INSTALL_FAILED_USER_RESTRICTED. No security restriction was bypassed.
- Pending user action: set KAY LIVE SPORT Battery saver to No restrictions and
  allow Background autostart if available; open app with screen awake. Then
  prepare another controlled test, turn screen off, and verify fresh notification
  timestamps and unchanged settings. Do not report prior notices as new delivery.

Helpers under .tools: seed-phone-bg-test.cjs, phone-worker-status.py,
check-phone-background-notices.py. Own-app Home test evidence:
.tools/phone-bg-home-evidence.txt. Initial preference snapshot:
.tools/phone-bg-settings-before.json.
