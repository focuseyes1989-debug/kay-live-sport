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

// Run a copy of the current updater so Windows can release the installed EXE.
// Preferences and the WebView profile are never part of the replacement operation.
#[derive(serde::Serialize, serde::Deserialize)]
struct InstallPlan {
    source: PathBuf,
    target: PathBuf,
    backup: PathBuf,
    ready: PathBuf,
    cancel: PathBuf,
    digest: String,
    parent: u32,
}
pub fn install(c: &Client, args: &Value) -> Result<Value, String> {
    use std::os::windows::process::CommandExt;
    let _lock = DOWNLOAD_LOCK
        .try_lock()
        .map_err(|_| "An update operation is already running")?;
    let release = check(c)?;
    if release["status"] != "available" || release["latest"] != args["version"] {
        return Err("The release changed. Check for updates and download it again.".into());
    }
    let folder = update_dir(args["version"].as_str().ok_or("Missing version")?)?;
    let source = folder.join(ASSET);
    let bytes = std::fs::read(&source).map_err(|e| e.to_string())?;
    let digest = release["sha256"].as_str().ok_or("Missing checksum")?;
    if bytes.len() as u64 != release["size"].as_u64().unwrap_or(0) || !valid_binary(&bytes, digest)
    {
        return Err("Downloaded update changed or is damaged. Download it again.".into());
    }
    let target = std::env::current_exe().map_err(|e| e.to_string())?;
    let parent = std::process::id();
    let backup = target.with_extension(format!("exe.backup-{parent}"));
    // Test write access before asking the running app to exit.
    let probe = target.with_extension(format!("update-probe-{parent}"));
    let f = std::fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&probe)
        .map_err(|e| {
            format!("The app folder is not writable: {e}. Move the app to a writable folder.")
        })?;
    drop(f);
    std::fs::remove_file(probe).map_err(|e| e.to_string())?;
    let plan = InstallPlan {
        source,
        target,
        backup,
        ready: folder.join(format!("ready-{parent}")),
        cancel: folder.join(format!("cancel-{parent}")),
        digest: digest.to_string(),
        parent,
    };
    for path in [&plan.ready, &plan.cancel] {
        if path.exists() {
            std::fs::remove_file(path).map_err(|e| e.to_string())?;
        }
    }
    let helper = folder.join(format!("installer-{parent}.exe"));
    std::fs::copy(&plan.target, &helper).map_err(|e| e.to_string())?;
    let mut child = std::process::Command::new(helper)
        .arg("--apply-update")
        .arg(serde_json::to_string(&plan).map_err(|e| e.to_string())?)
        .creation_flags(0x08000000)
        .spawn()
        .map_err(|e| e.to_string())?;
    for _ in 0..100 {
        if plan.ready.exists() {
            return Ok(json!({"restart":true,"cancel":plan.cancel}));
        }
        if child.try_wait().map_err(|e| e.to_string())?.is_some() {
            break;
        }
        std::thread::sleep(Duration::from_millis(50));
    }
    let _ = std::fs::write(&plan.cancel, b"cancel");
    Err("The installer could not start. The current app has not been changed.".into())
}

fn replace_and_restart(
    plan: &InstallPlan,
    launch: impl Fn(&std::path::Path) -> Result<(), String>,
) -> Result<(), String> {
    let bytes = std::fs::read(&plan.source).map_err(|e| e.to_string())?;
    if !valid_binary(&bytes, &plan.digest) {
        return Err("Update verification failed before installation".into());
    }
    if plan.backup.exists() {
        return Err("An update backup already exists".into());
    }
    let mut renamed = false;
    for attempt in 0..40 {
        match std::fs::rename(&plan.target, &plan.backup) {
            Ok(()) => {
                renamed = true;
                break;
            }
            Err(e) if attempt == 39 => return Err(e.to_string()),
            Err(_) => std::thread::sleep(Duration::from_millis(250)),
        }
    }
    if !renamed {
        return Err("Could not release the current EXE".into());
    }
    let result = std::fs::copy(&plan.source, &plan.target)
        .map_err(|e| e.to_string())
        .and_then(|_| launch(&plan.target));
    if let Err(error) = result {
        if plan.target.exists() {
            std::fs::remove_file(&plan.target).map_err(|e| format!("{error}; rollback: {e}"))?;
        }
        std::fs::rename(&plan.backup, &plan.target)
            .map_err(|e| format!("{error}; rollback: {e}"))?;
        return Err(error);
    }
    Ok(())
}

pub fn run_helper() -> bool {
    let args: Vec<_> = std::env::args().collect();
    if args.get(1).map(String::as_str) != Some("--apply-update") {
        return false;
    }
    let result = (|| -> Result<(), String> {
        let plan: InstallPlan = serde_json::from_str(args.get(2).ok_or("Missing install plan")?)
            .map_err(|e| e.to_string())?;
        #[link(name = "kernel32")]
        unsafe extern "system" {
            fn OpenProcess(access: u32, inherit: i32, pid: u32) -> *mut std::ffi::c_void;
            fn WaitForSingleObject(handle: *mut std::ffi::c_void, ms: u32) -> u32;
            fn CloseHandle(handle: *mut std::ffi::c_void) -> i32;
        }
        // Acquire the parent handle before reporting ready, preventing a PID reuse race.
        let handle = unsafe { OpenProcess(0x00100000, 0, plan.parent) };
        if handle.is_null() {
            return Err("Cannot wait for the running app".into());
        }
        if let Err(e) = std::fs::write(&plan.ready, b"ready") {
            unsafe {
                CloseHandle(handle);
            }
            return Err(e.to_string());
        }
        let mut exited = false;
        for _ in 0..1200 {
            if plan.cancel.exists() {
                break;
            }
            if unsafe { WaitForSingleObject(handle, 100) } == 0 {
                exited = true;
                break;
            }
        }
        unsafe {
            CloseHandle(handle);
        }
        let _ = std::fs::remove_file(&plan.ready);
        if !exited || plan.cancel.exists() {
            return Ok(());
        }
        // WebView processes can briefly retain handles during shutdown.
        std::thread::sleep(Duration::from_millis(700));
        let launch = |path: &std::path::Path| {
            std::process::Command::new(path)
                .current_dir(path.parent().ok_or("Missing app folder")?)
                .spawn()
                .map(|_| ())
                .map_err(|e| e.to_string())
        };
        if let Err(e) = replace_and_restart(&plan, launch) {
            let _ = std::fs::write(plan.source.parent().unwrap().join("install-error.txt"), &e);
            let _ = launch(&plan.target);
            return Err(e);
        }
        Ok(())
    })();
    if let Err(e) = result {
        eprintln!("Update installer: {e}");
    }
    true
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn replacement_preserves_settings_and_rolls_back_launch_failure() {
        let dir = std::env::temp_dir().join(format!("kay-updater-test-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let source = dir.join("new.exe");
        let target = dir.join("app.exe");
        let backup = dir.join("backup.exe");
        let prefs = dir.join("settings.json");
        std::fs::write(&source, b"MZnew").unwrap();
        std::fs::write(&target, b"MZold").unwrap();
        std::fs::write(&prefs, b"saved preferences").unwrap();
        let plan = InstallPlan {
            source,
            target: target.clone(),
            backup: backup.clone(),
            ready: dir.join("ready"),
            cancel: dir.join("cancel"),
            digest: format!("{:x}", Sha256::digest(b"MZnew")),
            parent: 0,
        };
        assert!(replace_and_restart(&plan, |_| Err("launch failed".into())).is_err());
        assert_eq!(std::fs::read(&target).unwrap(), b"MZold");
        assert!(!backup.exists());
        replace_and_restart(&plan, |_| Ok(())).unwrap();
        assert_eq!(std::fs::read(&target).unwrap(), b"MZnew");
        assert_eq!(std::fs::read(&backup).unwrap(), b"MZold");
        assert_eq!(std::fs::read(&prefs).unwrap(), b"saved preferences");
        std::fs::write(&plan.source, b"tampered").unwrap();
        assert!(replace_and_restart(&plan, |_| panic!("must not launch")).is_err());
        assert_eq!(std::fs::read(&target).unwrap(), b"MZnew");
        for entry in std::fs::read_dir(&dir).unwrap() {
            std::fs::remove_file(entry.unwrap().path()).unwrap();
        }
        std::fs::remove_dir(dir).unwrap();
    }
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
