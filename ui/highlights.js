// Official publisher embeds with a browser fallback to HooFoot.
const highlightsPanel=node('section','','highlights-panel');
highlightsPanel.id='highlights-panel';highlightsPanel.hidden=true;
$('stage').after(highlightsPanel);
const highlightsStyle=document.createElement('style');
highlightsStyle.textContent=`main>section.has-highlights{overflow-y:auto;display:block}.highlights-panel{display:block;overflow:visible;flex-shrink:0;padding:16px;border:1px solid var(--line);border-radius:12px;background:#131d2c;margin-top:12px;min-width:0}.highlights-panel[hidden]{display:none}.highlights-heading,.highlights-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.highlights-heading{justify-content:space-between}.highlights-heading h3{margin:0;font-size:16px}.highlights-panel p{color:var(--muted);line-height:1.5}.highlights-card{border-top:1px solid var(--line);padding:12px 0}.highlights-card strong{display:block;margin-bottom:8px}.highlights-actions button:hover{background:#183c32;border-color:#35cc96}.highlights-frame{display:block;width:100%;aspect-ratio:16/9;border:0;border-radius:8px;background:#000;margin:12px 0}.highlights-card.active{color:#53dfab}@media(max-width:600px){.highlights-panel{padding:12px}.highlights-frame{min-height:190px}}`;
document.head.append(highlightsStyle);
let highlightsKey='',highlightsRequest=0;
let highlightPlaybackRequest=0;
const highlightsCache=new Map();
function highlightFixtureKey(m){return m?[m.id,m.home,m.away,m.kickoff].join('|'):'';}
function hasRecentHighlights(match,now=Date.now()){
 const kickoff=Number(match?.kickoff)*1000;
 if(!match?.finished||match.sport!=='1'||!Number.isFinite(kickoff)||kickoff<=0||kickoff>now)return false;
 const today=new Date(now);today.setHours(0,0,0,0);
 const yesterday=new Date(today);yesterday.setDate(yesterday.getDate()-1);
 return kickoff>=yesterday.getTime();
}
function safeHighlightLink(link){try{const u=new URL(link);return u.protocol==='https:'&&u.hostname==='hoofoot.net'&&!u.username&&!u.password&&!u.port&&!u.search&&!u.hash&&(u.pathname==='/full-matches/'||/^\/full-matches\/[a-z0-9-]+\/[a-z0-9-]+-highlights-[a-z0-9-]+\/$/.test(u.pathname));}catch{return false;}}
async function openHighlightLink(link){
 if(!safeHighlightLink(link))return false;
 try{await rpc('open_highlight',{url:link});return true;}catch(error){const status=highlightsPanel.querySelector('[role="status"]');if(status)status.textContent='Could not open the browser. Please check that a browser is installed and retry.';return false;}
}
function safeOfficialEmbed(link){
 try{const u=new URL(link);return u.origin==='https://www.espn.com'&&u.pathname==='/core/video/iframe'&&/^\d+$/.test(u.searchParams.get('id')||'')&&!u.username&&!u.password&&!u.hash&&[...u.searchParams.keys()].every(k=>['id','endcard'].includes(k));}catch{return false;}
}
async function playOfficialHighlight(item){
 const request=++highlightPlaybackRequest;
 ++playToken;stop();wantPlayback=false;
 highlightsPanel.hidden=false;highlightsPanel.parentElement.classList.toggle('has-highlights',true);
 $('stage').hidden=true;highlightsPanel.replaceChildren();
 const heading=node('div','','highlights-heading');heading.append(node('h3',item.title||'Match highlights'));highlightsPanel.append(heading);
 const status=node('p','Finding official highlights…');status.setAttribute('role','status');highlightsPanel.append(status);
 const actions=node('div','','highlights-actions');
 const fallback=node('button','Open HooFoot fallback');fallback.type='button';fallback.onclick=()=>openHighlightLink(item.url);actions.append(fallback);highlightsPanel.append(actions);
 const names=String(item.title||'').split(/\s+vs\.?\s+/i),home=item.home||names[0],away=item.away||names[1];
 const date=String(item.published||'').slice(0,10).replaceAll('-','');
 let data;
 try{data=await rpc('official_highlight',{home,away,date});}catch{}
 if(request!==highlightPlaybackRequest)return;
 if(!safeOfficialEmbed(data?.video?.embed)){
  status.textContent='No official embed available. Opening HooFoot fallback…';
  const opened=await openHighlightLink(item.url);
  if(request===highlightPlaybackRequest)status.textContent=opened?'Opened HooFoot in your browser.':'Could not open HooFoot. Use the fallback button to retry.';
  return;
 }
 status.textContent='Official ESPN player · Ads and regional restrictions may apply. If the video is unavailable, use HooFoot fallback.';
 const frame=document.createElement('iframe');frame.className='highlights-frame';frame.title=data.video.title||'Official match highlights';
 frame.allow='autoplay; fullscreen; picture-in-picture';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';
 frame.onerror=()=>{if(request===highlightPlaybackRequest)status.textContent='Could not load the official player. Use HooFoot fallback.';};
 frame.src=data.video.embed;highlightsPanel.append(frame);fallback.focus?.();
 if(typeof showMobileView==='function')showMobileView('watch');
}
function renderHighlights(data,message){
 ++highlightPlaybackRequest;highlightsPanel.replaceChildren();
 const heading=node('div','','highlights-heading');heading.append(node('h3','Match highlights'));
 const retry=node('button','Refresh highlights');retry.type='button';retry.onclick=()=>refreshHighlights(true);heading.append(retry);highlightsPanel.append(heading);
 const status=node('p',message||'HooFoot highlights ï¿½ Videos open in your browser.');status.setAttribute('role','status');highlightsPanel.append(status);
 for(const item of data?.videos||[]){
  if(!safeHighlightLink(item.url))continue;
  const card=node('div','','highlights-card');card.append(node('strong',item.title));
  const actions=node('div','','highlights-actions'),watch=node('button','Watch highlights');watch.type='button';
  watch.onclick=()=>playOfficialHighlight(item);
  actions.append(watch);card.append(actions);highlightsPanel.append(card);
 }
 const browse=node('button','Browse HooFoot');browse.type='button';browse.onclick=()=>openHighlightLink('https://hoofoot.net/full-matches/');highlightsPanel.append(browse);
}
async function refreshHighlights(force=false){
 if(window.kayCatalogHighlightActive?.())return;
 const match=selected,key=highlightFixtureKey(match),show=hasRecentHighlights(match);
 highlightsPanel.hidden=!show;highlightsPanel.parentElement.classList.toggle('has-highlights',show);
 if(!show){++highlightPlaybackRequest;if(highlightsKey){highlightsKey='';++highlightsRequest;highlightsPanel.replaceChildren();}return;}
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
