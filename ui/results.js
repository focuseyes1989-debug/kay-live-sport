// Display priority for league filters; other competitions follow alphabetically.
function leagueFilterRank(name){
 const key=String(name).toLowerCase().replace(/[^a-z0-9]/g,'');
 const groups=[
  ['uefachampionsleague','championsleague','championleague'],
  ['uefaeuropaleague','europaleague'],
  ['englishpremierleague','englandpremierleague','premierleague'],
  ['spanishlaliga','spainlaliga','laliga','primeradivision','spanishprimeradivision'],
  ['italianseriea','italyseriea','seriea'],
  ['germanbundesliga','germanybundesliga','bundesliga'],
  ['frenchligue1','franceligue1','ligue1'],
  ['uefaconferenceleague','uefaeuropaconferenceleague','europaconferenceleague','conferenceleague']
 ];
 const rank=groups.findIndex(aliases=>aliases.includes(key));
 return rank<0?groups.length:rank;
}
function compareFilterLeagues(a,b){return leagueFilterRank(a)-leagueFilterRank(b)||a.localeCompare(b);}
let matchLeague='',matchLeagueOptionsKey=null;
try{const saved=JSON.parse(localStorage.getItem('live-sport.match-league'));if(typeof saved==='string'&&saved.length<=200)matchLeague=saved;}catch{}
function matchesMatchLeague(match){return !matchLeague||match.league===matchLeague;}
function updateMatchLeagues(){
 const select=$('match-league');
 const leagues=[...new Set(matches.filter(m=>!m.finished&&(filter!=='live'||m.live)).map(m=>m.league).filter(Boolean))].sort(compareFilterLeagues);
 const key=JSON.stringify([leagues,matchLeague]);if(key===matchLeagueOptionsKey)return;matchLeagueOptionsKey=key;
 select.replaceChildren(new Option('All leagues',''));
 for(const league of leagues)select.add(new Option(league,league));
 if(matchLeague&&!leagues.includes(matchLeague))select.add(new Option(matchLeague+' (no matches)',matchLeague));
 select.value=matchLeague;
 if(typeof document!=='undefined')syncLeagueSearch('match-league');
}
function initializeMatchLeague(){
 if(typeof document!=='undefined')initializeLeagueSearch('match-league');
 $('match-league').onchange=()=>{
  matchLeague=$('match-league').value;
  if(typeof document!=='undefined'&&document.createElement)updateSelectedLeagueLogo('match-league');
  try{localStorage.setItem('live-sport.match-league',JSON.stringify(matchLeague));}catch{}
  render();
 };
}
let resultsLeague='';
try{const saved=JSON.parse(localStorage.getItem('live-sport.results-league'));if(typeof saved==='string'&&saved.length<=200)resultsLeague=saved;}catch{}
function matchesResultsLeague(match){return !resultsLeague||match.league===resultsLeague;}
function updateResultsLeagues(){
 const select=$('results-league');
 const leagues=[...new Set(resultMatches.map(m=>m.league).filter(Boolean))].sort(compareFilterLeagues);
 select.replaceChildren(new Option('All leagues',''));
 for(const league of leagues)select.add(new Option(league,league));
 if(resultsLeague&&!leagues.includes(resultsLeague))select.add(new Option(resultsLeague+' (no results)',resultsLeague));
 select.value=resultsLeague;
 if(typeof document!=='undefined')syncLeagueSearch('results-league');
}
function initializeResultsLeague(){
 if(typeof document!=='undefined')initializeLeagueSearch('results-league');
 updateResultsLeagues();
 $('results-league').onchange=()=>{
  resultsLeague=$('results-league').value;
  if(typeof document!=='undefined'&&document.createElement)updateSelectedLeagueLogo('results-league');
  try{localStorage.setItem('live-sport.results-league',JSON.stringify(resultsLeague));}catch{}
  render();
 };
}
let resultMatches=[],resultsToken=0;
function localDay(time=Date.now()){const d=new Date(time);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
let resultsDate=localDay();
try{const saved=localStorage.getItem('live-sport.results-date');if(validResultsDate(saved))resultsDate=saved;}catch{}
function validResultsDate(date){return typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date+'T00:00:00Z'))&&new Date(date+'T00:00:00Z').toISOString().slice(0,10)===date;}
function resultsQueryDates(date){const start=new Date(date+'T00:00:00'),end=new Date(start);end.setDate(end.getDate()+1);const dates=[];let day=Date.UTC(start.getUTCFullYear(),start.getUTCMonth(),start.getUTCDate());while(day<end.getTime()){dates.push(new Date(day).toISOString().slice(0,10).replaceAll('-',''));day+=86400000;}return dates;}
function historyMatches(response,date){
 const events=response.batches.flatMap(b=>b.events.map(e=>({...e,source:b.source,checkedAt:Date.now()}))).sort((a,b)=>(a.source==='ESPN'?0:1)-(b.source==='ESPN'?0:1));
 const rows=[];
 for(const e of events){
  const kickoff=Date.parse(e.date);if(!Number.isFinite(kickoff)||localDay(kickoff)!==date)continue;
  const c=e.competitions?.[0],status=c?.status||e.status;if(!status?.type?.completed)continue;
  const home=c?.competitors?.find(t=>t.homeAway==='home')?.team,away=c?.competitors?.find(t=>t.homeAway==='away')?.team;
  if(!home?.displayName||!away?.displayName)continue;
  const m={id:'result-'+e.source+'-'+e.id,home:home.displayName,away:away.displayName,homeLogo:home.logo||'',awayLogo:away.logo||'',league:e.league||'Football',sport:'1',kickoff:kickoff/1000,channels:[],post:'',scoreId:'',finished:true};
  if(rows.some(r=>findScoreEvent(r,[e])))continue;
  if(applyScoreEvent(m,e)&&m.finished)rows.push(m);
 }
 return rows;
}
async function refreshResults(){
 const token=++resultsToken,date=resultsDate;
 resultMatches=[];$('results-status').textContent='Loading results…';render();
 try{
  const response=await rpc('scores',{dates:resultsQueryDates(date)});
  if(token!==resultsToken)return {ok:false};
  resultMatches=historyMatches(response,date);updateResultsLeagues();
  $('results-status').textContent=response.errors?.length?'Some sources unavailable · results may be incomplete':resultMatches.length+' results · PC local date';
  if(selected?.id?.startsWith('result-')){selected=resultMatches.find(m=>m.id===selected.id)||selected;updateSelected();}
  render();return {ok:true,partial:!!response.errors?.length};
 }catch(e){if(token===resultsToken){$('results-status').textContent='Could not load results. Press Refresh to retry.';render();}return {ok:false};}
}
function initializeResults(){
 initializeResultsLeague();
 const input=$('results-date');input.value=resultsDate;input.max=localDay();
 input.onchange=()=>{
  if(!validResultsDate(input.value)||input.value>localDay()){input.value=resultsDate;return;}
  resultsDate=input.value;try{localStorage.setItem('live-sport.results-date',resultsDate);}catch{}
  refreshResults();
 };
 $('results-today').onclick=()=>{input.value=localDay();input.onchange();};
 $('results-yesterday').onclick=()=>{const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);input.value=localDay(yesterday.getTime());input.onchange();};
 $('results-controls').hidden=filter!=='results';
 if(filter==='results')refreshResults();
}

function leagueSearchKey(text){return String(text).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().trim();}
function leagueSearchChoice(options,text){
 const key=leagueSearchKey(text);
 if(!key||key==='all leagues')return '';
 const found=Array.from(options).filter(o=>o.value&&leagueSearchKey(o.value)===key);
 return found.length===1?found[0].value:null;
}
function syncLeagueSearch(id){
 const select=$(id),input=$(id+'-search'),list=$(id+'-choices');
 list.replaceChildren(...Array.from(select.options).map(o=>{const option=new Option(o.text,o.value||'All leagues');return option;}));
 if(document.activeElement!==input)input.value=select.value;
 if(document.createElement)updateSelectedLeagueLogo(id);
}
function initializeLeagueSearch(id){
 const select=$(id),input=$(id+'-search');
 $(id+'-clear').onclick=()=>{
  input.value='';select.value='';select.onchange();syncLeagueSearch(id);input.focus();
 };
 input.onfocus=()=>input.select();
 const commit=()=>{
  const value=leagueSearchChoice(select.options,input.value);
  if(value===null)return false;
  if(select.value!==value){select.value=value;select.onchange();}
  input.value=value;return true;
 };
 input.oninput=commit;
 input.onchange=()=>{if(!commit())input.value=select.value;};
 input.onblur=()=>{input.value=select.value;};
 input.onkeydown=event=>{if(event.key==='Escape'){input.value=select.value;input.blur();}else if(event.key==='Enter')commit();};
 syncLeagueSearch(id);
 setupCustomLeagueSearch(id);
}

const leagueLogoCatalog={"eng.1":{"url":"https://a.espncdn.com/i/leaguelogos/soccer/500/23.png","name":"English Premier League"},"uefa.champions":{"url":"https://a.espncdn.com/i/leaguelogos/soccer/500/2.png","name":"UEFA Champions League"},"esp.1":{"url":"https://a.espncdn.com/i/leaguelogos/soccer/500/15.png","name":"Spanish LALIGA"},"uefa.europa":{"url":"https://a.espncdn.com/i/leaguelogos/soccer/500/2310.png","name":"UEFA Europa League"},"fra.1":{"url":"https://a.espncdn.com/i/leaguelogos/soccer/500/9.png","name":"French Ligue 1"},"ita.1":{"url":"https://a.espncdn.com/i/leaguelogos/soccer/500/12.png","name":"Italian Serie A"},"ger.1":{"url":"https://a.espncdn.com/i/leaguelogos/soccer/500/10.png","name":"German Bundesliga"},"ned.1":{"url":"https://a.espncdn.com/i/leaguelogos/soccer/500/11.png","name":"Dutch Eredivisie"},"por.1":{"url":"https://a.espncdn.com/i/leaguelogos/soccer/500/14.png","name":"Portuguese Primeira Liga"}};

function leagueLogoUrl(name){
 const key=leagueSearchKey(name);
 const aliases={'premier league':'eng.1','english premier league':'eng.1','spanish la liga':'esp.1','la liga':'esp.1','laliga':'esp.1','spanish laliga':'esp.1','serie a':'ita.1','italian serie a':'ita.1','bundesliga':'ger.1','german bundesliga':'ger.1','ligue 1':'fra.1','french ligue 1':'fra.1','eredivisie':'ned.1','netherlands eredivisie':'ned.1','dutch eredivisie':'ned.1','primeira liga':'por.1','portuguese primeira liga':'por.1','uefa champions league':'uefa.champions','uefa europa league':'uefa.europa'};
 return leagueLogoCatalog[aliases[key]]?.url||'';
}
function leagueLogo(name){
 const fallback=node('span','⚽','league-logo-fallback'),url=leagueLogoUrl(name);
 if(!url)return fallback;
 const img=document.createElement('img');img.src=url;img.alt='';img.className='league-logo';img.loading='lazy';img.referrerPolicy='no-referrer';img.onerror=()=>img.replaceWith(fallback);return img;
}
function setupCustomLeagueSearch(id){
 if(!document.createElement)return;
 const input=$(id+'-search'),select=$(id),popup=node('div','','league-popup');popup.hidden=true;popup.id=id+'-popup';popup.setAttribute('role','listbox');document.body.append(popup);input.removeAttribute('list');input.setAttribute('aria-controls',popup.id);input.setAttribute('aria-expanded','false');
 const close=()=>{popup.hidden=true;input.setAttribute('aria-expanded','false');};
 const show=()=>{
  const query=leagueSearchKey(input.value),options=Array.from(select.options).filter(o=>!o.value||leagueSearchKey(o.value).includes(query));popup.replaceChildren();
  for(const option of options){const button=node('button','','league-option');button.type='button';button.setAttribute('role','option');button.setAttribute('aria-selected',String(option.value===select.value));const label=node('span',option.text,'league-option-name');button.append(leagueLogo(option.value),label);if(option.value===select.value){const check=node('span','✓','league-option-check');check.setAttribute('aria-hidden','true');button.append(check);}button.onmousedown=e=>e.preventDefault();button.onclick=()=>{input.value=option.value;select.value=option.value;select.onchange();close();};popup.append(button);}
  if(!options.length)popup.append(node('p','No leagues found.','league-empty'));
  const r=input.getBoundingClientRect();popup.style.left=r.left+'px';popup.style.top=r.bottom+4+'px';popup.style.width=r.width+'px';popup.style.maxHeight=Math.max(90,Math.min(270,window.innerHeight-r.bottom-20))+'px';popup.hidden=false;input.setAttribute('aria-expanded','true');
 };
 const oldInput=input.oninput,oldBlur=input.onblur,oldKey=input.onkeydown;
 input.onfocus=()=>{input.select();show();};input.oninput=()=>{oldInput();show();};input.onblur=()=>{oldBlur();close();};
 input.onkeydown=e=>{if(e.key==='ArrowDown'){e.preventDefault();show();popup.querySelector('button')?.focus();}else if(e.key==='Enter'){e.preventDefault();if(!popup.hidden)popup.querySelector('button')?.click();else oldKey(e);}else if(e.key==='Escape'){close();oldKey(e);}};
 popup.onkeydown=e=>{const items=Array.from(popup.querySelectorAll('button')),i=items.indexOf(document.activeElement);if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();items[(i+(e.key==='ArrowDown'?1:items.length-1))%items.length]?.focus();}if(e.key==='Escape'){close();input.focus();close();}};
 input.onblur=e=>{oldBlur();if(!popup.contains(e.relatedTarget))close();};popup.onfocusout=e=>{if(!popup.contains(e.relatedTarget)&&e.relatedTarget!==input)close();};
 document.addEventListener('pointerdown',e=>{if(e.target!==input&&!popup.contains(e.target))close();});window.addEventListener('resize',close);document.addEventListener('scroll',e=>{if(e.target!==popup)close();},true);
}

function updateSelectedLeagueLogo(id){
 const input=$(id+'-search'),holder=$(id+'-selected-logo'),name=$(id).value;
 holder.replaceChildren();holder.hidden=!name;
 input.parentElement.classList.toggle('has-selected-logo',!!name);
 if(name)holder.append(leagueLogo(name));
}
