// Shared Results view: keep YouTube's player intact and provide its source link.
const highlightsPanel=node('section','','highlights-panel');
highlightsPanel.id='highlights-panel';highlightsPanel.hidden=true;
$('stage').after(highlightsPanel);
const highlightsStyle=document.createElement('style');
highlightsStyle.textContent=`main>section.has-highlights{overflow-y:auto;display:block}.highlights-panel{display:block;overflow:visible;flex-shrink:0;padding:16px;border:1px solid var(--line);border-radius:12px;background:#131d2c;margin-top:12px;min-width:0}.highlights-panel[hidden]{display:none}.highlights-heading,.highlights-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.highlights-heading{justify-content:space-between}.highlights-heading h3{margin:0;font-size:16px}.highlights-panel p{color:var(--muted);line-height:1.5}.highlights-card{border-top:1px solid var(--line);padding:12px 0}.highlights-card strong{display:block;margin-bottom:8px}.highlights-actions button:hover{background:#183c32;border-color:#35cc96}.highlights-frame{display:block;width:100%;aspect-ratio:16/9;border:0;border-radius:8px;background:#000;margin:12px 0}.highlights-card.active{color:#53dfab}@media(max-width:600px){.highlights-panel{padding:12px}.highlights-frame{min-height:190px}}`;
document.head.append(highlightsStyle);
let highlightsKey='',highlightsRequest=0;
const highlightsCache=new Map();
function highlightFixtureKey(m){return m?[m.id,m.home,m.away,m.kickoff].join('|'):'';}
function hasRecentHighlights(match,now=Date.now()){
 const kickoff=Number(match?.kickoff)*1000;
 if(!match?.finished||match.sport!=='1'||!Number.isFinite(kickoff)||kickoff<=0||kickoff>now)return false;
 const today=new Date(now);today.setHours(0,0,0,0);
 const yesterday=new Date(today);yesterday.setDate(yesterday.getDate()-1);
 return kickoff>=yesterday.getTime();
}
function safeHighlightLink(link){try{const u=new URL(link);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&['www.youtube.com','matchhighlights.live'].includes(u.hostname);}catch{return false;}}
async function openHighlightLink(link){
 if(!safeHighlightLink(link))return;
 try{await rpc('open_highlight',{url:link});}catch{const status=highlightsPanel.querySelector('[role="status"]');if(status)status.textContent='Could not open the video. Please try again.';}
}
function renderHighlights(data,message){
 highlightsPanel.replaceChildren();
 const heading=node('div','','highlights-heading');heading.append(node('h3','Match highlights'));
 const retry=node('button','Refresh highlights');retry.type='button';retry.onclick=()=>refreshHighlights(true);heading.append(retry);highlightsPanel.append(heading);
 const status=node('p',message||'Highlights curated by MatchHighlights from rights-holder uploads.');status.setAttribute('role','status');highlightsPanel.append(status);
 const player=node('div','','highlights-player');highlightsPanel.append(player);
 for(const item of data?.videos||[]){
  if(!/^[A-Za-z0-9_-]{11}$/.test(item.videoId)||!safeHighlightLink(item.url))continue;
  const card=node('div','','highlights-card');card.append(node('strong',item.title));
  const actions=node('div','','highlights-actions'),watch=node('button','▶ Watch highlights'),external=node('button','Open in YouTube');
  watch.type=external.type='button';
  watch.onclick=()=>{
   player.replaceChildren();highlightsPanel.querySelectorAll('.highlights-card').forEach(c=>c.classList.remove('active'));card.classList.add('active');
   const frame=document.createElement('iframe');frame.className='highlights-frame';frame.title=item.title;
   const url=new URL('https://www.youtube-nocookie.com/embed/'+item.videoId);url.searchParams.set('autoplay','1');url.searchParams.set('rel','0');
   frame.src=url.href;frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';player.append(frame);
  };
  external.onclick=()=>openHighlightLink(item.url);actions.append(watch,external);card.append(actions);highlightsPanel.append(card);
 }
 if(data?.videos?.length)highlightsPanel.append(node('p','If playback is unavailable or restricted in your region, use Open in YouTube.'));
 const browse=node('button','Browse MatchHighlights');browse.type='button';
 const url=new URL('https://matchhighlights.live/');if(selected?.home)url.searchParams.set('q',selected.home);
 browse.onclick=()=>openHighlightLink(url.href);highlightsPanel.append(browse);
}
async function refreshHighlights(force=false){
 if(window.kayCatalogHighlightActive?.())return;
 const match=selected,key=highlightFixtureKey(match),show=hasRecentHighlights(match);
 highlightsPanel.hidden=!show;highlightsPanel.parentElement.classList.toggle('has-highlights',show);
 if(!show){if(highlightsKey){highlightsKey='';++highlightsRequest;highlightsPanel.replaceChildren();}return;}
 if(!force&&key===highlightsKey)return;
 highlightsKey=key;const request=++highlightsRequest;
 const cached=highlightsCache.get(key);
 if(!force&&cached&&Date.now()-cached.time<300000){renderHighlights(cached.data,cached.message);return;}
 renderHighlights(null,'Finding highlights for this match…');
 try{
  const data=await rpc('highlights',{home:match.home,away:match.away,kickoff:Math.floor(Number(match.kickoff))});
  const message=data.videos?.length?null:'Highlights have not been found for this fixture yet. Try Refresh highlights later, or browse the source.';
  highlightsCache.set(key,{data,message,time:Date.now()});
  if(request===highlightsRequest&&highlightFixtureKey(selected)===key){if(hasRecentHighlights(selected))renderHighlights(data,message);else refreshHighlights();}
 }catch{
  if(request===highlightsRequest&&highlightFixtureKey(selected)===key){if(hasRecentHighlights(selected))renderHighlights(null,'Could not load highlights. Check your connection and try Refresh highlights.');else refreshHighlights();}
 }
}
const updateBeforeHighlights=updateSelected;
updateSelected=function(){updateBeforeHighlights();refreshHighlights();};
// Recheck the device's calendar after midnight, sleep or a time-zone change.
setInterval(()=>refreshHighlights(),30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshHighlights();});
