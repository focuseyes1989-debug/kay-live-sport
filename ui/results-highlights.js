// The homepage catalog is independent of score-provider fixture coverage.
let catalogRenderKey='';
let resultsContent='scores',catalogVideos=[],catalogLoaded=0,catalogBusy=false,catalogError='',catalogPartial=false,catalogDay='both',catalogSelection=null;
const resultsContentTabs=node('div','','results-content-tabs');resultsContentTabs.id='results-content-tabs';resultsContentTabs.setAttribute('role','group');resultsContentTabs.setAttribute('aria-label','Results content');
for(const [value,label] of [['scores','Scores'],['highlights','Highlights']]){
 const button=node('button',label);button.type='button';button.dataset.resultsContent=value;button.onclick=()=>{resultsContent=value;render();if(value==='highlights')refreshHighlightsCatalog();};resultsContentTabs.append(button);
}
document.querySelector('.filters').after(resultsContentTabs);
const catalogControls=node('div','','catalog-controls');catalogControls.id='catalog-controls';catalogControls.hidden=true;
const days=node('div','','catalog-days');days.setAttribute('role','group');days.setAttribute('aria-label','Highlight publication date');
for(const [value,label] of [['both','Today + Yesterday'],['today','Today'],['yesterday','Yesterday']]){
 const button=node('button',label);button.type='button';button.dataset.catalogDay=value;button.onclick=()=>{catalogDay=value;render();};days.append(button);
}
const catalogRefresh=node('button','Refresh highlights');catalogRefresh.type='button';catalogRefresh.onclick=()=>refreshHighlightsCatalog(true);
const catalogStatus=node('p');catalogStatus.id='catalog-status';catalogStatus.setAttribute('role','status');catalogControls.append(days,catalogRefresh,catalogStatus);resultsContentTabs.after(catalogControls);
const catalogStyle=document.createElement('style');catalogStyle.textContent=`.results-content-tabs,.catalog-days{display:flex;gap:4px;margin:8px 0}.results-content-tabs[hidden],.catalog-controls[hidden]{display:none}.results-content-tabs button{flex:1}.results-content-tabs button[aria-pressed=true],.catalog-days button[aria-pressed=true]{background:#1c4436;border-color:#3edba1;color:#91f3c7}.catalog-days button{flex:1;font-size:10px;padding:6px 3px}.catalog-controls{padding-bottom:6px}.catalog-controls>button{width:100%}#catalog-status{font-size:11px;color:var(--muted);line-height:1.5}.catalog-section-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:14px 0 9px;padding-bottom:8px;border-bottom:1px solid #2c443e;color:#8af0c5;font-size:12px;line-height:1.4}.catalog-section-heading small{color:var(--muted);font-weight:400}.catalog-section-heading:first-child{margin-top:5px}.catalog-card{display:block;width:100%;text-align:left;padding:0;overflow:hidden;margin-bottom:9px;border-radius:10px;background:#141e2d}.catalog-thumb{position:relative;display:block;aspect-ratio:16/9;background:#080d14}.catalog-thumb>span{position:absolute;inset:0;display:grid;place-items:center;font-size:26px;color:#53dfab}.catalog-card img{position:relative;display:block;width:100%;height:100%;object-fit:cover}.catalog-card img[hidden]{display:none}.catalog-card strong{display:block;font-size:12px;line-height:1.45;padding:9px 10px 4px}.catalog-card small{display:block;color:var(--muted);padding:0 10px 10px}.catalog-card.active{border-color:#41dfa4;background:#15352b}.catalog-card:hover{border-color:#41dfa4;background:#18392e}`;document.head.append(catalogStyle);
function catalogPublicationDay(item,now=Date.now()){
 const published=Date.parse(item?.published);if(!Number.isFinite(published)||published>now)return '';
 const today=new Date(now);today.setHours(0,0,0,0);const yesterday=new Date(today);yesterday.setDate(yesterday.getDate()-1);
 return published>=today.getTime()?'today':published>=yesterday.getTime()?'yesterday':'';
}
function usableCatalogVideo(item){return /^[A-Za-z0-9_-]{11}$/.test(item?.videoId)&&safeHighlightLink(item.url)&&typeof item.title==='string'&&!!catalogPublicationDay(item);}
function catalogRows(){
 const query=$('search').value.trim().toLocaleLowerCase();const seen=new Set();
 return catalogVideos.filter(item=>{if(!usableCatalogVideo(item)||seen.has(item.videoId))return false;seen.add(item.videoId);return (catalogDay==='both'||catalogPublicationDay(item)===catalogDay)&&(!query||(item.title+' '+(item.league||'')).toLocaleLowerCase().includes(query));}).sort((a,b)=>Date.parse(b.published)-Date.parse(a.published));
}
const catalogSectionNames=[['premier_league','Premier League Highlights'],['champions_league','Champions League Highlights'],['europa_league','Europa League Highlights'],['la_liga','La Liga Highlights'],['serie_a','Serie A Highlights'],['bundesliga','Bundesliga Highlights'],['ligue_1','Ligue 1 Highlights'],['world_cup','World Cup Highlights']];
function catalogLeagueSection(item){
 const explicit=(item.sections||[]).find(section=>catalogSectionNames.some(([id])=>id===section));if(explicit)return explicit;
 const league=String(item.league||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const known=catalogSectionNames.find(([id])=>league.includes(id.replaceAll('_','')));return known?known[0]:league||'other';
}
function catalogGroups(rows){
 const groups=[],trending=rows.filter(v=>v.sections?.includes('trending')).sort((a,b)=>(Number(b.views)||0)-(Number(a.views)||0));
 if(trending.length)groups.push({id:'trending',title:'Trending Now',items:trending});
 const byLeague=new Map();for(const item of rows){const id=catalogLeagueSection(item);if(!byLeague.has(id))byLeague.set(id,[]);byLeague.get(id).push(item);}
 for(const [id,title] of catalogSectionNames){if(byLeague.has(id)){groups.push({id,title,items:byLeague.get(id)});byLeague.delete(id);}}
 for(const [id,items] of byLeague){groups.push({id,title:id==='other'?'Other Highlights':String(items[0].league)+' Highlights',items});}
 return groups;
}
function clearCatalogSelection(){
 if(!catalogSelection)return;catalogSelection=null;++highlightsRequest;highlightsKey='';highlightsPanel.replaceChildren();highlightsPanel.hidden=true;highlightsPanel.parentElement.classList.remove('has-highlights');
 $('title').textContent='Every moment. Every match.';$('subtitle').textContent='Pick your match. Follow the score. Watch it live.';
 $('stage').hidden=false;setEmptyPlaybackState('Choose a match or highlight','Select a video from Results → Highlights, or choose a match.');
}
window.kayCatalogHighlightActive=()=>{
 if(catalogSelection&&!usableCatalogVideo(catalogSelection)){clearCatalogSelection();render();}
 return !!catalogSelection;
};
function chooseCatalogVideo(item){
 if(!usableCatalogVideo(item))return;
 ++playToken;stop();waitingFixture=null;waitingManualLive=false;wantPlayback=false;channel=null;selected=null;startupPlaybackChecked=true;
 ++highlightsRequest;highlightsKey='';catalogSelection=item;refreshLineup();
 $('title').textContent=item.title;$('subtitle').textContent=[item.league,'MatchHighlights · YouTube'].filter(Boolean).join(' · ');
 $('scoreboard').hidden=true;$('channel-label').hidden=true;$('channels').replaceChildren();$('retry').hidden=true;$('stage').hidden=true;$('message').textContent='';
 highlightsPanel.hidden=false;highlightsPanel.parentElement.classList.add('has-highlights');renderHighlights({videos:[item]},null);
 highlightsPanel.querySelector('.highlights-actions button').click();
 if(typeof showMobileView==='function')showMobileView('watch');
 render();
}
const chooseBeforeCatalog=choose;
choose=function(...args){clearCatalogSelection();return chooseBeforeCatalog(...args);};
async function refreshHighlightsCatalog(force=false,notify=false){
 if(catalogBusy)return;
 if(!force&&catalogLoaded&&Date.now()-catalogLoaded<300000){render();return;}
 catalogBusy=true;catalogError='';if(notify){$('refresh').disabled=true;$('refresh').setAttribute('aria-busy','true');}render();
 try{
  const data=await rpc('highlights_catalog');if(!Array.isArray(data.videos))throw Error('Invalid catalog');
  catalogVideos=data.videos;catalogPartial=!!data.partial;catalogLoaded=Date.now();
  if(notify)showRefreshNotification(catalogPartial?'warning':'success',catalogPartial?'Highlights updated. Some videos could not be loaded.':'Highlights updated successfully.');
 }catch{catalogError='Could not load highlights. Please try Refresh highlights.';if(notify)showRefreshNotification('error',catalogError);}
 finally{catalogBusy=false;if(notify){$('refresh').disabled=false;$('refresh').setAttribute('aria-busy','false');}render();}
}
function renderCatalog(){
 const rows=catalogRows();$('count').textContent=rows.length+' highlights';
 catalogRefresh.disabled=catalogBusy;
 for(const button of days.children)button.setAttribute('aria-pressed',String(button.dataset.catalogDay===catalogDay));
 catalogStatus.textContent=catalogBusy?'Loading homepage highlights…':catalogError||(catalogPartial?'Some videos could not be loaded. Refresh to try again.':rows.length+' highlights · Published today / yesterday · Device local time');
 const key=JSON.stringify([rows.map(v=>[v.videoId,v.title,v.league,v.sections,v.views,catalogPublicationDay(v)]),catalogSelection?.videoId,catalogBusy,catalogError,catalogPartial,catalogDay,$('search').value]);if(key===catalogRenderKey)return;catalogRenderKey=key;$('list').replaceChildren();
 for(const group of catalogGroups(rows)){
  const container=node('div','','catalog-section');container.dataset.catalogSection=group.id;container.setAttribute('role','group');container.setAttribute('aria-label',group.title);
  const heading=node('h3','','catalog-section-heading');heading.append(node('span',group.title),node('small',String(group.items.length)));container.append(heading);
  for(const item of group.items){
  const card=node('button','','catalog-card'+(catalogSelection?.videoId===item.videoId?' active':''));card.dataset.videoId=item.videoId;card.type='button';card.setAttribute('aria-label','Watch highlights: '+item.title);
  const img=document.createElement('img');img.src='https://i.ytimg.com/vi/'+item.videoId+'/hqdefault.jpg';img.alt='';img.loading='lazy';img.onerror=()=>{img.hidden=true;};
  const thumb=node('span','','catalog-thumb');thumb.append(node('span','▶'),img);
  card.append(thumb,node('strong',item.title),node('small',[item.league,catalogPublicationDay(item)==='today'?'Today':'Yesterday','YouTube'].filter(Boolean).join(' · ')));card.onclick=()=>chooseCatalogVideo(item);container.append(card);
  }
  $('list').append(container);
 }
 if(!rows.length)$('list').append(node('p',catalogBusy?'Finding recent highlights…':catalogError||($('search').value?'No recent highlights match this search.':'No highlights published today or yesterday on the source homepage yet.'),'meta'));
}
const renderBeforeCatalog=render;
render=function(){
 const inResults=filter==='results',catalog=inResults&&resultsContent==='highlights';
 if(!catalog){catalogRenderKey='';renderBeforeCatalog();}
 resultsContentTabs.hidden=!inResults;catalogControls.hidden=!catalog;$('results-controls').hidden=!inResults||catalog;
 for(const button of resultsContentTabs.children)button.setAttribute('aria-pressed',String(button.dataset.resultsContent===resultsContent));
 if(catalog)renderCatalog();
 if(!inResults&&catalogSelection)clearCatalogSelection();
};
const headerRefreshBeforeCatalog=$('refresh').onclick;
$('refresh').onclick=()=>filter==='results'&&resultsContent==='highlights'?refreshHighlightsCatalog(true,true):headerRefreshBeforeCatalog();
setInterval(()=>{if(filter==='results'&&resultsContent==='highlights'){window.kayCatalogHighlightActive();render();if(!document.hidden)refreshHighlightsCatalog();}},30000);
render();
