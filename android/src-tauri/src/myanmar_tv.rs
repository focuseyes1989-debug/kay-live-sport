use reqwest::blocking::Client;
use scraper::{Html, Selector};
use serde_json::{Value, json};
use std::time::Duration;
const SITE: &str = "https://www.myanmartvchannels.com";
fn seeds() -> Vec<Value> {
    serde_json::from_str(include_str!("../../myanmar-tv-channels.json")).unwrap()
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
pub fn catalog(c: &Client) -> Result<Value, String> {
    let cached = seeds();
    let fetched = read(c, &format!("{SITE}/channels/"))
        .map(|s| parse_catalog(&s))
        .unwrap_or_default();
    let fallback = fetched.is_empty();
    let mut rows = if fallback { cached.clone() } else { fetched };
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
pub fn resolve(c: &Client, args: &Value) -> Result<Value, String> {
    let id = args["id"].as_str().ok_or("Choose a Myanmar TV channel")?;
    let seed = seeds().into_iter().find(|r| r["id"] == id);
    if id.is_empty() || id.len() > 60 || !id.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-')
    {
        return Err("Invalid channel".into());
    }
    let current = read(c, &page(id)).ok().and_then(|s| stream_from_html(&s));
    let direct = current.or_else(|| {
        seed.as_ref()
            .and_then(|s| s["stream"].as_str())
            .filter(|s| safe_stream(s))
            .map(str::to_string)
    });
    if let Some(url) = direct {
        return Ok(json!({"url":url,"format":"hls"}));
    }
    let stream = if id == "heyplay" { "channel9" } else { id };
    let token=c.get(format!("{SITE}/api/token")).query(&[("stream",stream)]).header("X-Requested-With","XMLHttpRequest").header("Referer",page(id)).timeout(Duration::from_secs(8)).send().and_then(|r|r.error_for_status()).and_then(|r|r.json::<Value>()).map_err(|_|"The source requires a browser session or is unavailable. Retry or open the source page.".to_string())?;
    let url = token["signedUrl"]
        .as_str()
        .filter(|s| safe_stream(s))
        .ok_or(
            "No playable public stream is available. Open the source page to check this channel.",
        )?;
    Ok(json!({"url":url,"format":"hls"}))
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
        assert_eq!(seeds().len(), 18);
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
