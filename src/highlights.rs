use reqwest::blocking::Client;
use scraper::{Html, Selector};
use serde_json::{Value, json};
use std::{
    io::Read,
    sync::Mutex,
    time::{Duration, Instant},
};
const SOURCE: &str = "https://hoofoot.net";
fn safe_path(path: &str) -> bool {
    if path == "/full-matches/" {
        return true;
    }
    let parts: Vec<_> = path.trim_matches('/').split('/').collect();
    parts.len() == 3
        && parts[0] == "full-matches"
        && parts[1]
            .bytes()
            .all(|b| b.is_ascii_lowercase() || b == b'-' || b.is_ascii_digit())
        && parts[2].contains("-highlights-")
        && parts[2]
            .bytes()
            .all(|b| b.is_ascii_lowercase() || b == b'-' || b.is_ascii_digit())
}
pub fn allowed_url(value: &str) -> bool {
    url::Url::parse(value).is_ok_and(|u| {
        u.scheme() == "https"
            && u.host_str() == Some("hoofoot.net")
            && u.username().is_empty()
            && u.password().is_none()
            && u.port().is_none()
            && u.query().is_none()
            && u.fragment().is_none()
            && safe_path(u.path())
    })
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

fn date_from_path(path: &str) -> Option<String> {
    let (_, date) = path.rsplit_once("-highlights-")?;
    let parts: Vec<_> = date.trim_end_matches('/').split('-').collect();
    let months = [
        "january",
        "february",
        "march",
        "april",
        "may",
        "june",
        "july",
        "august",
        "september",
        "october",
        "november",
        "december",
    ];
    if parts.len() != 3 {
        return None;
    }
    let month = months.iter().position(|m| *m == parts[0])? + 1;
    let day = parts[1].parse::<u32>().ok()?;
    let year = parts[2].parse::<u32>().ok()?;
    let leap = year % 4 == 0 && (year % 100 != 0 || year % 400 == 0);
    let max = [
        31,
        if leap { 29 } else { 28 },
        31,
        30,
        31,
        30,
        31,
        31,
        30,
        31,
        30,
        31,
    ][month - 1];
    if !(2000..=2100).contains(&year) || day == 0 || day > max {
        return None;
    }
    // The source supplies a match date, not a publication time or time zone.
    Some(format!("{year:04}-{month:02}-{day:02}T00:00:00"))
}
fn logo(value: &str) -> Option<String> {
    let u = url::Url::parse(value).ok()?;
    (u.scheme() == "https"
        && u.host_str() == Some("hoofoot.thertstv.com")
        && u.path().starts_with("/logos/")
        && u.username().is_empty()
        && u.password().is_none()
        && u.port().is_none())
    .then(|| value.to_string())
}
fn parse_catalog(html: &str) -> Vec<Value> {
    let doc = Html::parse_document(html);
    let anchors = Selector::parse("a[href]").unwrap();
    let spans = Selector::parse("span").unwrap();
    let images = Selector::parse("img[alt]").unwrap();
    let base = url::Url::parse(SOURCE).unwrap();
    let mut rows = Vec::new();
    for a in doc.select(&anchors) {
        let Some(u) = a.value().attr("href").and_then(|href| base.join(href).ok()) else {
            continue;
        };
        if !allowed_url(u.as_str())
            || !a
                .select(&spans)
                .any(|e| e.text().collect::<String>().trim() == "Highlights")
        {
            continue;
        }
        let Some(published) = date_from_path(u.path()) else {
            continue;
        };
        if rows.iter().any(|r: &Value| r["url"] == u.as_str()) {
            continue;
        }
        let parts: Vec<_> = u.path().trim_matches('/').split('/').collect();
        let names: Vec<_> = a
            .select(&images)
            .filter_map(|i| i.value().attr("alt"))
            .filter(|s| !s.trim().is_empty())
            .take(2)
            .collect();
        let title = if names.len() == 2 {
            format!("{} vs {}", names[0], names[1])
        } else {
            parts[2]
                .split("-highlights-")
                .next()
                .unwrap_or(parts[2])
                .replace("-vs-", " vs ")
                .replace('-', " ")
        };
        let league = parts[1]
            .split('-')
            .map(|s| {
                let mut c = s.chars();
                c.next()
                    .map(|x| x.to_uppercase().collect::<String>() + c.as_str())
                    .unwrap_or_default()
            })
            .collect::<Vec<_>>()
            .join(" ");
        let logos: Vec<_> = a
            .select(&images)
            .filter_map(|i| i.value().attr("src").and_then(logo))
            .take(2)
            .collect();
        rows.push(json!({"videoId":parts[2],"title":title,"url":u.as_str(),"page":u.as_str(),"published":published,"league":league,"source":"HooFoot","sections":[],"thumbnail":logos.first(),"awayLogo":logos.get(1)}));
    }
    rows.sort_by(|a, b| b["published"].as_str().cmp(&a["published"].as_str()));
    rows
}
fn stream_catalog(mut reader: impl Read) -> Result<(Vec<Value>, bool), String> {
    let mut buffer = Vec::new();
    let mut chunk = [0u8; 8192];
    let mut total = 0usize;
    let mut rows = Vec::new();
    let mut seen = std::collections::HashSet::new();
    let mut partial = false;
    loop {
        let n = match reader.read(&mut chunk) {
            Ok(n) => n,
            Err(_) if !rows.is_empty() => {
                partial = true;
                break;
            }
            Err(_) => return Err("Could not read HooFoot highlights. Please retry.".into()),
        };
        if n == 0 {
            break;
        }
        total += n;
        if total > 30_000_000 {
            return Err("HooFoot returned an unexpectedly large page.".into());
        }
        buffer.extend_from_slice(&chunk[..n]);
        loop {
            let Some(start) = buffer.windows(3).position(|w| w == b"<a ") else {
                if buffer.len() > 2 {
                    buffer.drain(..buffer.len() - 2);
                }
                break;
            };
            if start > 0 {
                buffer.drain(..start);
            }
            let Some(end) = buffer.windows(4).position(|w| w == b"</a>") else {
                if buffer.len() > 131072 {
                    return Err("Invalid highlight markup.".into());
                }
                break;
            };
            let end = end + 4;
            let text = String::from_utf8_lossy(&buffer[..end]);
            if text.contains("-highlights-") {
                for row in parse_catalog(&text) {
                    if seen.insert(row["url"].as_str().unwrap().to_string()) {
                        rows.push(row);
                    }
                }
            }
            buffer.drain(..end);
        }
    }
    rows.sort_by(|a, b| b["published"].as_str().cmp(&a["published"].as_str()));
    Ok((rows, partial))
}
static CATALOG: Mutex<Option<(Instant, Value)>> = Mutex::new(None);
pub fn catalog(c: &Client) -> Result<Value, String> {
    if let Some((at, data)) = CATALOG
        .lock()
        .map_err(|_| "Highlights cache unavailable")?
        .as_ref()
    {
        if at.elapsed() < Duration::from_secs(300) {
            return Ok(data.clone());
        }
    }
    let response = c
        .get(format!("{SOURCE}/full-matches/"))
        .timeout(Duration::from_secs(55))
        .send()
        .and_then(|r| r.error_for_status())
        .map_err(|_| "Could not reach HooFoot. Please retry.")?;
    let (videos, partial) = stream_catalog(response)?;
    if videos.is_empty() {
        return Err(
            "No playable highlight links were found on HooFoot. Please retry later.".into(),
        );
    }
    let result = json!({"videos":videos,"partial":partial,"source":"HooFoot","feed":"catalog"});
    *CATALOG.lock().map_err(|_| "Highlights cache unavailable")? =
        Some((Instant::now(), result.clone()));
    Ok(result)
}
fn team_key(s: &str) -> String {
    s.to_lowercase()
        .replace("paris saint-germain", "psg")
        .replace("manchester united", "man united")
        .replace("manchester city", "man city")
        .split_whitespace()
        .filter(|s| !matches!(*s, "fc" | "afc" | "cf"))
        .collect::<Vec<_>>()
        .join(" ")
}
// Use the publisher's player, including its ads and availability checks.
pub fn official(c: &Client, args: &Value) -> Result<Value, String> {
    let home = args["home"]
        .as_str()
        .filter(|s| (3..=120).contains(&s.len()))
        .ok_or("Invalid home team")?;
    let away = args["away"]
        .as_str()
        .filter(|s| (3..=120).contains(&s.len()))
        .ok_or("Invalid away team")?;
    let date = args["date"]
        .as_str()
        .filter(|s| s.len() == 8 && s.bytes().all(|b| b.is_ascii_digit()))
        .ok_or("Invalid match date")?;
    let data: Value = c.get(format!("https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard?dates={date}&limit=1000"))
        .timeout(Duration::from_secs(12)).send().and_then(|r|r.error_for_status()).and_then(|r|r.json()).map_err(|_| "Official highlights lookup unavailable")?;
    let event = data["events"].as_array().into_iter().flatten().find(|e| {
        let teams = &e["competitions"][0]["competitors"];
        let names: Vec<_> = teams
            .as_array()
            .into_iter()
            .flatten()
            .map(|t| team_key(t["team"]["displayName"].as_str().unwrap_or("")))
            .collect();
        names.contains(&team_key(home)) && names.contains(&team_key(away))
    });
    let Some(id) = event
        .and_then(|e| e["id"].as_str())
        .filter(|s| s.bytes().all(|b| b.is_ascii_digit()))
    else {
        return Ok(json!({"video":null}));
    };
    let summary: Value = c
        .get(format!(
            "https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event={id}"
        ))
        .timeout(Duration::from_secs(12))
        .send()
        .and_then(|r| r.error_for_status())
        .and_then(|r| r.json())
        .map_err(|_| "Official highlights lookup unavailable")?;
    if summary["header"]["id"].as_str() != Some(id) {
        return Err("Official match identity mismatch".into());
    }
    Ok(json!({"video":official_video(&summary)}))
}
fn official_video(summary: &Value) -> Option<Value> {
    summary["videos"].as_array()?.iter().filter(|v|v["source"]=="espn").find_map(|v|{
        let id=v["id"].as_u64()?;
        let title=v["headline"].as_str()?;
        let label=format!("{} {}",title,v["description"].as_str().unwrap_or("")).to_lowercase();
        if !["highlight","recap","goals"].iter().any(|s|label.contains(s)){return None;}
        Some(json!({"source":"ESPN","title":title,"embed":format!("https://www.espn.com/core/video/iframe?id={id}&endcard=false")}))
    })
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
    let data = catalog(c)?;
    let h = team_key(home);
    let a = team_key(away);
    let videos: Vec<_> = data["videos"]
        .as_array()
        .unwrap()
        .iter()
        .filter(|v| {
            let title = team_key(v["title"].as_str().unwrap_or(""));
            title.contains(&h) && title.contains(&a)
        })
        .cloned()
        .collect();
    Ok(json!({"videos":videos,"browse":"https://hoofoot.net/full-matches/"}))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    #[ignore = "requires ESPN public services"]
    fn live_official_match_lookup() {
        let result = official(
            &crate::provider::client().unwrap(),
            &json!({"home":"United States","away":"Zambia","date":"20240725"}),
        )
        .unwrap();
        assert_eq!(result["video"]["source"], "ESPN");
        assert!(
            result["video"]["embed"]
                .as_str()
                .unwrap()
                .starts_with("https://www.espn.com/core/video/iframe?id=")
        );
    }
    #[test]
    fn official_publisher_player_only() {
        let v=official_video(&json!({"videos":[{"source":"other","id":1,"headline":"Highlights"},{"source":"espn","id":42,"headline":"Match recap"}]})).unwrap();
        assert_eq!(
            v["embed"],
            "https://www.espn.com/core/video/iframe?id=42&endcard=false"
        );
        assert!(
            official_video(
                &json!({"videos":[{"source":"espn","id":1,"headline":"Transfer discussion"}]})
            )
            .is_none()
        );
    }
    #[test]
    fn source_pages_dates_and_playable_cards() {
        let html = r#"<a href='/full-matches/champions-league/psg-vs-barcelona-highlights-october-20-2026/'><img alt='Paris Saint-Germain' src='https://hoofoot.thertstv.com/logos/160-128.webp'><img alt='Barcelona' src='https://hoofoot.thertstv.com/logos/83-128.webp'><span>Highlights</span></a><a href='/full-matches/premier-league/a-vs-b-highlights-october-21-2026/'><span>View Details</span></a><a href='https://evil.test/full-matches/la-liga/a-vs-b-highlights-october-20-2026/'><span>Highlights</span></a>"#;
        struct Tiny<'a>(&'a [u8]);
        impl Read for Tiny<'_> {
            fn read(&mut self, out: &mut [u8]) -> std::io::Result<usize> {
                let n = out.len().min(3).min(self.0.len());
                out[..n].copy_from_slice(&self.0[..n]);
                self.0 = &self.0[n..];
                Ok(n)
            }
        }
        let streamed = stream_catalog(Tiny(html.as_bytes())).unwrap();
        let rows = parse_catalog(html);
        assert_eq!(streamed, (rows.clone(), false));
        struct Interrupted<'a>(&'a [u8]);
        impl Read for Interrupted<'_> {
            fn read(&mut self, out: &mut [u8]) -> std::io::Result<usize> {
                if self.0.is_empty() {
                    return Err(std::io::Error::from(std::io::ErrorKind::TimedOut));
                }
                self.0.read(out)
            }
        }
        assert_eq!(
            stream_catalog(Interrupted(html.as_bytes())).unwrap(),
            (rows.clone(), true)
        );
        assert!(stream_catalog(Interrupted(&[])).is_err());
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0]["title"], "Paris Saint-Germain vs Barcelona");
        assert_eq!(rows[0]["league"], "Champions League");
        assert_eq!(rows[0]["published"], "2026-10-20T00:00:00");
        assert!(date_from_path("/a-highlights-february-30-2026/").is_none());
        assert!(date_from_path("/a-highlights-february-29-2024/").is_some());
        for bad in [
            "https://hoofoot.net.evil.test/full-matches/",
            "http://hoofoot.net/full-matches/",
            "https://x@hoofoot.net/full-matches/",
            "https://hoofoot.net/full-matches/?redirect=evil",
            "https://hoofoot.net/other/",
        ] {
            assert!(!allowed_url(bad));
        }
        assert!(allowed_url(
            "https://hoofoot.net/full-matches/la-liga/a-vs-b-highlights-october-20-2026/"
        ));
    }
    #[test]
    #[ignore = "requires the public HooFoot homepage"]
    fn live_catalog() {
        let data = catalog(&crate::provider::client().unwrap()).unwrap();
        assert_eq!(data["source"], "HooFoot");
        assert!(!data["videos"].as_array().unwrap().is_empty());
        for v in data["videos"].as_array().unwrap() {
            assert!(allowed_url(v["url"].as_str().unwrap()));
        }
    }
}
