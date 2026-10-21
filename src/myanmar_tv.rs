use reqwest::blocking::Client;
use scraper::{Html, Selector};
use serde_json::{Value, json};
use std::time::Duration;
const SITE: &str = "https://www.myanmartvchannels.com";
fn seeds() -> Vec<Value> {
    serde_json::from_str(include_str!("../android/myanmar-tv-channels.json")).unwrap()
}
fn page(id: &str) -> String {
    format!("{SITE}/channels/{id}/")
}
fn safe_stream(value: &str) -> bool {
    url::Url::parse(value).is_ok_and(|u| {
        u.scheme() == "https"
            && u.username().is_empty()
            && u.password().is_none()
            && matches!(
                u.host_str(),
                Some(
                    "live.pyoneplay.com"
                        | "mrtvott.com"
                        | "live-stream.dvb.no"
                        | "ygncdn.com"
                        | "www.myanmartvchannels.com"
                        | "myanmartvchannels.com"
                )
            )
    })
}
fn read(c: &Client, url: &str) -> Result<String, String> {
    c.get(url)
        .timeout(Duration::from_secs(8))
        .send()
        .and_then(|r| r.error_for_status())
        .and_then(|r| r.text())
        .map_err(|e| e.to_string())
}
fn parse_catalog(html: &str) -> Vec<Value> {
    let doc = Html::parse_document(html);
    let links = Selector::parse("a[href]").unwrap();
    let images = Selector::parse("img[alt]").unwrap();
    let mut rows = Vec::new();
    for a in doc.select(&links) {
        let href = a.value().attr("href").unwrap_or("");
        let Ok(u) = url::Url::parse(SITE).unwrap().join(href) else {
            continue;
        };
        if u.host_str() != Some("www.myanmartvchannels.com") {
            continue;
        }
        let parts: Vec<_> = u.path().trim_matches('/').split('/').collect();
        if parts.len() != 2
            || parts[0] != "channels"
            || !parts[1]
                .bytes()
                .all(|c| c.is_ascii_alphanumeric() || c == b'-')
        {
            continue;
        }
        let Some(img) = a.select(&images).next() else {
            continue;
        };
        let name = img.value().attr("alt").unwrap_or("").trim();
        if name.is_empty() {
            continue;
        }
        if !rows.iter().any(|r: &Value| r["id"] == parts[1]) {
            rows.push(json!({"id":parts[1],"name":name}));
        }
    }
    rows
}
fn retain_supported(rows: &mut Vec<Value>, supported: &[Value]) {
    rows.retain(|row| supported.iter().any(|seed| seed["id"] == row["id"]));
}
pub fn catalog(c: &Client) -> Result<Value, String> {
    let cached = seeds();
    let fetched = read(c, &format!("{SITE}/channels/"))
        .map(|s| parse_catalog(&s))
        .unwrap_or_default();
    let fallback = fetched.is_empty();
    let mut rows = if fallback { cached.clone() } else { fetched };
    // A refreshed directory must not restore channels removed as unavailable.
    retain_supported(&mut rows, &cached);
    for row in &mut rows {
        let id = row["id"].as_str().unwrap_or("").to_string();
        row["page"] = json!(page(&id));
        row["logo"] = json!(format!("{SITE}/channels/{id}.webp"));
    }
    Ok(json!({"channels":rows,"cached":fallback,"source":format!("{SITE}/channels/")}))
}
fn stream_from_html(html: &str) -> Option<String> {
    let doc = Html::parse_document(html);
    doc.select(&Selector::parse("[data-stream-url]").unwrap())
        .filter_map(|e| e.value().attr("data-stream-url"))
        .find(|s| safe_stream(s))
        .map(str::to_string)
}
fn token_stream(c: &Client, id: &str) -> Result<String, String> {
    let stream = if id == "heyplay" { "channel9" } else { id };
    let response = c
        .get(format!("{SITE}/api/token"))
        .query(&[("stream", stream)])
        .header("X-Requested-With", "XMLHttpRequest")
        .header("Referer", page(id))
        .timeout(Duration::from_secs(5))
        .send()
        .map_err(|e| {
            if e.is_timeout() {
                "The channel source timed out. Retry or open the channel website.".to_string()
            } else {
                "Could not connect to the channel source. Retry or open the channel website."
                    .to_string()
            }
        })?;
    let status = response.status();
    if !status.is_success() {
        return Err(source_status_error(status.as_u16()));
    }
    let token = response.json::<Value>().map_err(|_| {
        "The source did not return a stream. Open the channel website to check access.".to_string()
    })?;
    token["signedUrl"]
        .as_str()
        .filter(|s| safe_stream(s))
        .map(str::to_string)
        .ok_or(
            "No public stream was returned. Open the channel website to check this channel."
                .to_string(),
        )
}
fn source_status_error(status: u16) -> String {
    match status {
        401 | 403 => format!(
            "Channel source access denied (HTTP {status}). Open the channel website; a browser session or access step may be required."
        ),
        404 => "This channel's stream is not currently listed by the source (HTTP 404).".into(),
        429 => "The channel source is busy (HTTP 429). Wait a moment and Retry.".into(),
        _ => {
            format!("The channel source returned HTTP {status}. Retry or open the channel website.")
        }
    }
}
fn add_route(routes: &mut Vec<Value>, url: &str) {
    if safe_stream(url) && !routes.iter().any(|r| r["url"] == url) {
        routes.push(json!({"url":url,"format":"hls"}));
    }
}
fn add_seed_routes(routes: &mut Vec<Value>, seed: &Value) {
    if let Some(url) = seed["stream"].as_str() {
        add_route(routes, url);
    }
    if let Some(fallbacks) = seed["fallbacks"].as_array() {
        for url in fallbacks.iter().filter_map(Value::as_str) {
            add_route(routes, url);
        }
    }
}
pub fn resolve(c: &Client, args: &Value) -> Result<Value, String> {
    let id = args["id"].as_str().ok_or("Choose a Myanmar TV channel")?;
    if id.is_empty() || id.len() > 60 || !id.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-')
    {
        return Err("Invalid channel".into());
    }
    let seed = seeds().into_iter().find(|r| r["id"] == id);
    if seed.is_none() {
        return Err("This channel is no longer available in Myanmar TV.".into());
    }
    let current = read(c, &page(id)).ok().and_then(|s| stream_from_html(&s));
    let mut routes = Vec::new();
    let mut token_error = None;
    // An explicit Retry obtains a fresh source token before reusing public URLs.
    // No browser cookies or access challenges are bypassed.
    if args["refreshToken"] == true {
        match token_stream(c, id) {
            Ok(url) => add_route(&mut routes, &url),
            Err(e) => token_error = Some(e),
        }
    }
    if let Some(url) = current {
        add_route(&mut routes, &url);
    }
    if let Some(seed) = seed.as_ref() {
        add_seed_routes(&mut routes, seed);
    }
    if routes.is_empty() && token_error.is_none() {
        match token_stream(c, id) {
            Ok(url) => add_route(&mut routes, &url),
            Err(e) => token_error = Some(e),
        }
    }
    if routes.is_empty() {
        return Err(token_error
            .unwrap_or_else(|| "No public stream is available. Open the channel website.".into()));
    }
    Ok(json!({"url":routes[0]["url"],"format":"hls","sources":routes}))
}

pub fn allowed_page(value: &str) -> bool {
    url::Url::parse(value).is_ok_and(|u| {
        u.scheme() == "https"
            && u.host_str() == Some("www.myanmartvchannels.com")
            && u.username().is_empty()
            && u.password().is_none()
            && u.port().is_none()
            && u.path().starts_with("/channels/")
    })
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn directory_and_public_streams() {
        let rows = parse_catalog(
            r#"<a href='/channels/mrtv4/'><img alt='MRTV-4'></a><a href='/channels/mrtv4/'><img alt='duplicate'></a><a href='https://evil.test/channels/bad/'><img alt='Bad'></a>"#,
        );
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0]["id"], "mrtv4");
        assert!(
            stream_from_html(
                r#"<video data-stream-url='https://live.pyoneplay.com/live/test/index.m3u8'>"#
            )
            .is_some()
        );
        assert!(
            stream_from_html(r#"<video data-stream-url='https://evil.test/stream.m3u8'>"#)
                .is_none()
        );
        assert_eq!(seeds().len(), 11);
        let mut refreshed = vec![
            json!({"id":"mahar"}),
            json!({"id":"5plus"}),
            json!({"id":"channel7"}),
            json!({"id":"unknown"}),
        ];
        retain_supported(&mut refreshed, &seeds());
        assert_eq!(refreshed, vec![json!({"id":"channel7"})]);
    }
    #[test]
    fn source_errors_and_public_routes() {
        assert!(source_status_error(403).contains("browser session"));
        assert!(source_status_error(404).contains("not currently listed"));
        assert!(source_status_error(429).contains("Wait"));
        let mut routes = Vec::new();
        add_route(
            &mut routes,
            "https://live.pyoneplay.com/live/fresh/index.m3u8",
        );
        add_route(
            &mut routes,
            "https://live.pyoneplay.com/live/fresh/index.m3u8",
        );
        add_route(
            &mut routes,
            "https://live.pyoneplay.com/live/previous/index.m3u8",
        );
        add_route(&mut routes, "https://evil.test/index.m3u8");
        assert_eq!(routes.len(), 2);
        assert!(routes[0]["url"].as_str().unwrap().contains("fresh"));
    }
    #[test]
    fn verified_channel_fallbacks_are_ordered_and_validated() {
        let seed = seeds().into_iter().find(|r| r["id"] == "dvb").unwrap();
        let mut routes = Vec::new();
        add_seed_routes(&mut routes, &seed);
        assert_eq!(routes.len(), 2);
        assert_eq!(routes[0]["url"], seed["stream"]);
        assert_eq!(routes[1]["url"], seed["fallbacks"][0]);
        add_seed_routes(&mut routes, &seed);
        add_seed_routes(
            &mut routes,
            &json!({"fallbacks":["https://evil.test/live.m3u8", "http://live-stream.dvb.no/live.m3u8", null]}),
        );
        assert_eq!(routes.len(), 2);
    }
    #[test]
    fn source_links_restricted() {
        assert!(allowed_page(
            "https://www.myanmartvchannels.com/channels/mrtv4/"
        ));
        assert!(!allowed_page(
            "https://www.myanmartvchannels.com.evil.test/channels/x/"
        ));
        assert!(!allowed_page(
            "https://x@www.myanmartvchannels.com/channels/x/"
        ));
    }
}

#[cfg(target_os = "windows")]
pub fn open(args: &Value) -> Result<Value, String> {
    use std::os::windows::ffi::OsStrExt;
    let link = args["url"]
        .as_str()
        .filter(|s| allowed_page(s))
        .ok_or("Invalid Myanmar TV link")?;
    let wide = |s: &str| {
        std::ffi::OsStr::new(s)
            .encode_wide()
            .chain(Some(0))
            .collect::<Vec<u16>>()
    };
    let operation = wide("open");
    let file = wide(link);
    #[link(name = "shell32")]
    unsafe extern "system" {
        fn ShellExecuteW(
            window: *mut std::ffi::c_void,
            operation: *const u16,
            file: *const u16,
            parameters: *const u16,
            directory: *const u16,
            show: i32,
        ) -> isize;
    }
    let result = unsafe {
        ShellExecuteW(
            std::ptr::null_mut(),
            operation.as_ptr(),
            file.as_ptr(),
            std::ptr::null(),
            std::ptr::null(),
            1,
        )
    };
    if result <= 32 {
        Err(format!("Could not open the default browser ({result})"))
    } else {
        Ok(json!({"opened":true}))
    }
}

pub fn logo(path: &str) -> Option<&'static [u8]> {
    match path {
        "/tv-channels/5plus.webp" => {
            Some(include_bytes!("../android/assets/tv-channels/5plus.webp"))
        }
        "/tv-channels/channel7.webp" => Some(include_bytes!(
            "../android/assets/tv-channels/channel7.webp"
        )),
        "/tv-channels/channelk.webp" => Some(include_bytes!(
            "../android/assets/tv-channels/channelk.webp"
        )),
        "/tv-channels/channelme.webp" => Some(include_bytes!(
            "../android/assets/tv-channels/channelme.webp"
        )),
        "/tv-channels/dvb.webp" => Some(include_bytes!("../android/assets/tv-channels/dvb.webp")),
        "/tv-channels/farmer.webp" => {
            Some(include_bytes!("../android/assets/tv-channels/farmer.webp"))
        }
        "/tv-channels/fortune.webp" => {
            Some(include_bytes!("../android/assets/tv-channels/fortune.webp"))
        }
        "/tv-channels/heyplay.webp" => {
            Some(include_bytes!("../android/assets/tv-channels/heyplay.webp"))
        }
        "/tv-channels/hluttaw.webp" => {
            Some(include_bytes!("../android/assets/tv-channels/hluttaw.webp"))
        }
        "/tv-channels/mahar.webp" => {
            Some(include_bytes!("../android/assets/tv-channels/mahar.webp"))
        }
        "/tv-channels/maharbawdi.webp" => Some(include_bytes!(
            "../android/assets/tv-channels/maharbawdi.webp"
        )),
        "/tv-channels/maharesports.webp" => Some(include_bytes!(
            "../android/assets/tv-channels/maharesports.webp"
        )),
        "/tv-channels/mchannel.webp" => Some(include_bytes!(
            "../android/assets/tv-channels/mchannel.webp"
        )),
        "/tv-channels/mitv.webp" => Some(include_bytes!("../android/assets/tv-channels/mitv.webp")),
        "/tv-channels/mrtv.webp" => Some(include_bytes!("../android/assets/tv-channels/mrtv.webp")),
        "/tv-channels/mrtv4.webp" => {
            Some(include_bytes!("../android/assets/tv-channels/mrtv4.webp"))
        }
        "/tv-channels/mrtvnews.webp" => Some(include_bytes!(
            "../android/assets/tv-channels/mrtvnews.webp"
        )),
        "/tv-channels/nrc.webp" => Some(include_bytes!("../android/assets/tv-channels/nrc.webp")),
        _ => None,
    }
}
