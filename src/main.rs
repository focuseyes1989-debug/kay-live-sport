#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod language;
mod provider;
use provider::{client, matches, resolve};
#[cfg(test)]
use provider::{get, parse_matches};
mod scores;
mod lineups;
mod updater;
mod window_state;
use serde_json::{Value, json};
use tao::{
    event::{Event, WindowEvent},
    event_loop::{ControlFlow, EventLoopBuilder},
    window::{Fullscreen, Icon, WindowBuilder},
};
use wry::{WebContext, WebViewBuilder};

fn notification_audio(volume: f64) -> Vec<u8> {
    let mut sound = include_bytes!("../assets/goal-notification.wav").to_vec();
    // Bundled file: mono PCM16 WAV, 44-byte header. Scale samples only;
    // never change the video volume or the Windows mixer.
    let gain = if volume.is_finite() {
        volume.clamp(0.0, 100.0) / 100.0
    } else {
        1.0
    };
    for sample in sound[44..].chunks_exact_mut(2) {
        let value = i16::from_le_bytes([sample[0], sample[1]]);
        sample.copy_from_slice(&((f64::from(value) * gain).round() as i16).to_le_bytes());
    }
    sound
}
fn play_notification_sound(args: &Value) -> Result<Value, String> {
    static SOUND_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());
    let _lock = SOUND_LOCK
        .try_lock()
        .map_err(|_| "Notification sound is already playing")?;
    #[link(name = "winmm")]
    unsafe extern "system" {
        fn PlaySoundW(sound: *const u16, module: *mut std::ffi::c_void, flags: u32) -> i32;
    }
    let volume = args["volume"].as_f64().unwrap_or(100.0).clamp(0.0, 100.0);
    if volume == 0.0 {
        return Ok(json!({"played":false}));
    }
    let sound = notification_audio(volume);
    // Synchronous on the IPC worker: keep the scaled buffer alive until playback ends.
    let played =
        unsafe { PlaySoundW(sound.as_ptr().cast(), std::ptr::null_mut(), 0x0002 | 0x0004) };
    if played == 0 {
        return Err("Notification audio unavailable".into());
    }
    Ok(json!({"played":true}))
}
fn main() -> Result<(), Box<dyn std::error::Error>> {
    if updater::run_helper() {
        return Ok(());
    }
    let event_loop = EventLoopBuilder::<String>::with_user_event().build();
    let app_data = std::env::var_os("LOCALAPPDATA")
        .map(std::path::PathBuf::from)
        .unwrap_or_else(std::env::temp_dir)
        .join("LiveSport");
    std::fs::create_dir_all(&app_data)?;
    let settings_path = app_data.join("window.json");
    let mut monitors = Vec::new();
    if let Some(primary) = event_loop.primary_monitor() {
        let p = primary.position();
        let s = primary.size();
        monitors.push((p.x, p.y, s.width, s.height));
    }
    for monitor in event_loop.available_monitors() {
        let p = monitor.position();
        let s = monitor.size();
        let bounds = (p.x, p.y, s.width, s.height);
        if !monitors.contains(&bounds) {
            monitors.push(bounds);
        }
    }
    let mut saved_window = window_state::fit(window_state::load(&settings_path), &monitors);
    let window = WindowBuilder::new()
        .with_title("KAY LIVE SPORT")
        .with_window_icon(Some(Icon::from_rgba(
            include_bytes!("../assets/live-sport.rgba").to_vec(),
            256,
            256,
        )?))
        .with_inner_size(tao::dpi::PhysicalSize::new(
            saved_window.width,
            saved_window.height,
        ))
        .with_position(tao::dpi::PhysicalPosition::new(
            saved_window.x,
            saved_window.y,
        ))
        .with_maximized(saved_window.maximized)
        .with_min_inner_size(tao::dpi::PhysicalSize::new(
            960.min(saved_window.width),
            540.min(saved_window.height),
        ))
        .build(&event_loop)?;
    let proxy = event_loop.create_proxy();
    let profile = app_data.join("WebView");
    std::fs::create_dir_all(&profile)?;
    let mut web_context = WebContext::new(Some(profile));
    let webview = WebViewBuilder::new_with_web_context(&mut web_context)
        .with_custom_protocol("sport".into(), |_, request| {
            if request.uri().path() == "/logo.svg" {
                return wry::http::Response::builder().header("Content-Type","image/svg+xml")
                    .body(std::borrow::Cow::Borrowed(include_bytes!("../assets/live-sport.svg").as_slice())).unwrap();
            }
            let (mime, body) = if request.uri().path() == "/hls.min.js" {
                (
                    "text/javascript",
                    include_bytes!("../ui/hls.min.js").to_vec(),
                )
            } else if request.uri().path() == "/mpegts.js" {
                ("text/javascript", include_bytes!("../ui/mpegts.js").to_vec())
            } else if request.uri().path() == "/live-notifications.js" {
                ("text/javascript", include_bytes!("../ui/live-notifications.js").to_vec())
            } else if request.uri().path() == "/countdown.js" {
                ("text/javascript", include_bytes!("../ui/countdown.js").to_vec())
            } else if request.uri().path() == "/results.js" {
                ("text/javascript", include_bytes!("../ui/results.js").to_vec())
            } else if request.uri().path() == "/scores.js" {
                ("text/javascript", include_bytes!("../ui/scores.js").to_vec())
            } else if request.uri().path() == "/player.js" {
                ("text/javascript", include_bytes!("../ui/player.js").to_vec())
            } else if request.uri().path() == "/playback.js" {
                ("text/javascript", include_bytes!("../ui/playback.js").to_vec())
            } else if request.uri().path() == "/session.js" {
                ("text/javascript", include_bytes!("../ui/session.js").to_vec())
            } else if request.uri().path() == "/lineups.js" {
                ("text/javascript", include_bytes!("../ui/lineups.js").to_vec())
            } else if request.uri().path() == "/update.js" {
                ("text/javascript", include_bytes!("../ui/update.js").to_vec())
            } else if request.uri().path() == "/settings.js" {
                ("text/javascript", include_bytes!("../ui/settings.js").to_vec())
            } else if request.uri().path() == "/fullscreen-controls.js" {
                ("text/javascript", include_bytes!("../ui/fullscreen-controls.js").to_vec())
            } else {
                (
                    "text/html; charset=utf-8",
                    include_str!("../ui/index.html")
                        .replace(
                            "<script>/* HLS_BUNDLE */</script>",
                            "<script src=\"/hls.min.js\"></script>",
                        )
                        .into_bytes(),
                )
            };
            wry::http::Response::builder()
                .header("Content-Type", mime)
                .body(std::borrow::Cow::Owned(body))
                .unwrap()
        })
        .with_url("sport://localhost/index.html")
        .with_navigation_handler(|u| {
            u.starts_with("sport://localhost/") || u.starts_with("http://sport.localhost/")
        })
        .with_ipc_handler(move |request| {
            let proxy = proxy.clone();
            let body = request.body().clone();
            if let Ok(v) = serde_json::from_str::<Value>(&body)
                && v["command"] == "reset_window"
            {
                let _ = proxy.send_event(json!({"id":v["id"],"reset_window":true}).to_string());
                return;
            }
            if let Ok(v) = serde_json::from_str::<Value>(&body)
                && v["command"] == "fullscreen"
            {
                let _ = proxy.send_event(json!({"id":v["id"],"fullscreen":v["args"]["enabled"].as_bool().unwrap_or(false)}).to_string());
                return;
            }
            std::thread::spawn(move || {
                let Ok(v) = serde_json::from_str::<Value>(&body) else {
                    return;
                };
                let result = client().and_then(|c| match v["command"].as_str() {
                    Some("matches") => matches(&c),
                    Some("check_update") => updater::check(&c),
                    Some("notification_sound") => play_notification_sound(&v["args"]),
                    Some("download_update") => updater::download(&c, &v["args"]),
                    Some("install_update") => updater::install(&c, &v["args"]),
                    Some("open_update_folder") => updater::open_folder(&v["args"]),
                    Some("scores") => scores::fetch(&c, &v["args"]),
                    Some("lineups") => lineups::fetch(&c, &v["args"]),
                    Some("resolve") => resolve(&c, &v["args"]),
                    _ => Err("Unknown command".into()),
                });
                let payload = match result {
                    Ok(data) => json!({"id":v["id"],"data":data}),
                    Err(e) => json!({"id":v["id"],"error":e}),
                };
                let _ = proxy.send_event(payload.to_string());
            });
        })
        .build(&window)?;
    event_loop.run(move |event, _, flow| {
        *flow = ControlFlow::Wait;
        match event {
            Event::WindowEvent {
                event: WindowEvent::CloseRequested,
                ..
            } => {
                window_state::capture(&window, &mut saved_window);
                let _ = window_state::save(&settings_path, &saved_window);
                *flow = ControlFlow::Exit;
            }
            Event::WindowEvent {
                event: WindowEvent::Moved(_) | WindowEvent::Resized(_),
                ..
            } => {
                window_state::capture(&window, &mut saved_window);
            }
            Event::UserEvent(payload) => {
                if let Ok(v) = serde_json::from_str::<Value>(&payload)
                    && v["data"]["restart"] == true
                {
                    window_state::capture(&window, &mut saved_window);
                    match window_state::save(&settings_path, &saved_window) {
                        Ok(()) => *flow = ControlFlow::Exit,
                        Err(e) => {
                            if let Some(path) = v["data"]["cancel"].as_str() { let _ = std::fs::write(path, b"cancel"); }
                            let response = json!({"id":v["id"],"error":format!("Could not save window settings: {e}")});
                            let _ = webview.evaluate_script(&format!("window.receive({response})"));
                        }
                    }
                    return;
                }
                if let Ok(v) = serde_json::from_str::<Value>(&payload)
                    && v["reset_window"] == true
                {
                    let defaults =
                        window_state::fit(window_state::WindowState::default(), &monitors);
                    let response = match window_state::save(&settings_path, &defaults) {
                        Ok(()) => {
                            window.set_fullscreen(None);
                            window.set_maximized(false);
                            window.set_inner_size(tao::dpi::PhysicalSize::new(
                                defaults.width,
                                defaults.height,
                            ));
                            window.set_outer_position(tao::dpi::PhysicalPosition::new(
                                defaults.x, defaults.y,
                            ));
                            saved_window = defaults;
                            json!({"id":v["id"],"data":{"reset":true}})
                        }
                        Err(e) => json!({"id":v["id"],"error":e.to_string()}),
                    };
                    let _ = webview.evaluate_script(&format!("window.receive({response})"));
                    return;
                }
                if let Ok(v) = serde_json::from_str::<Value>(&payload)
                    && let Some(enabled) = v["fullscreen"].as_bool()
                {
                    window.set_fullscreen(if enabled {
                        Some(Fullscreen::Borderless(None))
                    } else {
                        None
                    });
                    let response = json!({"id":v["id"],"data":{"enabled":enabled}});
                    let _ = webview.evaluate_script(&format!("window.receive({response})"));
                    return;
                }
                let _ = webview.evaluate_script(&format!("window.receive({payload})"));
            }
            _ => {}
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn notification_volume_scales_pcm_without_changing_header() {
        let original = notification_audio(100.0);
        let quiet = notification_audio(25.0);
        let silent = notification_audio(0.0);
        assert_eq!(&original[..44], &quiet[..44]);
        assert!(silent[44..].iter().all(|b| *b == 0));
        assert_eq!(notification_audio(200.0), original);
        for (a, b) in original[44..]
            .chunks_exact(2)
            .zip(quiet[44..].chunks_exact(2))
        {
            assert_eq!(
                i16::from_le_bytes([b[0], b[1]]),
                (f64::from(i16::from_le_bytes([a[0], a[1]])) * 0.25).round() as i16
            );
        }
    }
    #[test]
    fn includes_upcoming_metadata_without_cards() {
        let html = r#"<script id="matches-data">[{"postid":"99","sport_id":"1","time":"1792346400","home_name":"Home","away_name":"Away","is_live":0,"is_finished":0,"status_text":"Sắp diễn ra","match_data":{"competition_full":"Premier League"}},{"postid":"100","sport_id":"2","home_name":"Basketball","away_name":"Other"}]</script>"#;
        let rows = parse_matches(html).unwrap();
        assert_eq!(rows.as_array().unwrap().len(), 1);
        assert_eq!(rows[0]["home"], "Home");
        assert_eq!(rows[0]["live"], false);
        assert_eq!(rows[0]["finished"], false);
        assert_eq!(rows[0]["kickoff"], 1792346400_i64);
    }
    #[test]
    fn parses_score_logos_and_absolute_kickoff() {
        let html = r#"<script id="matches-data" type="application/json">[{"postid":"42","ls_id":"provider-match","time":"1792328400"}]</script>
        <div class="match-item" data-match-id="7" data-post-id="42" data-bucket="live" sport-id="1">
        <a class="link-match" href="https://sutbongtv8.net/truc-tiep/test/"></a>
        <div class="name-home">Home</div><div class="name-away">Away</div>
        <div class="logo-home"><img src="https://example.com/home.png"></div><div class="logo-away"><img src="https://example.com/away.png"></div>
        <span class="home-score">0</span><span class="away-score">2</span><span class="time-text">45+3'</span></div>"#;
        let rows = parse_matches(html).unwrap();
        assert_eq!(rows[0]["homeScore"], "0");
        assert_eq!(rows[0]["awayScore"], "2");
        assert_eq!(rows[0]["kickoff"], 1792328400_i64);
        assert_eq!(rows[0]["scoreId"], "provider-match");
        assert_eq!(rows[0]["homeLogo"], "https://example.com/home.png");
        assert_eq!(rows[0]["minute"], "45+3'");
        let duplicate = html
            .split("</script>")
            .nth(1)
            .unwrap()
            .replace("data-post-id=\"42\"", "data-post-id=\"43\"")
            .replace("data-match-id=\"7\"", "data-match-id=\"8\"")
            .replace("away-score\">2", "away-score\">3");
        let fixture = html.replace("provider-match", "7").replace(
            "\"time\":\"1792328400\"}]",
            "\"time\":\"1792328400\"},{\"postid\":\"43\",\"ls_id\":\"actual-feed\",\"time\":\"1792328400\"}]");
        let merged = parse_matches(&(fixture + &duplicate)).unwrap();
        assert_eq!(merged.as_array().unwrap().len(), 1);
        assert_eq!(merged[0]["post"], "42");
        assert_eq!(merged[0]["scoreId"], "actual-feed");
        assert_eq!(merged[0]["awayScore"], "3");
    }
    #[test]
    #[ignore = "requires the live provider and an active channel"]
    fn live_provider_playlist_and_segment() {
        let c = client().unwrap();
        let rows = matches(&c).unwrap();
        let rows = rows.as_array().unwrap();
        assert!(rows.iter().all(|r| !r["home"].as_str().unwrap().is_empty()));
        let mut errors = Vec::new();
        for row in rows.iter().filter(|r| r["live"] == true).take(20) {
            for channel in row["channels"].as_array().unwrap().iter().take(2) {
                let result = (|| -> Result<(), String> {
                    let stream = resolve(&c, &json!({"post":row["post"],"channel":channel["id"]}))?;
                    let url = stream["url"].as_str().unwrap();
                    let playlist = get(&c, url)?;
                    if !playlist.starts_with("#EXTM3U") {
                        return Err("Invalid HLS playlist".into());
                    }
                    let segment = playlist
                        .lines()
                        .find(|s| !s.is_empty() && !s.starts_with('#'))
                        .ok_or("Empty playlist")?;
                    let segment_url = url::Url::parse(url).unwrap().join(segment).unwrap();
                    let bytes = c
                        .get(segment_url)
                        .send()
                        .and_then(|r| r.error_for_status())
                        .and_then(|r| r.bytes())
                        .map_err(|e| e.to_string())?;
                    if bytes.len() < 100 {
                        return Err("Empty media response".into());
                    }
                    println!(
                        "{} matches parsed; {} vs {}: playlist and media OK ({} bytes)",
                        rows.len(),
                        row["home"],
                        row["away"],
                        bytes.len()
                    );
                    Ok(())
                })();
                match result {
                    Ok(()) => return,
                    Err(e) => errors.push(e),
                }
            }
        }
        panic!("No playable live channel: {errors:?}");
    }
}
