use reqwest::blocking::Client;
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::{
    io::{Read, Write},
    path::PathBuf,
    sync::Mutex,
    time::Duration,
};
const REPO: &str = "https://github.com/focuseyes1989-debug/kay-live-sport";
const API: &str =
    "https://api.github.com/repos/focuseyes1989-debug/kay-live-sport/releases?per_page=100";
const ASSET: &str = "KAYLiveSport-windows-x64.exe";
static DOWNLOAD_LOCK: Mutex<()> = Mutex::new(());
fn version(tag: &str) -> Result<semver::Version, String> {
    semver::Version::parse(tag.trim_start_matches('v'))
        .map_err(|_| "Release tag must use vMAJOR.MINOR.PATCH".into())
}
fn choose_release(rows: &Value) -> Result<Value, String> {
    let current = version(env!("CARGO_PKG_VERSION"))?;
    let rows = rows.as_array().ok_or("Invalid GitHub release response")?;
    let latest = rows
        .iter()
        .filter(|r| r["draft"] != true && r["prerelease"] != true)
        .filter_map(|r| {
            let v = version(r["tag_name"].as_str()?).ok()?;
            if !v.pre.is_empty() {
                return None;
            }
            Some((v, r))
        })
        .max_by(|a, b| a.0.cmp(&b.0));
    let Some((latest, release)) = latest else {
        return Ok(json!({"status":"no_release","current":current.to_string(),"repository":REPO}));
    };
    if latest <= current {
        return Ok(
            json!({"status":"up_to_date","current":current.to_string(),"latest":latest.to_string()}),
        );
    }
    let asset = release["assets"].as_array().and_then(|a| {
        a.iter()
            .find(|a| a["name"] == ASSET && a["state"] == "uploaded")
    });
    let Some(asset) = asset else {
        return Ok(
            json!({"status":"missing_asset","current":current.to_string(),"latest":latest.to_string()}),
        );
    };
    let url = asset["browser_download_url"]
        .as_str()
        .ok_or("Missing download URL")?;
    if !url.starts_with(&format!("{REPO}/releases/download/")) {
        return Err("Unexpected update asset URL".into());
    }
    let digest = asset["digest"]
        .as_str()
        .and_then(|s| s.strip_prefix("sha256:"))
        .filter(|s| s.len() == 64 && s.bytes().all(|b| b.is_ascii_hexdigit()))
        .ok_or("Update asset has no valid GitHub SHA-256 digest. Re-upload the release asset.")?;
    let size = asset["size"]
        .as_u64()
        .filter(|n| *n > 0 && *n <= 100 * 1024 * 1024)
        .ok_or("Invalid update size")?;
    Ok(
        json!({"status":"available","current":current.to_string(),"latest":latest.to_string(),"notes":release["body"].as_str().unwrap_or(""),"url":url,"sha256":digest,"size":size}),
    )
}
pub fn check(c: &Client) -> Result<Value, String> {
    let response = c
        .get(API)
        .header("User-Agent", "KAY-Live-Sport-Updater")
        .header("Accept", "application/vnd.github+json")
        .timeout(Duration::from_secs(15))
        .send()
        .map_err(|e| e.to_string())?;
    if response.status() == reqwest::StatusCode::FORBIDDEN
        || response.status() == reqwest::StatusCode::TOO_MANY_REQUESTS
    {
        return Err("GitHub update check is rate limited. Try again later.".into());
    }
    if !response.status().is_success() {
        return Err(format!(
            "GitHub update check failed (HTTP {}).",
            response.status().as_u16()
        ));
    }
    choose_release(&response.json::<Value>().map_err(|e| e.to_string())?)
}
fn update_dir(v: &str) -> Result<PathBuf, String> {
    let parsed = version(v)?;
    let base = std::env::var_os("LOCALAPPDATA").ok_or("Local app data folder unavailable")?;
    Ok(PathBuf::from(base)
        .join("LiveSport")
        .join("Updates")
        .join(parsed.to_string()))
}
fn valid_binary(bytes: &[u8], digest: &str) -> bool {
    bytes.starts_with(b"MZ") && format!("{:x}", Sha256::digest(bytes)).eq_ignore_ascii_case(digest)
}
pub fn download(c: &Client, args: &Value) -> Result<Value, String> {
    let _lock = DOWNLOAD_LOCK
        .try_lock()
        .map_err(|_| "An update download is already running")?;
    let release = check(c)?;
    if release["status"] != "available" {
        return Err("No downloadable newer release is available".into());
    }
    if release["latest"] != args["version"] {
        return Err("The latest release changed. Check for updates again.".into());
    }
    let size = release["size"].as_u64().ok_or("Invalid update size")?;
    let response = c
        .get(release["url"].as_str().ok_or("Missing update URL")?)
        .header("User-Agent", "KAY-Live-Sport-Updater")
        .timeout(Duration::from_secs(180))
        .send()
        .and_then(|r| r.error_for_status())
        .map_err(|e| e.to_string())?;
    let mut bytes = Vec::new();
    response
        .take(size + 1)
        .read_to_end(&mut bytes)
        .map_err(|e| e.to_string())?;
    if bytes.len() as u64 != size || !valid_binary(&bytes, release["sha256"].as_str().unwrap_or(""))
    {
        return Err("Update verification failed. The current app was not changed.".into());
    }
    let folder = update_dir(release["latest"].as_str().ok_or("Missing version")?)?;
    std::fs::create_dir_all(&folder).map_err(|e| e.to_string())?;
    let partial = folder.join("KAYLiveSport.download");
    let destination = folder.join(ASSET);
    let mut file = std::fs::File::create(&partial).map_err(|e| e.to_string())?;
    file.write_all(&bytes)
        .and_then(|_| file.sync_all())
        .map_err(|e| e.to_string())?;
    drop(file);
    if destination.exists() {
        std::fs::remove_file(&destination).map_err(|e| e.to_string())?;
    }
    std::fs::rename(&partial, &destination).map_err(|e| e.to_string())?;
    Ok(json!({"version":release["latest"],"path":destination.to_string_lossy()}))
}
pub fn open_folder(args: &Value) -> Result<Value, String> {
    let dir = update_dir(args["version"].as_str().ok_or("Missing version")?)?;
    if !dir.join(ASSET).is_file() {
        return Err("Download the update first".into());
    }
    std::process::Command::new("explorer.exe")
        .arg(&dir)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(json!({"opened":true}))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn update_validation() {
        assert!(version("v1.2.3").unwrap() > version("1.2.2").unwrap());
        assert!(version("../../bad").is_err());
        assert_eq!(choose_release(&json!([])).unwrap()["status"], "no_release");
        assert_eq!(
            choose_release(&json!([{"tag_name":"v0.1.0"}])).unwrap()["status"],
            "up_to_date"
        );
        assert_eq!(
            choose_release(&json!([{"tag_name":"v99.0.0"}])).unwrap()["status"],
            "missing_asset"
        );
        assert_eq!(
            choose_release(&json!([{"tag_name":"v99.0.0","prerelease":true}])).unwrap()["status"],
            "no_release"
        );
        let bytes = b"MZtest";
        assert!(valid_binary(bytes, &format!("{:x}", Sha256::digest(bytes))));
        assert!(!valid_binary(bytes, &"0".repeat(64)));
        let bad = json!([{"tag_name":"v99.0.0","assets":[{"name":ASSET,"state":"uploaded","browser_download_url":"https://example.com/malware.exe"}]}]);
        assert!(choose_release(&bad).is_err());
    }
}
