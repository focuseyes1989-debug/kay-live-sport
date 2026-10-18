use reqwest::blocking::Client;
use serde_json::{Value, json};
use std::time::Duration;

fn normalize_espn(data: &Value) -> Result<Vec<Value>, String> {
    let rows = data["events"].as_array().ok_or("Invalid ESPN response")?;
    Ok(rows
        .iter()
        .map(|e| {
            let c = &e["competitions"][0];
            let teams: Vec<Value> = c["competitors"]
                .as_array()
                .into_iter()
                .flatten()
                .map(|t| {
                    json!({
                        "homeAway":t["homeAway"],"score":t["score"],"team":{
                            "displayName":t["team"]["displayName"],"name":t["team"]["name"],
                            "shortDisplayName":t["team"]["shortDisplayName"],"logo":t["team"]["logo"]}
                    })
                })
                .collect();
            json!({"id":e["id"],"source":"ESPN","date":e["date"],"league":c["altGameNote"],"status":e["status"],
            "competitions":[{"status":c["status"],"competitors":teams}]})
        })
        .collect())
}
fn normalize_fotmob(data: &Value) -> Result<Vec<Value>, String> {
    let leagues = data["leagues"]
        .as_array()
        .ok_or("Invalid FotMob response")?;
    Ok(leagues.iter().flat_map(|l| l["matches"].as_array().into_iter().flatten().map(move |e| (l,e))).map(|(l,e)| {
        let s=&e["status"];
        let finished=s["finished"].as_bool().unwrap_or(false);
        let cancelled=s["cancelled"].as_bool().unwrap_or(false);
        let reason=s["reason"]["longKey"].as_str().unwrap_or("");
        let interrupted=cancelled || ["postponed","cancelled","abandoned","suspended","interrupted"].iter().any(|x|reason.contains(x));
        let live=s["started"]==true && !finished && !interrupted;
        let description=if cancelled {"Cancelled"} else if reason.contains("postponed") {"Postponed"}
            else if reason.contains("abandoned") {"Abandoned"} else if interrupted {"Interrupted"}
            else if finished {"Full time"} else if reason.contains("half") {"Half time"}
            else if live {"Live"} else {"Scheduled"};
        let status=json!({"type":{"state":if finished {"post"} else if live {"in"} else {"pre"},
            "completed":finished,"description":description},"displayClock":s["liveTime"]["short"].as_str().unwrap_or("")});
        let teams: Vec<Value>=["home","away"].iter().map(|side|json!({"homeAway":side,"score":e[*side]["score"],
            "team":{"displayName":e[*side]["name"],"name":e[*side]["longName"],"shortDisplayName":e[*side]["shortName"]}})).collect();
        json!({"id":e["id"],"source":"FotMob","date":s["utcTime"],"league":l["name"],"competitions":[{"status":status,"competitors":teams}]})
    }).collect())
}
fn provider(c: &Client, dates: &[String], source: &str) -> (Vec<Value>, Vec<Value>) {
    std::thread::scope(|scope| {
        let requests: Vec<_> = dates
            .iter()
            .map(|date| scope.spawn(move || provider_dates(c, std::slice::from_ref(date), source)))
            .collect();
        let mut result = (Vec::new(), Vec::new());
        for request in requests {
            let (batches, errors) = request.join().unwrap_or_default();
            result.0.extend(batches);
            result.1.extend(errors);
        }
        result
    })
}
fn provider_dates(c: &Client, dates: &[String], source: &str) -> (Vec<Value>, Vec<Value>) {
    let mut batches = Vec::new();
    let mut errors = Vec::new();
    for date in dates {
        let url = if source == "ESPN" {
            format!(
                "https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard?dates={date}&limit=1000"
            )
        } else {
            format!("https://www.fotmob.com/api/data/matches?date={date}")
        };
        let result = c
            .get(url)
            .timeout(Duration::from_secs(8))
            .send()
            .and_then(|r| r.error_for_status())
            .and_then(|r| r.json::<Value>())
            .map_err(|e| e.to_string())
            .and_then(|data| {
                if source == "ESPN" {
                    normalize_espn(&data)
                } else {
                    normalize_fotmob(&data)
                }
            });
        match result {
            Ok(events) => batches.push(json!({"source":source,"date":date,"events":events})),
            Err(_) => errors.push(json!({"source":source,"date":date})),
        }
    }
    (batches, errors)
}
pub fn fetch(c: &Client, args: &Value) -> Result<Value, String> {
    let dates = args["dates"].as_array().ok_or("Missing score dates")?;
    if dates.is_empty() || dates.len() > 3 {
        return Err("Invalid score dates".into());
    }
    let dates: Vec<String> = dates
        .iter()
        .map(|d| {
            d.as_str()
                .filter(|d| d.len() == 8 && d.bytes().all(|b| b.is_ascii_digit()))
                .map(str::to_owned)
                .ok_or("Invalid score date")
        })
        .collect::<Result<_, _>>()?;
    if let Some(source) = args["source"].as_str() {
        if source != "ESPN" && source != "FotMob" {
            return Err("Invalid score source".into());
        }
        let (batches, errors) = provider(c, &dates, source);
        if batches.is_empty() {
            return Err(format!("{source} unavailable"));
        }
        return Ok(json!({"batches":batches,"errors":errors}));
    }
    let (mut batches, mut errors) = std::thread::scope(|s| {
        let espn = s.spawn(|| provider(c, &dates, "ESPN"));
        let fotmob = provider(c, &dates, "FotMob");
        let mut espn = espn.join().unwrap_or_default();
        espn.0.extend(fotmob.0);
        espn.1.extend(fotmob.1);
        espn
    });
    if batches.is_empty() {
        return Err("All score sources unavailable".into());
    }
    Ok(json!({"batches":std::mem::take(&mut batches),"errors":std::mem::take(&mut errors)}))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn fotmob_scores_and_states() {
        let mut data = json!({"leagues":[{"matches":[{"id":1,"home":{"name":"Ninh Bình Club","score":4},"away":{"name":"Hoàng Anh Gia Lai","score":3},"status":{"utcTime":"2026-10-18T11:00:00Z","finished":true,"started":true}}]}]});
        let e = normalize_fotmob(&data).unwrap().remove(0);
        assert_eq!(e["source"], "FotMob");
        assert_eq!(e["competitions"][0]["competitors"][0]["score"], 4);
        assert_eq!(e["competitions"][0]["status"]["type"]["state"], "post");
        let status = &mut data["leagues"][0]["matches"][0]["status"];
        status["finished"] = json!(false);
        status["liveTime"] = json!({"short":"72'"});
        assert_eq!(
            normalize_fotmob(&data).unwrap()[0]["competitions"][0]["status"]["displayClock"],
            "72'"
        );
        data["leagues"][0]["matches"][0]["status"]["cancelled"] = json!(true);
        assert_eq!(
            normalize_fotmob(&data).unwrap()[0]["competitions"][0]["status"]["type"]["state"],
            "pre"
        );
        assert!(normalize_fotmob(&json!({"error":"blocked"})).is_err());
        assert!(normalize_espn(&json!({})).is_err());
    }
}
