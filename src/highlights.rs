use reqwest::blocking::Client;
use scraper::{Html, Selector};
use serde_json::{Value, json};
use std::sync::{
    Mutex,
    atomic::{AtomicUsize, Ordering},
};
use std::time::Duration;
use std::time::Instant;
use unicode_normalization::{UnicodeNormalization, char::is_combining_mark};

fn key(s: &str) -> String {
    s.nfd()
        .filter(|c| !is_combining_mark(*c))
        .collect::<String>()
        .to_lowercase()
        .replace("utd", "united")
        .split(|c: char| !c.is_alphanumeric())
        .filter(|s| !matches!(*s, "fc" | "afc" | "cf" | "sc" | "f" | "c"))
        .collect::<Vec<_>>()
        .join(" ")
}
fn matches(title: &str, home: &str, away: &str) -> bool {
    let title = format!(" {} ", key(title));
    [home, away].iter().all(|team| {
        let team = key(team);
        team.len() >= 3 && title.contains(&format!(" {team} "))
    })
}
pub fn allowed_url(s: &str) -> bool {
    let Ok(u) = url::Url::parse(s) else {
        return false;
    };
    u.scheme() == "https"
        && u.username().is_empty()
        && u.password().is_none()
        && u.port().is_none()
        && matches!(
            u.host_str(),
            Some("www.youtube.com" | "matchhighlights.live")
        )
}
#[cfg(target_os = "windows")]
pub fn open(args: &Value) -> Result<Value, String> {
    use std::os::windows::ffi::OsStrExt;
    let link = args["url"]
        .as_str()
        .filter(|s| allowed_url(s))
        .ok_or("Invalid highlights link")?;
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
fn published_day(s: &str) -> Option<i64> {
    // Gregorian date to Unix day; publication date is a bounded freshness guard.
    let date = s.get(..10)?;
    let p: Vec<i64> = date
        .split('-')
        .map(str::parse)
        .collect::<Result<_, _>>()
        .ok()?;
    if p.len() != 3 || !(1..=12).contains(&p[1]) || !(1..=31).contains(&p[2]) {
        return None;
    }
    let y = p[0] - i64::from(p[1] <= 2);
    let era = y.div_euclid(400);
    let yo = y - era * 400;
    let m = p[1] + if p[1] > 2 { -3 } else { 9 };
    Some(era * 146097 + yo * 365 + yo / 4 - yo / 100 + (153 * m + 2) / 5 + p[2] - 1 - 719468)
}
fn video(data: &Value, home: &str, away: &str, kickoff: i64, page: &str) -> Option<Value> {
    if data["@type"] != "VideoObject" {
        return None;
    }
    let title = data["name"].as_str()?;
    let day = published_day(data["uploadDate"].as_str()?)?;
    if !matches(title, home, away) || !(0..=3).contains(&(day - kickoff.div_euclid(86400))) {
        return None;
    }
    catalog_video(data, page)
}
fn catalog_video(data: &Value, page: &str) -> Option<Value> {
    if data["@type"] != "VideoObject" {
        return None;
    }
    let title = data["name"].as_str().filter(|s| !s.trim().is_empty())?;
    published_day(data["uploadDate"].as_str()?)?;
    let u = url::Url::parse(data["embedUrl"].as_str()?).ok()?;
    if u.scheme() != "https"
        || !matches!(
            u.host_str(),
            Some("www.youtube.com" | "www.youtube-nocookie.com")
        )
    {
        return None;
    }
    let id = u.path().strip_prefix("/embed/")?;
    if id.len() != 11
        || !id
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'_' || b == b'-')
    {
        return None;
    }
    Some(
        json!({"title":title,"source":"MatchHighlights","published":data["uploadDate"],"page":page,"thumbnail":format!("https://i.ytimg.com/vi/{id}/hqdefault.jpg"),
        "videoId":id,"url":format!("https://www.youtube.com/watch?v={id}")}),
    )
}
fn catalog_pages(html: &str) -> Vec<(String, String)> {
    let doc = Html::parse_document(html);
    let mut pages = Vec::new();
    for a in doc.select(&Selector::parse("a[href^='/video/']").unwrap()) {
        let href = a.value().attr("href").unwrap_or("");
        let page = format!("https://matchhighlights.live{href}");
        if !allowed_url(&page) || pages.iter().any(|(p, _): &(String, String)| p == &page) {
            continue;
        }
        let league = a
            .select(
                &Selector::parse(".mh-scorebug-competition,.mh-card-league,.mh-card-competition")
                    .unwrap(),
            )
            .next()
            .map(|e| e.text().collect::<String>())
            .unwrap_or_default();
        pages.push((page, league));
        if pages.len() == 120 {
            break;
        }
    }
    pages
}
static CATALOG: Mutex<Option<(Instant, Value)>> = Mutex::new(None);
fn public_catalog(data: &Value) -> Result<Value, String> {
    let rows = data.as_array().ok_or("Invalid highlights feed")?;
    let mut videos = Vec::<Value>::new();
    for row in rows {
        let Some(id) = row["video_id"].as_str() else {
            continue;
        };
        let metadata = json!({"@type":"VideoObject","name":row["title"],"uploadDate":row["published_at"],"embedUrl":format!("https://www.youtube.com/embed/{id}")});
        if let Some(mut item) = catalog_video(&metadata, "https://matchhighlights.live/") {
            let section = row["section"].as_str().unwrap_or("");
            if let Some(existing) = videos.iter_mut().find(|v| v["videoId"] == item["videoId"]) {
                if !section.is_empty()
                    && !existing["sections"]
                        .as_array()
                        .unwrap()
                        .iter()
                        .any(|s| s == section)
                {
                    existing["sections"]
                        .as_array_mut()
                        .unwrap()
                        .push(json!(section));
                }
                let views = row["view_count"].as_u64().unwrap_or(0);
                if views > existing["views"].as_u64().unwrap_or(0) {
                    existing["views"] = json!(views);
                }
                continue;
            }
            item["sections"] = if section.is_empty() {
                json!([])
            } else {
                json!([section])
            };
            item["views"] = json!(row["view_count"].as_u64().unwrap_or(0));
            item["league"] = row["league"].clone();
            item["embeddable"] = row["embeddable"].clone();
            videos.push(item);
        }
    }
    if !rows.is_empty() && videos.is_empty() {
        return Err("Highlights feed metadata unavailable".into());
    }
    Ok(json!({"videos":videos,"partial":false,"source":"MatchHighlights","feed":"live"}))
}
pub fn catalog(c: &Client) -> Result<Value, String> {
    if let Some((time, data)) = CATALOG
        .lock()
        .map_err(|_| "Catalog cache unavailable")?
        .as_ref()
    {
        if time.elapsed() < Duration::from_secs(300) {
            return Ok(data.clone());
        }
    }
    // This is the same unauthenticated public feed used by the site's browser UI.
    // Its pre-rendered HTML can lag behind the live catalog by several days.
    let live = c
        .get("https://matchhighlights.live/api/public-data/cached_highlights")
        .query(&[
            (
                "select",
                "video_id,title,published_at,league,embeddable,section,view_count",
            ),
            ("order", "published_at.desc"),
            ("limit", "500"),
        ])
        .timeout(Duration::from_secs(15))
        .send()
        .and_then(|r| r.error_for_status())
        .and_then(|r| r.json::<Value>())
        .map_err(|e| e.to_string())
        .and_then(|data| public_catalog(&data));
    if let Ok(data) = live {
        *CATALOG.lock().map_err(|_| "Catalog cache unavailable")? =
            Some((Instant::now(), data.clone()));
        return Ok(data);
    }
    let html = c
        .get("https://matchhighlights.live/")
        .timeout(Duration::from_secs(12))
        .send()
        .and_then(|r| r.error_for_status())
        .and_then(|r| r.text())
        .map_err(|e| e.to_string())?;
    let pages = catalog_pages(&html);
    if pages.is_empty() {
        return Err("Highlights catalog is unavailable. Please try Refresh.".into());
    }
    // Bounded parallel detail reads; a complete catalog never blocks IPC indefinitely.
    let next = AtomicUsize::new(0);
    let videos = Mutex::new(Vec::<Value>::new());
    let errors = AtomicUsize::new(0);
    let started = Instant::now();
    std::thread::scope(|scope| {
        for _ in 0..6 {
            scope.spawn(|| {
                while started.elapsed() < Duration::from_secs(25) {
                    let i = next.fetch_add(1, Ordering::Relaxed);
                    let Some((page, league)) = pages.get(i) else {
                        break;
                    };
                    let result = c
                        .get(page)
                        .timeout(Duration::from_secs(6))
                        .send()
                        .and_then(|r| r.error_for_status())
                        .and_then(|r| r.text());
                    let Ok(html) = result else {
                        errors.fetch_add(1, Ordering::Relaxed);
                        continue;
                    };
                    let mut found = false;
                    for script in Html::parse_document(&html)
                        .select(&Selector::parse("script[type='application/ld+json']").unwrap())
                    {
                        if let Ok(data) = serde_json::from_str::<Value>(&script.inner_html()) {
                            if let Some(mut v) = catalog_video(&data, page) {
                                v["league"] = json!(league);
                                let mut rows = videos.lock().unwrap();
                                if !rows.iter().any(|r| r["videoId"] == v["videoId"]) {
                                    rows.push(v)
                                }
                                found = true;
                            }
                        }
                    }
                    if !found {
                        errors.fetch_add(1, Ordering::Relaxed);
                    }
                }
            });
        }
    });
    let videos = videos.into_inner().map_err(|_| "Catalog unavailable")?;
    if videos.is_empty() {
        return Err("Could not load highlight videos. Please try Refresh.".into());
    }
    let result =
        json!({"videos":videos,"partial":true,"source":"MatchHighlights","feed":"html-fallback"});
    Ok(result)
}
pub fn fetch(c: &Client, args: &Value) -> Result<Value, String> {
    let home = args["home"]
        .as_str()
        .filter(|s| (3..=120).contains(&s.len()))
        .ok_or("Invalid home team")?;
    let away = args["away"]
        .as_str()
        .filter(|s| (3..=120).contains(&s.len()))
        .ok_or("Invalid away team")?;
    let kickoff = args["kickoff"]
        .as_i64()
        .filter(|t| *t > 0)
        .ok_or("Invalid kickoff")?;
    if let Ok(data) = catalog(c) {
        if data["feed"] == "live" {
            let videos: Vec<Value> = data["videos"]
                .as_array()
                .into_iter()
                .flatten()
                .filter(|v| {
                    matches(v["title"].as_str().unwrap_or(""), home, away)
                        && v["published"]
                            .as_str()
                            .and_then(published_day)
                            .is_some_and(|day| (0..=3).contains(&(day - kickoff.div_euclid(86400))))
                })
                .cloned()
                .collect();
            let mut browse = url::Url::parse("https://matchhighlights.live/").unwrap();
            browse.query_pairs_mut().append_pair("q", home);
            return Ok(json!({"videos":videos,"browse":browse.as_str()}));
        }
    }
    let mut search = url::Url::parse("https://matchhighlights.live/").unwrap();
    search
        .query_pairs_mut()
        .append_pair("q", &format!("{home} {away}"));
    let get = |u: &str| -> Result<String, String> {
        c.get(u)
            .timeout(Duration::from_secs(12))
            .send()
            .and_then(|r| r.error_for_status())
            .and_then(|r| r.text())
            .map_err(|e| e.to_string())
    };
    let html = get(search.as_str())?;
    let doc = Html::parse_document(&html);
    let mut pages = Vec::new();
    for a in doc.select(&Selector::parse("a[href^='/video/']").unwrap()) {
        let title = a.value().attr("aria-label").unwrap_or("").to_string()
            + " "
            + &a.text().collect::<Vec<_>>().join(" ");
        let href = a.value().attr("href").unwrap_or("");
        let page = format!("https://matchhighlights.live{href}");
        if matches(&title, home, away) && allowed_url(&page) && !pages.contains(&page) {
            pages.push(page)
        }
        if pages.len() == 3 {
            break;
        }
    }
    let mut videos = Vec::new();
    let mut failed = false;
    for page in pages {
        let Ok(html) = get(&page) else {
            failed = true;
            continue;
        };
        for script in Html::parse_document(&html)
            .select(&Selector::parse("script[type='application/ld+json']").unwrap())
        {
            if let Ok(data) = serde_json::from_str::<Value>(&script.inner_html()) {
                if let Some(v) = video(&data, home, away, kickoff, &page) {
                    if !videos.iter().any(|r: &Value| r["videoId"] == v["videoId"]) {
                        videos.push(v)
                    }
                }
            }
        }
    }
    if videos.is_empty() && failed {
        return Err("Could not load highlight details. Please retry.".into());
    }
    Ok(json!({"videos":videos,"browse":search.as_str()}))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn homepage_cards_and_metadata() {
        let pages = catalog_pages(
            r#"<a href="/video/one/"><span class="mh-scorebug-competition">La Liga</span></a><a href="/video/one/">duplicate</a><a href="https://evil.test/video/x/">bad</a><a href="/video/two/">second</a>"#,
        );
        assert_eq!(pages.len(), 2);
        assert_eq!(pages[0].1, "La Liga");
        let item = json!({"@type":"VideoObject","name":"A highlights","uploadDate":"2026-10-19T01:00:00Z","embedUrl":"https://www.youtube.com/embed/SjxTxaJUvpU"});
        let result = catalog_video(&item, &pages[0].0).unwrap();
        assert_eq!(
            result["thumbnail"],
            "https://i.ytimg.com/vi/SjxTxaJUvpU/hqdefault.jpg"
        );
        let mut bad = item.clone();
        bad["embedUrl"] = json!("https://evil.test/embed/SjxTxaJUvpU");
        assert!(catalog_video(&bad, &pages[0].0).is_none());
        bad = item;
        bad["uploadDate"] = json!("unknown");
        assert!(catalog_video(&bad, &pages[0].0).is_none());
    }
    #[test]
    fn live_feed_normalization() {
        let row = json!({"video_id":"I1yeLaFydjM","title":"Real Madrid 4-1 Sevilla","published_at":"2026-10-18T22:01:31+00:00","league":"La Liga","embeddable":true,"section":"la_liga","view_count":10});
        let mut invalid = row.clone();
        invalid["video_id"] = json!("bad/id");
        let mut trending = row.clone();
        trending["section"] = json!("trending");
        trending["view_count"] = json!(20);
        let data = public_catalog(&json!([row.clone(), trending, row, invalid])).unwrap();
        assert_eq!(data["videos"].as_array().unwrap().len(), 1);
        assert_eq!(data["feed"], "live");
        assert_eq!(
            data["videos"][0]["sections"],
            json!(["la_liga", "trending"])
        );
        assert_eq!(data["videos"][0]["views"], 20);
        assert_eq!(data["videos"][0]["published"], "2026-10-18T22:01:31+00:00");
        assert!(public_catalog(&json!({"error":"unavailable"})).is_err());
        assert!(
            public_catalog(&json!([])).unwrap()["videos"]
                .as_array()
                .unwrap()
                .is_empty()
        );
    }
    #[test]
    #[ignore = "requires the live homepage"]
    fn live_homepage_catalog() {
        let data = catalog(&crate::provider::client().unwrap()).unwrap();
        let rows = data["videos"].as_array().unwrap();
        assert!(!rows.is_empty());
        assert!(rows.iter().all(|r| {
            r["thumbnail"]
                .as_str()
                .unwrap()
                .starts_with("https://i.ytimg.com/vi/")
        }));
        println!(
            "Homepage catalog: {} unique videos; partial={}",
            rows.len(),
            data["partial"]
        );
    }
    #[test]
    #[ignore = "requires the live MatchHighlights catalog"]
    fn live_catalog() {
        let c = crate::provider::client().unwrap();
        let result=fetch(&c,&json!({"home":"Liverpool","away":"Manchester City","kickoff":published_day("2026-10-11").unwrap()*86400})).unwrap();
        assert!(
            result["videos"]
                .as_array()
                .unwrap()
                .iter()
                .any(|v| v["videoId"] == "3uoy7oVLriY")
        );
        println!(
            "Matched live catalog video: {}",
            result["videos"][0]["title"]
        );
    }
    #[test]
    fn identity_date_and_url_guards() {
        assert!(matches(
            "Manchester Utd vs Bournemouth highlights",
            "Manchester United",
            "Bournemouth AFC"
        ));
        assert!(!matches(
            "Manchester City vs Bournemouth highlights",
            "Manchester United",
            "Bournemouth AFC"
        ));
        assert!(!matches("Inter Miami vs Milan", "Inter", "AC Milan"));
        let d = json!({"@type":"VideoObject","name":"Liverpool vs Manchester City highlights","uploadDate":"2026-10-11T18:00:00Z","embedUrl":"https://www.youtube.com/embed/3uoy7oVLriY"});
        let t = published_day("2026-10-11").unwrap() * 86400;
        assert!(
            video(
                &d,
                "Liverpool",
                "Manchester City",
                t,
                "https://matchhighlights.live/video/test/"
            )
            .is_some()
        );
        assert!(video(&d, "Liverpool", "Manchester City", t + 86400 * 7, "").is_none());
        assert!(!allowed_url("https://www.youtube.com.evil.test/watch?v=x"));
        assert!(!allowed_url("file:///test"));
        assert!(allowed_url("https://www.youtube.com/watch?v=x"));
    }
}
