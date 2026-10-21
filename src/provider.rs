use crate::language;
use reqwest::blocking::Client;
use scraper::{Html, Selector};
use serde_json::{Value, json};
use std::time::Duration;
const SITE: &str = "https://sutbongtv8.net";
fn selector(s: &str) -> Selector {
    Selector::parse(s).unwrap()
}
fn text(el: scraper::ElementRef<'_>, s: &str) -> String {
    el.select(&selector(s))
        .next()
        .map(|e| e.text().collect::<Vec<_>>().join(" ").trim().to_string())
        .unwrap_or_default()
}
pub(crate) fn client() -> Result<Client, String> {
    Client::builder()
        .timeout(Duration::from_secs(25))
        .user_agent("Mozilla/5.0 LiveSport/0.1")
        .build()
        .map_err(|e| e.to_string())
}
pub(crate) fn get(c: &Client, url: &str) -> Result<String, String> {
    c.get(url)
        .send()
        .and_then(|r| r.error_for_status())
        .and_then(|r| r.text())
        .map_err(|e| e.to_string())
}
pub(crate) fn matches(c: &Client) -> Result<Value, String> {
    let html = get(c, SITE)?;
    parse_matches(&html)
}
pub(crate) fn parse_matches(html: &str) -> Result<Value, String> {
    let doc = Html::parse_document(html);
    let metadata: Value = doc
        .select(&selector("script#matches-data"))
        .next()
        .and_then(|s| serde_json::from_str(&s.inner_html()).ok())
        .unwrap_or(json!([]));
    let mut rows = Vec::new();
    for card in doc.select(&selector(".match-item[data-match-id]")) {
        // Football is sport 1; omit basketball and other sports before
        // building the list, counts, filters and startup playback choices.
        if card.value().attr("sport-id").unwrap_or("1") != "1" {
            continue;
        }
        let Some(link) = card.select(&selector("a.link-match")).next() else {
            continue;
        };
        let page = link.value().attr("href").unwrap_or_default();
        let mut channels = Vec::new();
        for a in card.select(&selector("a[href*='blv=']")) {
            let href = a.value().attr("href").unwrap_or_default();
            if let Ok(u) = url::Url::parse(href)
                && let Some((_, id)) = u.query_pairs().find(|(k, _)| k == "blv")
            {
                let name = a
                    .select(&selector("img"))
                    .next()
                    .and_then(|i| i.value().attr("alt"))
                    .unwrap_or("Commentator");
                if !channels.iter().any(|x: &Value| x["id"] == id.as_ref()) {
                    channels.push(json!({"id":id,"name":language::commentator(name)}));
                }
            }
        }
        let id = card.value().attr("data-match-id").unwrap_or_default();
        let post = card.value().attr("data-post-id").unwrap_or_default();
        let info = metadata
            .as_array()
            .and_then(|a| a.iter().find(|r| r["postid"].as_str() == Some(post)));
        let kickoff = info.and_then(|r| {
            r["time"]
                .as_str()
                .and_then(|s| s.parse::<i64>().ok())
                .or_else(|| r["time"].as_i64())
        });
        let source_league = text(card, ".match-item__comp");
        let english_league = info
            .and_then(|r| r["match_data"]["competition_full"].as_str())
            .filter(|s| !s.trim().is_empty())
            .unwrap_or(&source_league);
        let football = card.value().attr("sport-id").unwrap_or("1") == "1";
        let logo = |s: &str| {
            card.select(&selector(s))
                .next()
                .and_then(|e| e.value().attr("src"))
                .filter(|u| u.starts_with("https://"))
                .unwrap_or_default()
                .to_string()
        };
        if rows.iter().any(|x: &Value| x["id"] == id) {
            continue;
        }
        rows.push(json!({"id":id,"post":post,"page":page,
            "home":text(card,".name-home"),"away":text(card,".name-away"),"league":language::league(english_league),
            "time":text(card,".match-item__time"),"kickoff":kickoff,"status":language::status(&text(card,".status-text"),football),
            "scoreId":info.and_then(|r|r["ls_id"].as_str()).unwrap_or(id),"sport":card.value().attr("sport-id").unwrap_or("1"),
            "finished":card.value().attr("data-bucket")==Some("finished") || info.is_some_and(|r|r["is_finished"]==1 || r["is_finished"]==true),
            "homeLogo":logo(".logo-home img"),"awayLogo":logo(".logo-away img"),
            "homeScore":text(card,".home-score"),"awayScore":text(card,".away-score"),"minute":text(card,".time-text"),
            "live":card.value().attr("data-bucket")==Some("live"),"channels":channels}));
    }
    // The homepage renders only its current live cards; the embedded schedule
    // also contains upcoming fixtures that have no card yet.
    for info in metadata.as_array().into_iter().flatten() {
        if info["sport_id"].as_str() != Some("1") && info["sport_id"] != 1 {
            continue;
        }
        let Some(post) = info["postid"].as_str() else {
            continue;
        };
        if rows.iter().any(|r| r["post"] == post) {
            continue;
        }
        let (Some(home), Some(away)) = (info["home_name"].as_str(), info["away_name"].as_str())
        else {
            continue;
        };
        let kickoff = info["time"]
            .as_str()
            .and_then(|s| s.parse::<i64>().ok())
            .or_else(|| info["time"].as_i64());
        let channels: Vec<Value> = info["match_data"]["anchors"].as_array().into_iter().flatten().filter_map(|a| {
            let channel_id = if a["id"].is_null() { &a["uid"] } else { &a["id"] };
            let id=channel_id.as_str().map(str::to_owned).or_else(||channel_id.as_u64().map(|n|n.to_string()))?;
            Some(json!({"id":id,"name":language::commentator(a["nickName"].as_str().unwrap_or("Commentator"))}))
        }).collect();
        rows.push(json!({"id":post,"post":post,"page":format!("{SITE}/truc-tiep/{}/",info["post_name"].as_str().unwrap_or_default()),
            "home":home,"away":away,"league":language::league(info["match_data"]["competition_full"].as_str().unwrap_or("Football")),
            "kickoff":kickoff,"time":"","sport":"1","scoreId":info["ls_id"].as_str().unwrap_or(post),
            "finished":info["is_finished"]==1||info["is_finished"]==true,
            "live":info["is_live"]==1||info["is_live"]==true,
            "status":language::status(info["status_text"].as_str().unwrap_or("Scheduled"),true),"minute":"",
            "homeLogo":info["home_logo"].as_str().unwrap_or_default(),"awayLogo":info["away_logo"].as_str().unwrap_or_default(),
            "homeScore":info["home_score"].as_i64().map(|n|n.to_string()).unwrap_or_default(),
            "awayScore":info["away_score"].as_i64().map(|n|n.to_string()).unwrap_or_default(),"channels":channels}));
    }
    if rows.is_empty()
        && doc
            .select(&selector(".match-item[data-match-id]"))
            .next()
            .is_none()
    {
        return Err("No matches found. The provider may have changed its page layout.".into());
    }
    // Some provider entries duplicate the fixture with a schedule ID instead of
    // the livescore ID. Keep its playable post but use the actual score feed.
    let original = rows.clone();
    for row in &mut rows {
        if let Some(canonical) = original.iter().find(|other| {
            other["home"] == row["home"]
                && other["away"] == row["away"]
                && other["kickoff"] == row["kickoff"]
                && other["sport"] == row["sport"]
                && other["scoreId"]
                    .as_str()
                    .is_some_and(|s| s.chars().any(|c| c.is_ascii_alphabetic()))
        }) {
            for key in [
                "scoreId",
                "homeScore",
                "awayScore",
                "status",
                "minute",
                "live",
                "finished",
            ] {
                row[key] = canonical[key].clone();
            }
        }
    }
    let mut seen = std::collections::HashSet::new();
    rows.retain(|r| {
        seen.insert(format!(
            "{}|{}|{}|{}",
            r["home"], r["away"], r["kickoff"], r["sport"]
        ))
    });
    Ok(json!(rows))
}
pub(crate) fn resolve(c: &Client, args: &Value) -> Result<Value, String> {
    let post = args["post"].as_str().unwrap_or_default();
    let blv = args["channel"].as_str().unwrap_or_default();
    if post.is_empty()
        || blv.is_empty()
        || !post.chars().all(|x| x.is_ascii_digit())
        || !blv.chars().all(|x| x.is_ascii_digit())
    {
        return Err("No live commentator is available for this match yet. Refresh the list closer to kickoff.".into());
    }
    let response = c
        .post(format!("{SITE}/wp-admin/admin-ajax.php"))
        .timeout(Duration::from_secs(5))
        .header("Referer", SITE)
        .form(&[
            ("action", "soco_get_stream"),
            ("post_id", post),
            ("blv", blv),
        ])
        .send();
    let primary = response
        .ok()
        .and_then(|r| r.json::<Value>().ok())
        .and_then(|v| v["data"]["stream"].as_str().map(str::to_owned));
    let stream = if let Some(s) = primary.filter(|s| !s.is_empty()) {
        s
    } else {
        let rows: Value = c
            .get("https://biz.vnres.co/api/live/livingRoom")
            .timeout(Duration::from_secs(8))
            .send()
            .and_then(|r| r.error_for_status())
            .and_then(|r| r.json())
            .map_err(|e| e.to_string())?;
        rows.as_array()
            .and_then(|a| a.iter().find(|r| r["id"].as_str() == Some(blv)))
            .and_then(|r| r["stream"].as_str())
            .ok_or("This channel is offline. Try another commentator.")?
            .to_string()
    };
    let u = url::Url::parse(&stream).map_err(|e| e.to_string())?;
    if u.scheme() != "https" {
        return Err("Provider returned an unsupported stream URL.".into());
    }
    Ok(stream_sources(&stream))
}

fn stream_sources(stream: &str) -> Value {
    let u = url::Url::parse(stream).expect("validated stream URL");
    let mut sources = Vec::new();
    // This exact alternate route is published by the provider's match player.
    // Preserve the signed query byte-for-byte, including its encoding.
    let host = u.host_str().unwrap_or_default();
    let numbered_pull = host.strip_prefix("pull").and_then(|h| h.strip_suffix(".scstream.net"))
        .is_some_and(|n| !n.is_empty() && n.bytes().all(|b| b.is_ascii_digit()));
    if numbered_pull && u.path().ends_with(".flv") && u.port().is_none() && u.username().is_empty() && u.password().is_none() {
        let mut alternate = u.clone();
        alternate.set_host(Some("pull.niues.live")).unwrap();
        alternate.set_path(&format!("{}.m3u8", u.path().trim_end_matches(".flv")));
        sources.push(json!({"url":alternate.as_str(),"format":"hls","label":"Alternate HLS"}));
    }
    sources.push(json!({"url":stream,"format":if u.path().ends_with(".flv") {"flv"} else {"hls"},"label":"Original"}));
    json!({"url":sources[0]["url"],"format":sources[0]["format"],"sources":sources})
}

#[cfg(test)]
mod stream_tests {
    use super::*;
    #[test]
    fn official_alternate_preserves_signature() {
        let result=stream_sources("https://pull06.scstream.net/live/test.flv?auth_key=a%2Fb&token=x+y");
        assert_eq!(result["sources"][0]["url"],"https://pull.niues.live/live/test.m3u8?auth_key=a%2Fb&token=x+y");
        assert_eq!(result["sources"][1]["url"],"https://pull06.scstream.net/live/test.flv?auth_key=a%2Fb&token=x+y");
        assert_eq!(stream_sources("https://pull06.scstream.net.evil.test/a.flv")["sources"].as_array().unwrap().len(),1);
        assert_eq!(stream_sources("https://other.test/a.flv")["sources"].as_array().unwrap().len(),1);
    }
}
