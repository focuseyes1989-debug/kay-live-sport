# AsianBookie browser fallback

A shared fallback is available at the top of the match list, even when source
loading fails. A second action is provided beside playback/recovery controls;
Phone moves it into the auto-hiding player toolbar.

Both actions call `open_asianbookie`. Native Windows ShellExecute and Android
ACTION_VIEW open the fixed HTTPS URL https://www.asianbookie.org/en/live in a
browser. No arbitrary URL argument, signed stream URL, chat token or session
identifier is accepted or stored. The user selects a match and follows the
website's advertisement/Close flow. This does not embed or bypass its player.

Android TV requires an installed browser. Failure to launch one is reported in
app, with buttons re-enabled for retry. Light/Dark styling follows the Phone
preference, and ordinary buttons remain in TV remote focus navigation.

Validation: `node tests/asianbookie.cjs` covers Windows, Phone, Tablet and TV UI
with a failing fixture source, native-command dispatch, missing-browser failure
and retry readiness. Native Windows and Android builds compile successfully.
Physical external-browser launch on devices has not been verified.
