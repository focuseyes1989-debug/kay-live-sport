const lineupPanel=document.createElement('div');lineupPanel.id='lineup-panel';lineupPanel.hidden=true;$('stage').append(lineupPanel);

let lineupRequest=0,lastLineupKey=null,lastLineupData,lastLineupMessage;

const lineupCache=new Map();

function lineupFixtureKey(m){return m?[m.id,m.home,m.away,m.kickoff].join('|'):'';}

function lineupTeamsMatch(m,data){return ['home','away'].every(side=>{const team=data.teams?.find(t=>t.side===side);return team&&scoreTeamKey(team.name)===scoreTeamKey(m[side]);})&&Number.isFinite(Date.parse(data.date))&&Math.abs(Date.parse(data.date)/1000-Number(m.kickoff))<=900;}

function renderLineup(data,message){

 const key=lineupFixtureKey(selected);if(lastLineupKey===key&&lastLineupData===data&&lastLineupMessage===message)return;lastLineupKey=key;lastLineupData=data;lastLineupMessage=message;

 lineupPanel.replaceChildren();const heading=node('div','','lineup-heading');heading.append(node('strong','Match line-ups'),node('span',data?.source||'ESPN / FotMob','lineup-source'));lineupPanel.append(heading);

 if(message){lineupPanel.append(node('p',message,'meta'));}

 else {

  const grid=node('div','','lineup-teams');

  for(const side of ['home','away']){

   const team=data.teams.find(t=>t.side===side),box=node('section','','lineup-team');box.append(node('h3',displayName(team.name)),node('div',team.formation?'Formation '+team.formation:'Formation not announced','lineup-formation'));

   const starters=team.players.filter(p=>p.starter).sort((a,b)=>a.place-b.place),bench=team.players.filter(p=>!p.starter);

   for(const [label,players] of [['Starting XI',starters],['Substitutes',bench]]){

    box.append(node('h4',label));if(!players.length)box.append(node('p','Not announced yet','meta'));

    for(const p of players){const row=node('div','','lineup-player');row.append(node('span',p.number||'\u2013','lineup-number'),node('span',p.name),node('small',p.position||''));box.append(row);}

   }

   grid.append(box);

  }

  lineupPanel.append(grid);

 }

 const foot=node('div','','lineup-foot');foot.append(node('small','Waiting for kickoff \u00b7 Line-ups refresh every minute'));

 const retry=node('button','Refresh line-ups');retry.type='button';retry.onclick=()=>refreshLineup(true);foot.append(retry);lineupPanel.append(foot);

}

async function refreshLineup(force=false){

 const match=selected,key=lineupFixtureKey(match),show=!!match&&!match.live&&!match.finished&&match.sport==='1'&&!(typeof isManualStreamMatch==='function'&&isManualStreamMatch(match));

 lineupPanel.hidden=!show;$('stage').classList.toggle('has-lineup',show);if(!show){++lineupRequest;return;}

 const candidates=['ESPN','FotMob'].map(source=>{
  const events=(scoreCache?.batches||[]).filter(b=>b.source===source).flatMap(b=>b.events);
  const event=findScoreEvent(match,[...new Map(events.map(e=>[String(e.id),e])).values()]);return event?{source,event}:null;
 }).filter(Boolean);
 if(!candidates.length){renderLineup(null,'Line-ups are not available for this fixture yet.');return;}
 if(lastLineupKey!==key)renderLineup(null,'Loading line-ups...');
 const cacheKey=key+'|'+candidates.map(c=>c.source+':'+c.event.id).join('|'),cached=lineupCache.get(cacheKey);
 if(!force&&cached&&Date.now()-cached.time<60000){if(!cached.pending)renderLineup(cached.data,cached.message);return;}
 if(cached?.pending)return;
 const request=++lineupRequest;lineupCache.set(cacheKey,{time:Date.now(),pending:true});renderLineup(null,'Loading line-ups...');
 let data=null,partial=null,received=false;
 for(const candidate of candidates){
  if(request!==lineupRequest||lineupFixtureKey(selected)!==key||selected.live||selected.finished)break;
  try{
   const result=await rpc('lineups',{event:String(candidate.event.id),source:candidate.source});
   if(!lineupTeamsMatch(match,result))continue;
   received=true;
   if(result.teams.every(t=>t.players.some(p=>p.starter))){data=result;break;}
   if(result.teams.some(t=>t.players.some(p=>p.starter))&&!partial)partial=result;
   if(!data)data=result;
  }catch{/* Try the next independently matched source. */}
 }
 data=partial&&!data?.teams.some(t=>t.players.some(p=>p.starter))?partial:data;
 const announced=data?.teams.some(t=>t.players.some(p=>p.starter));
 const message=announced?null:received?'Confirmed line-ups have not been announced yet.':'Could not load line-ups. Tap Refresh line-ups to try again.';
 lineupCache.set(cacheKey,{data,message,time:Date.now()});
 if(request===lineupRequest&&lineupFixtureKey(selected)===key&&!selected.live&&!selected.finished)renderLineup(data,message);
}
const updateSelectedBeforeLineup=updateSelected;

updateSelected=function(){updateSelectedBeforeLineup();refreshLineup();};

setInterval(()=>{if(!document.hidden)refreshLineup();},60000);

