use reqwest::blocking::Client;
use serde_json::{Value, json};
use std::time::Duration;
pub fn fetch(c: &Client, args: &Value) -> Result<Value, String> {
    let id = args["event"]
        .as_str()
        .filter(|s| !s.is_empty() && s.len() < 20 && s.bytes().all(|b| b.is_ascii_digit()))
        .ok_or("Invalid match ID")?;
    if args["source"].as_str() == Some("FotMob") {
        let data: Value = c
            .get(format!(
                "https://www.fotmob.com/api/data/matchDetails?matchId={id}"
            ))
            .timeout(Duration::from_secs(15))
            .send()
            .and_then(|r| r.error_for_status())
            .and_then(|r| r.json())
            .map_err(|e| e.to_string())?;
        return normalize_fotmob(&data, id);
    }
    if args["source"].as_str().is_some_and(|s| s != "ESPN") {
        return Err("Unsupported lineup source".into());
    }
    let data: Value = c
        .get(format!(
            "https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event={id}"
        ))
        .timeout(Duration::from_secs(20))
        .send()
        .and_then(|r| r.error_for_status())
        .and_then(|r| r.json())
        .map_err(|e| e.to_string())?;
    normalize(&data, id)
}
fn normalize(data: &Value, id: &str) -> Result<Value, String> {
    if data["header"]["id"].as_str() != Some(id) {
        return Err("Line-up match identity mismatch".into());
    }
    let teams:Vec<Value>=data["rosters"].as_array().into_iter().flatten().filter(|r|matches!(r["homeAway"].as_str(),Some("home"|"away"))).map(|r|{
 let players:Vec<Value>=r["roster"].as_array().into_iter().flatten().filter(|p|p["starter"].is_boolean()).filter_map(|p|{
 let name=p["athlete"]["displayName"].as_str().or(p["athlete"]["fullName"].as_str())?;
 Some(json!({"name":name,"number":p["jersey"].as_str().unwrap_or(""),"starter":p["starter"]==true,"position":p["position"]["abbreviation"].as_str().unwrap_or(""),"place":p["formationPlace"].as_str().and_then(|s|s.parse::<u32>().ok()).unwrap_or(99)}))
 }).collect();
 json!({"side":r["homeAway"],"name":r["team"]["displayName"],"formation":r["formation"].as_str().unwrap_or(""),"players":players})
 }).collect();
    Ok(
        json!({"event":id,"source":"ESPN","date":data["header"]["competitions"][0]["date"],"teams":teams}),
    )
}
fn normalize_fotmob(data: &Value, id: &str) -> Result<Value, String> {
    if data["general"]["matchId"].as_str() != Some(id) {
        return Err("FotMob line-up match identity mismatch".into());
    }
    let lineup = &data["content"]["lineup"];
    // Predicted or unknown lineups are never presented as confirmed Starting XI.
    let confirmed = lineup["lineupType"] == "standard";
    let teams:Vec<Value>=[("home","homeTeam"),("away","awayTeam")].iter().map(|(side,key)|{
        let t=&lineup[*key];let mut players=Vec::new();
        if confirmed {
            for (group,starter) in [("starters",true),("subs",false)] {
                for (index,p) in t[group].as_array().into_iter().flatten().enumerate(){
                    if let Some(name)=p["name"].as_str(){
                        let number=p["shirtNumber"].as_str().map(str::to_owned).or_else(||p["shirtNumber"].as_u64().map(|n|n.to_string())).unwrap_or_default();
                        let position=match p["usualPlayingPositionId"].as_u64(){Some(0)=>"GK",Some(1)=>"DEF",Some(2)=>"MID",Some(3)=>"FWD",_=>""};
                        players.push(json!({"name":name,"number":number,"position":position,"place":index+1,"starter":starter}));
                    }
                }
            }
        }
        json!({"side":side,"name":data["general"][*key]["name"],"formation":if confirmed {t["formation"].as_str().unwrap_or("")}else{""},"players":players})
    }).collect();
    Ok(
        json!({"event":id,"source":"FotMob","confirmed":confirmed,"date":data["general"]["matchTimeUTCDate"],"teams":teams}),
    )
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn fotmob_confirmed_and_predicted() {
        let mut data = json!({"general":{"matchId":"42","matchTimeUTCDate":"2026-10-19T19:00:00Z","homeTeam":{"name":"Home"},"awayTeam":{"name":"Away"}},"content":{"lineup":{"lineupType":"standard","homeTeam":{"formation":"4-3-3","starters":[{"name":"Starter","shirtNumber":9,"usualPlayingPositionId":3}],"subs":[{"name":"Bench","shirtNumber":"12"}]},"awayTeam":{"starters":[],"subs":[]}}}});
        let result = normalize_fotmob(&data, "42").unwrap();
        assert_eq!(result["source"], "FotMob");
        assert_eq!(result["teams"][0]["players"][0]["number"], "9");
        assert_eq!(result["teams"][0]["players"][1]["starter"], false);
        assert!(normalize_fotmob(&data, "99").is_err());
        data["content"]["lineup"]["lineupType"] = json!("predicted");
        let result = normalize_fotmob(&data, "42").unwrap();
        assert_eq!(result["confirmed"], false);
        assert!(result["teams"][0]["players"].as_array().unwrap().is_empty());
    }
    #[test]
    fn unknown_starters_not_published() {
        let d = json!({"header":{"id":"1"},"rosters":[{"homeAway":"home","roster":[{"athlete":{"displayName":"Unknown"}}]}]});
        assert!(
            normalize(&d, "1").unwrap()["teams"][0]["players"]
                .as_array()
                .unwrap()
                .is_empty()
        );
        assert!(normalize(&d, "2").is_err());
    }
    #[test]
    fn starting_and_bench_players() {
        let d = json!({"header":{"id":"1"},"rosters":[{"homeAway":"home","formation":"4-3-3","team":{"displayName":"Home"},"roster":[{"starter":true,"jersey":"9","athlete":{"displayName":"Starter"}},{"starter":false,"athlete":{"displayName":"Bench"}}]}]});
        let r = normalize(&d, "1").unwrap();
        assert_eq!(r["teams"][0]["formation"], "4-3-3");
        assert_eq!(r["teams"][0]["players"][0]["starter"], true);
        assert_eq!(r["teams"][0]["players"][1]["starter"], false);
    }
}
