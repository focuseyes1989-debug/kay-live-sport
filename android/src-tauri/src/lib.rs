#[path = "../../../src/language.rs"]
mod language;
#[path = "../../../src/provider.rs"]
mod provider;
#[path = "../../../src/scores.rs"]
mod scores;
use serde_json::Value;
#[tauri::command]
async fn request(command: String, args: Value) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let client = provider::client()?;
        match command.as_str() {
            "matches" => provider::matches(&client),
            "resolve" => provider::resolve(&client, &args),
            "scores" => scores::fetch(&client, &args),
            _ => Err("Unsupported mobile command".into()),
        }
    }).await.map_err(|e| e.to_string())?
}
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![request])
        .run(tauri::generate_context!())
        .expect("Could not start KAY LIVE SPORT");
}
