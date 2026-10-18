use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::{io::Read, sync::Mutex, time::Duration};
use tauri::Manager;
const API: &str =
    "https://api.github.com/repos/focuseyes1989-debug/kay-live-sport/releases?per_page=100";
const BASE: &str = "https://github.com/focuseyes1989-debug/kay-live-sport/releases/download/";
const ASSET: &str = "KAYLiveSport-android-arm64-debug.apk";
static LOCK: Mutex<()> = Mutex::new(());
fn choose(rows: &Value) -> Result<Value, String> {
    let current = semver::Version::parse(env!("CARGO_PKG_VERSION")).unwrap();
    let latest = rows
        .as_array()
        .ok_or("Invalid release response")?
        .iter()
        .filter(|r| r["draft"] != true)
        .filter_map(|r| {
            Some((
                semver::Version::parse(r["tag_name"].as_str()?.strip_prefix("android-v")?).ok()?,
                r,
            ))
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
            .find(|a| a["name"] == ASSET && a["state"] == "uploaded")
    }) else {
        return Ok(
            json!({"status":"missing_asset","current":current.to_string(),"latest":v.to_string()}),
        );
    };
    let url = a["browser_download_url"]
        .as_str()
        .ok_or("Missing APK URL")?;
    if url != format!("{BASE}android-v{v}/{ASSET}") {
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
    if command == "download_update" {
        let c = reqwest::blocking::Client::builder()
            .user_agent("KAY-LIVE-SPORT-Android")
            .timeout(Duration::from_secs(300))
            .build()
            .map_err(|e| e.to_string())?;
        let mut response = c
            .get(release["url"].as_str().unwrap())
            .send()
            .and_then(|r| r.error_for_status())
            .map_err(|e| e.to_string())?;
        let mut bytes = Vec::new();
        response
            .by_ref()
            .take(200 * 1024 * 1024 + 1)
            .read_to_end(&mut bytes)
            .map_err(|e| e.to_string())?;
        verify(&bytes, &release)?;
        let temp = folder.join("download.part");
        std::fs::write(&temp, bytes).map_err(|e| e.to_string())?;
        std::fs::rename(&temp, &path).map_err(|e| e.to_string())?;
        return Ok(json!({"version":version,"path":path}));
    }
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
