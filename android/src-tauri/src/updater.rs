use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::io::Write;
use std::{
    sync::Mutex,
    time::{Duration, Instant},
};
use tauri::{Emitter, Manager};
const API: &str =
    "https://api.github.com/repos/focuseyes1989-debug/kay-live-sport/releases?per_page=100";
const BASE: &str = "https://github.com/focuseyes1989-debug/kay-live-sport/releases/download/";
const TV_EDITION: bool = cfg!(kay_tv);
const ASSET: &str = if TV_EDITION {
    if cfg!(target_arch = "arm") { "KAYLiveSport-tv-arm32-debug.apk" } else { "KAYLiveSport-tv-arm64-debug.apk" }
} else {
    if cfg!(target_arch = "arm") { "KAYLiveSport-android-arm32-debug.apk" } else { "KAYLiveSport-android-arm64-debug.apk" }
};
static LOCK: Mutex<()> = Mutex::new(());
static CANCEL: Mutex<Option<tokio::sync::watch::Sender<bool>>> = Mutex::new(None);
fn choose(rows: &Value) -> Result<Value, String> {
    choose_for(rows, TV_EDITION, ASSET)
}
fn choose_for(rows: &Value, tv: bool, asset: &str) -> Result<Value, String> {
    let current = semver::Version::parse(env!("CARGO_PKG_VERSION")).unwrap();
    let latest = rows
        .as_array()
        .ok_or("Invalid release response")?
        .iter()
        .filter(|r| r["draft"] != true)
        .filter_map(|r| {
            let tag = r["tag_name"].as_str()?;
            let version = tag.strip_prefix("android-v").or_else(|| if tv { tag.strip_prefix("tv-v") } else { None })?;
            Some((semver::Version::parse(version).ok()?, r))
        })
        .max_by(|a, b| a.0.cmp(&b.0));
    let Some((v, r)) = latest else {
        return Ok(json!({"status":"no_release","current":current.to_string()}));
    };
    if v <= current {
        return Ok(json!({"status":"up_to_date","current":current.to_string()}));
    }
    let Some(a) = r["assets"].as_array().and_then(|a| {
        a.iter()
            .find(|a| a["name"] == asset && a["state"] == "uploaded")
    }) else {
        return Ok(
            json!({"status":"missing_asset","current":current.to_string(),"latest":v.to_string()}),
        );
    };
    let url = a["browser_download_url"]
        .as_str()
        .ok_or("Missing APK URL")?;
    let tag = r["tag_name"].as_str().ok_or("Missing release tag")?;
    if url != format!("{BASE}{tag}/{asset}") {
        return Err("Unexpected APK URL".into());
    }
    let hash = a["digest"]
        .as_str()
        .and_then(|s| s.strip_prefix("sha256:"))
        .filter(|s| s.len() == 64 && s.bytes().all(|b| b.is_ascii_hexdigit()))
        .ok_or("Missing GitHub APK checksum")?;
    let size = a["size"]
        .as_u64()
        .filter(|n| *n > 0 && *n <= 200 * 1024 * 1024)
        .ok_or("Invalid APK size")?;
    Ok(
        json!({"status":"available","current":current.to_string(),"latest":v.to_string(),"notes":r["body"].as_str().unwrap_or(""),"url":url,"hash":hash,"size":size}),
    )
}
fn check() -> Result<Value, String> {
    let c = reqwest::blocking::Client::builder()
        .user_agent("KAY-LIVE-SPORT-Android")
        .timeout(Duration::from_secs(25))
        .build()
        .map_err(|e| e.to_string())?;
    let rows = c
        .get(API)
        .send()
        .and_then(|r| r.error_for_status())
        .and_then(|r| r.json())
        .map_err(|e| e.to_string())?;
    choose(&rows)
}
pub fn request(app: &tauri::AppHandle, command: &str, args: &Value) -> Result<Value, String> {
    if command == "cancel_download_update" {
        if let Some(sender) = CANCEL.lock().map_err(|_| "Updater busy")?.as_ref() {
            let _ = sender.send(true);
        }
        return Ok(json!({"cancelled":true}));
    }
    if command == "download_update" {
        return download(app, args);
    }
    if command == "check_update" {
        #[allow(unused_mut)]
        let mut result = check()?;
        #[cfg(target_os = "android")]
        {
            let status: Value = app
                .state::<tauri::plugin::PluginHandle<tauri::Wry>>()
                .run_mobile_plugin("status", json!({}))
                .map_err(|e| e.to_string())?;
            result["installer"] = status;
        }
        Ok(result)
    } else {
        request_update(app, command, args)
    }
}
fn request_update(app: &tauri::AppHandle, command: &str, args: &Value) -> Result<Value, String> {
    let _lock = LOCK.lock().map_err(|_| "Updater busy")?;
    let release = check()?;
    let version = args["version"].as_str().ok_or("Missing version")?;
    if release["status"] != "available" || release["latest"] != version {
        return Err("Update changed. Check for updates again.".into());
    }
    let folder = app
        .path()
        .app_cache_dir()
        .map_err(|e| e.to_string())?
        .join("updates");
    std::fs::create_dir_all(&folder).map_err(|e| e.to_string())?;
    let path = folder.join(ASSET);
    if command == "install_update" {
        let bytes = std::fs::read(&path).map_err(|_| "Download the APK again")?;
        verify(&bytes, &release)?;
        #[cfg(target_os = "android")]
        return app
            .state::<tauri::plugin::PluginHandle<tauri::Wry>>()
            .run_mobile_plugin("install", json!({"path":path}))
            .map_err(|e| e.to_string());
        #[cfg(not(target_os = "android"))]
        return Err("Android installer is only available on Android".into());
    }
    Err("Unsupported update command".into())
}
fn download(app: &tauri::AppHandle, args: &Value) -> Result<Value, String> {
    let _lock = LOCK
        .try_lock()
        .map_err(|_| "Another update operation is running")?;
    let (sender, mut cancel) = tokio::sync::watch::channel(false);
    *CANCEL.lock().map_err(|_| "Updater busy")? = Some(sender);
    let result = tauri::async_runtime::block_on(async {
        let work = async {
            let c = reqwest::Client::builder()
                .user_agent("KAY-LIVE-SPORT-Android")
                .timeout(Duration::from_secs(300))
                .build()
                .map_err(|e| e.to_string())?;
            let rows: Value = c
                .get(API)
                .send()
                .await
                .and_then(|r| r.error_for_status())
                .map_err(|e| e.to_string())?
                .json()
                .await
                .map_err(|e| e.to_string())?;
            let release = choose(&rows)?;
            let version = args["version"].as_str().ok_or("Missing version")?;
            if release["status"] != "available" || release["latest"] != version {
                return Err("Update changed. Check for updates again.".into());
            }
            let total = release["size"].as_u64().unwrap();
            let folder = app
                .path()
                .app_cache_dir()
                .map_err(|e| e.to_string())?
                .join("updates");
            std::fs::create_dir_all(&folder).map_err(|e| e.to_string())?;
            let temp = folder.join("download.part");
            let path = folder.join(ASSET);
            let progress = |downloaded: u64, phase: &str| {
                let _ = app.emit(
                    "update-download-progress",
                    json!({"version":version,"downloaded":downloaded,"total":total,"phase":phase}),
                );
            };
            download_partial(&c, &release, &temp, progress).await?;
            progress(total, "verifying");
            let bytes = std::fs::read(&temp).map_err(|e| e.to_string())?;
            if let Err(error) = verify(&bytes, &release) {
                let _ = std::fs::remove_file(&temp);
                return Err(error);
            }
            std::fs::rename(&temp, &path).map_err(|e| e.to_string())?;
            Ok(json!({"version":version,"path":path}))
        };
        tokio::select! { biased; _=cancel.changed()=>Err("Download cancelled".into()), result=work=>result }
    });
    *CANCEL.lock().map_err(|_| "Updater busy")? = None;
    result
}
// A sidecar binds partial bytes to the exact immutable release asset.
async fn download_partial(
    c: &reqwest::Client,
    release: &Value,
    temp: &std::path::Path,
    progress: impl Fn(u64, &str),
) -> Result<(), String> {
    let total = release["size"].as_u64().ok_or("Missing APK size")?;
    let url = release["url"].as_str().ok_or("Missing APK URL")?;
    let identity =
        serde_json::to_vec(&json!({"url":url,"hash":release["hash"],"size":total})).unwrap();
    let sidecar = temp.with_extension("json");
    let mut offset = std::fs::metadata(temp).map(|m| m.len()).unwrap_or(0);
    if offset > total || std::fs::read(&sidecar).ok().as_deref() != Some(identity.as_slice()) {
        std::fs::write(temp, []).map_err(|e| e.to_string())?;
        std::fs::write(&sidecar, identity).map_err(|e| e.to_string())?;
        offset = 0;
    }
    progress(offset, "downloading");
    if offset == total {
        return Ok(());
    }
    let mut request = c
        .get(url)
        .header(reqwest::header::ACCEPT_ENCODING, "identity");
    if offset > 0 {
        request = request.header(reqwest::header::RANGE, format!("bytes={offset}-"));
    }
    let mut response = request.send().await.map_err(|e| e.to_string())?;
    if response.status() == reqwest::StatusCode::RANGE_NOT_SATISFIABLE {
        response = c
            .get(url)
            .header(reqwest::header::ACCEPT_ENCODING, "identity")
            .send()
            .await
            .map_err(|e| e.to_string())?;
    }
    let resume = range_response(
        response.status().as_u16(),
        response
            .headers()
            .get(reqwest::header::CONTENT_RANGE)
            .and_then(|h| h.to_str().ok()),
        offset,
        total,
    )?;
    if !resume {
        offset = 0;
        progress(0, "downloading");
    }
    let mut file = std::fs::OpenOptions::new()
        .create(true)
        .write(true)
        .append(resume)
        .truncate(!resume)
        .open(temp)
        .map_err(|e| e.to_string())?;
    let mut last = Instant::now();
    while let Some(chunk) = response.chunk().await.map_err(|e| e.to_string())? {
        if offset + chunk.len() as u64 > total {
            return Err("APK exceeds expected download size".into());
        }
        file.write_all(&chunk).map_err(|e| e.to_string())?;
        offset += chunk.len() as u64;
        if last.elapsed() >= Duration::from_millis(100) {
            progress(offset, "downloading");
            last = Instant::now();
        }
    }
    file.flush().map_err(|e| e.to_string())?;
    progress(offset, "downloading");
    if offset != total {
        return Err("Download incomplete. Tap Download update to resume.".into());
    }
    Ok(())
}
fn range_response(
    status: u16,
    range: Option<&str>,
    offset: u64,
    total: u64,
) -> Result<bool, String> {
    match status {
        200 => Ok(false),
        206 if range == Some(format!("bytes {offset}-{}/{}", total - 1, total).as_str()) => {
            Ok(true)
        }
        206 => Err("Invalid resumed APK range; download was not appended".into()),
        _ => Err(format!("APK server returned HTTP {status}")),
    }
}
fn verify(bytes: &[u8], release: &Value) -> Result<(), String> {
    if Some(bytes.len() as u64) != release["size"].as_u64()
        || !bytes.starts_with(b"PK")
        || format!("{:x}", Sha256::digest(bytes))
            != release["hash"].as_str().unwrap_or("").to_lowercase()
    {
        return Err("APK checksum or size mismatch. Download again.".into());
    }
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn range_headers_are_validated() {
        assert!(range_response(206, Some("bytes 5-9/10"), 5, 10).unwrap());
        assert!(!range_response(200, None, 5, 10).unwrap());
        assert!(range_response(206, Some("bytes 0-9/10"), 5, 10).is_err());
        assert!(range_response(403, None, 5, 10).is_err());
    }
    #[test]
    fn interrupted_download_resumes_or_restarts_safely() {
        use std::{
            io::{BufRead, BufReader},
            net::TcpListener,
        };
        for mode in ["resume", "ignored", "changed"] {
            let listener = TcpListener::bind("127.0.0.1:0").unwrap();
            let url = format!("http://{}/test.apk", listener.local_addr().unwrap());
            let server = std::thread::spawn(move || {
                for attempt in 0..2 {
                    let (mut socket, _) = listener.accept().unwrap();
                    let mut reader = BufReader::new(socket.try_clone().unwrap());
                    let mut headers = String::new();
                    loop {
                        let mut line = String::new();
                        reader.read_line(&mut line).unwrap();
                        if line == "\r\n" {
                            break;
                        }
                        headers.push_str(&line);
                    }
                    if attempt == 0 {
                        socket.write_all(b"HTTP/1.1 200 OK\r\nContent-Length: 10\r\nConnection: close\r\n\r\nPKabc").unwrap();
                    } else {
                        if mode == "changed" {
                            assert!(!headers.to_lowercase().contains("range:"));
                        } else {
                            assert!(headers.to_lowercase().contains("range: bytes=5-"));
                        }
                        let response = if mode == "resume" {
                            "HTTP/1.1 206 Partial Content\r\nContent-Range: bytes 5-9/10\r\nContent-Length: 5\r\nConnection: close\r\n\r\ndefgh"
                        } else {
                            "HTTP/1.1 200 OK\r\nContent-Length: 10\r\nConnection: close\r\n\r\nPKabcdefgh"
                        };
                        socket.write_all(response.as_bytes()).unwrap();
                    }
                }
            });
            let dir =
                std::env::temp_dir().join(format!("kay-resume-{}-{}", std::process::id(), mode));
            std::fs::create_dir_all(&dir).unwrap();
            let temp = dir.join("download.part");
            let _ = std::fs::remove_file(&temp);
            tauri::async_runtime::block_on(async {
                let client = reqwest::Client::new();
                let mut release = json!({"url":url,"size":10,"hash":format!("{:x}",Sha256::digest(b"PKabcdefgh"))});
                assert!(
                    download_partial(&client, &release, &temp, |_, _| {})
                        .await
                        .is_err()
                );
                assert_eq!(std::fs::read(&temp).unwrap(), b"PKabc");
                if mode == "changed" {
                    release["hash"] = json!("different-asset");
                }
                download_partial(&client, &release, &temp, |_, _| {})
                    .await
                    .unwrap();
                assert_eq!(std::fs::read(&temp).unwrap(), b"PKabcdefgh");
                if mode != "changed" {
                    verify(&std::fs::read(&temp).unwrap(), &release).unwrap();
                }
            });
            server.join().unwrap();
            std::fs::remove_file(&temp).unwrap();
            std::fs::remove_file(temp.with_extension("json")).unwrap();
            std::fs::remove_dir(&dir).unwrap();
        }
    }
    #[test]
    fn tv_channels_keep_architecture_and_edition() {
        let arm32 = "KAYLiveSport-tv-arm32-debug.apk";
        let arm64 = "KAYLiveSport-tv-arm64-debug.apk";
        let phone = "KAYLiveSport-android-arm64-debug.apk";
        let release = |tag: &str, names: &[&str]| json!({"tag_name":tag,"assets":names.iter().map(|name| json!({"name":name,"state":"uploaded","browser_download_url":format!("{BASE}{tag}/{name}"),"digest":format!("sha256:{}", "a".repeat(64)),"size":10})).collect::<Vec<_>>()});
        let rows = json!([release("android-v99.0.0", &[arm32, arm64, phone]), release("tv-v99.1.0", &[arm32, arm64])]);
        for asset in [arm32, arm64] {
            let chosen = choose_for(&rows, true, asset).unwrap();
            assert_eq!(chosen["latest"], "99.1.0");
            assert!(chosen["url"].as_str().unwrap().ends_with(asset));
        }
        assert_eq!(choose_for(&rows, false, phone).unwrap()["latest"], "99.0.0");
        let phone_only = json!([release("android-v99.0.0", &[phone])]);
        assert_eq!(choose_for(&phone_only, true, arm32).unwrap()["status"], "missing_asset");
        let mut wrong = json!([release("android-v99.0.0", &[arm32])]);
        wrong[0]["assets"][0]["browser_download_url"] = json!(format!("{BASE}android-v99.0.0/{phone}"));
        assert!(choose_for(&wrong, true, arm32).is_err());
    }
    #[test]
    fn windows_and_drafts_ignored() {
        assert_eq!(
            choose(&json!([{ "tag_name":"v99.0.0"},{"tag_name":"android-v99.0.0","draft":true}]))
                .unwrap()["status"],
            "no_release"
        );
    }
    #[test]
    fn android_preview_selected() {
        assert_eq!(
            choose(&json!([{"tag_name":"android-v99.0.0","prerelease":true,"assets":[]}])).unwrap()
                ["status"],
            "missing_asset"
        );
    }
    #[test]
    fn verifies_asset_and_rejects_untrusted_url() {
        let bytes = b"PKfixture";
        let hash = format!("{:x}", Sha256::digest(bytes));
        let mut rows = json!([{"tag_name":"android-v99.0.0","prerelease":true,"assets":[{"name":ASSET,"state":"uploaded","browser_download_url":format!("{BASE}android-v99.0.0/{ASSET}"),"digest":format!("sha256:{hash}"),"size":bytes.len()}]}]);
        let selected = choose(&rows).unwrap();
        assert_eq!(selected["status"], "available");
        verify(bytes, &selected).unwrap();
        assert!(verify(b"PKchanged", &selected).is_err());
        rows[0]["assets"][0]["browser_download_url"] = json!("https://example.com/evil.apk");
        assert!(choose(&rows).is_err());
    }
    #[test]
    fn current_release_not_offered() {
        assert_eq!(
            choose(&json!([{"tag_name":"android-v0.1.0"}])).unwrap()["status"],
            "up_to_date"
        );
    }
    #[test]
    fn tampering_rejected() {
        assert!(verify(b"PKbad", &json!({"size":5,"hash":"00"})).is_err());
    }
}
