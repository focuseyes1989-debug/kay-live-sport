#[path = "../../../src/myanmar_tv.rs"]
mod myanmar_tv;
mod updater;
#[cfg(target_os = "android")]
use tauri::Manager;
#[path = "../../../src/language.rs"]
mod language;
#[path = "../../../src/lineups.rs"]
mod lineups;
#[path = "../../../src/highlights.rs"]
mod highlights;
#[path = "../../../src/provider.rs"]
mod provider;
#[path = "../../../src/scores.rs"]
mod scores;
use serde_json::Value;
#[tauri::command]
async fn request(app: tauri::AppHandle, command: String, args: Value) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || {
        if matches!(
            command.as_str(),
            "check_update" | "download_update" | "install_update" | "cancel_download_update"
        ) {
            return updater::request(&app, &command, &args);
        }
        if command == "open_myanmar_tv" {
            if !myanmar_tv::allowed_page(args["url"].as_str().unwrap_or("")) {return Err("Invalid Myanmar TV page".into())}
            #[cfg(target_os = "android")]
            return app.state::<tauri::plugin::PluginHandle<tauri::Wry>>().run_mobile_plugin("openMyanmarTv", args).map_err(|e|e.to_string());
            #[cfg(not(target_os = "android"))]
            return Ok(serde_json::json!({"opened":false}));
        }
        if command == "open_highlight" {
            if !highlights::allowed_url(args["url"].as_str().unwrap_or("")) {return Err("Invalid highlights link".into())}
            #[cfg(target_os = "android")]
            return app.state::<tauri::plugin::PluginHandle<tauri::Wry>>().run_mobile_plugin("openHighlight", args).map_err(|e| e.to_string());
            #[cfg(not(target_os = "android"))]
            return Ok(serde_json::json!({"opened":false}));
        }
        if command == "mobile_exit" {
            if !cfg!(kay_tv) || args["confirmed"] != true { return Err("TV exit confirmation required".into()); }
            #[cfg(target_os = "android")]
            return app.state::<tauri::plugin::PluginHandle<tauri::Wry>>().run_mobile_plugin("exitApp", args).map_err(|e| e.to_string());
            #[cfg(not(target_os = "android"))]
            return Ok(serde_json::json!({"exiting":true}));
        }
        if command == "mobile_keyboard" {
            #[cfg(target_os = "android")]
            return app.state::<tauri::plugin::PluginHandle<tauri::Wry>>()
                .run_mobile_plugin("keyboard", args).map_err(|e| e.to_string());
            #[cfg(not(target_os = "android"))]
            return Ok(serde_json::json!({"enabled":args["enabled"]==true}));
        }
        if command == "mobile_fullscreen" {
            #[cfg(target_os = "android")]
            return app
                .state::<tauri::plugin::PluginHandle<tauri::Wry>>()
                .run_mobile_plugin("fullscreen", args)
                .map_err(|e| e.to_string());
            #[cfg(not(target_os = "android"))]
            return Ok(serde_json::json!({"enabled":args["enabled"]==true}));
        }
        let client = provider::client()?;
        match command.as_str() {
            "myanmar_channels" => myanmar_tv::catalog(&client),
            "myanmar_resolve" => myanmar_tv::resolve(&client,&args),
            "matches" => provider::matches(&client),
            "resolve" => provider::resolve(&client, &args),
            "scores" => scores::fetch(&client, &args),
            "lineups" => lineups::fetch(&client, &args),
            "highlights" => highlights::fetch(&client, &args),
            "highlights_catalog" => highlights::catalog(&client),
            "official_highlight" => highlights::official(&client, &args),
            _ => Err("Unsupported mobile command".into()),
        }
    })
    .await
    .map_err(|e| e.to_string())?
}
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri::plugin::Builder::<tauri::Wry>::new("apk-installer")
                .setup(|_app, _api| {
                    #[cfg(target_os = "android")]
                    _app.manage(_api.register_android_plugin(
                        "com.kaylivesport.mobile",
                        "ApkInstallerPlugin",
                    )?);
                    Ok(())
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![request])
        .run(tauri::generate_context!())
        .expect("Could not start KAY LIVE SPORT");
}
