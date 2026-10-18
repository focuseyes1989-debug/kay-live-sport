// Match both ordered teams and kickoff; never guess from a single team or score.
function scoreTeamKey(name){
 const aliases={'ninh binh club':'ninh binh','ha noi':'hanoi','brighton hove albion':'brighton and hove albion','angers sco':'angers','ca osasuna':'osasuna','cambuur leeuwarden':'cambuur','man utd':'manchester united','man united':'manchester united','inter milan':'internazionale','inter':'internazionale','bayern munich':'bayern munchen','psg':'paris saint germain','atletico madrid':'atletico de madrid'};
 const key=String(name).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/đ/g,'d').replace(/&/g,'and').replace(/[^a-z0-9 ]/g,' ').replace(/\b(fc|afc|cf|sc)\b/g,' ').replace(/\s+/g,' ').trim();
 return aliases[key]||key;
}
function findScoreEvent(match,events){
 if(match.sport!=='1'||!Number(match.kickoff))return null;
 const hits=events.filter(e=>{
  const kickoff=Date.parse(e.date)/1000;if(!Number.isFinite(kickoff)||Math.abs(kickoff-Number(match.kickoff))>900)return false;
  const teams=e.competitions?.[0]?.competitors||[];
  return ['home','away'].every(side=>{const t=teams.find(t=>t.homeAway===side)?.team;if(!t)return false;return ['displayName','name','shortDisplayName'].some(k=>t[k]&&scoreTeamKey(t[k])===scoreTeamKey(match[side]));});
 });
 return hits.length===1?hits[0]:null;
}
function applyScoreEvent(match,event){
 const c=event.competitions?.[0],s=c?.status||event.status;
 if(!c||!s?.type)return false;
 const home=c.competitors.find(t=>t.homeAway==='home'),away=c.competitors.find(t=>t.homeAway==='away');
 if(!/^\d+$/.test(String(home?.score))||!/^\d+$/.test(String(away?.score)))return false;
 match.homeScore=String(home.score);match.awayScore=String(away.score);
 match.status=s.type.description||'';match.minute=s.type.state==='in'?s.displayClock||'':'';
 match.live=s.type.state==='in';match.finished=!!s.type.completed||s.type.state==='post';match.scoreSource=event.source||'ESPN';match.scoreChecked=event.checkedAt||Date.now();return true;
}



function mergeScoreBatches(previous,response,now=Date.now()){
 const merged=new Map((previous?.batches||[]).map(b=>[b.source+'|'+b.date,b]));
 for(const batch of response.batches){merged.set(batch.source+'|'+batch.date,{...batch,events:batch.events.map(e=>({...e,source:batch.source,checkedAt:now}))});}
 // Keep only a short outage history; do not display old scores as current indefinitely.
 return {batches:[...merged.values()].filter(b=>b.events.length===0||now-b.events[0].checkedAt<300000)};
}
function bestScoreEvent(match,cache,now=Date.now()){
 for(const fresh of [true,false])for(const source of ['ESPN','FotMob']){
  const events=(cache?.batches||[]).filter(b=>b.source===source).flatMap(b=>b.events);
  const unique=[...new Map(events.filter(e=>{const teams=e.competitions?.[0]?.competitors||[];return ['home','away'].every(side=>/^\d+$/.test(String(teams.find(t=>t.homeAway===side)?.score)));}).map(e=>[String(e.id),e])).values()];
  const event=findScoreEvent(match,unique);
  if(event && (now-event.checkedAt<=45000)===fresh)return event;
 }
 return null;
}

