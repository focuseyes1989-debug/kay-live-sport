// Myanmar TV uses the public directory's channel pages and public HLS players.
let myanmarPage=false,myanmarChannels=[],myanmarLoaded=0,myanmarBusy=false,myanmarError='',myanmarCached=false;
const myanmarSource=node('button','Open channel website');myanmarSource.id='myanmar-source';myanmarSource.type='button';myanmarSource.hidden=true;$('retry').after(myanmarSource);
myanmarSource.onclick=()=>{if(!selected?.myanmarChannel)return;rpc('open_myanmar_tv',{url:selected.sourcePage}).catch(e=>recoveryNotice(e.message,true));};
const myanmarRpc=rpc;
rpc=function(command,args={}){if(command==='resolve'&&String(args.post).startsWith('myanmar:'))return myanmarRpc('myanmar_resolve',{id:args.post.slice(8)});return myanmarRpc(command,args);};
const myanmarUpdate=updateSelected;
updateSelected=function(...args){myanmarUpdate(...args);const active=!!selected?.myanmarChannel;myanmarSource.hidden=!active;if(active){$('title').textContent=selected.home;$('subtitle').textContent='Myanmar TV · myanmartvchannels.com';$('scoreboard').hidden=true;$('channel-label').hidden=true;$('channels').hidden=true;}else $('channels').hidden=false;};
const myanmarRetry=retryPlayback;
retryPlayback=function(){if(!selected?.myanmarChannel)return myanmarRetry();if(retryInProgress)return;retryInProgress=true;updateRetryState(true);waitingFixture=null;attemptedChannels.clear();play(selected.channels[0]);};
$('retry').onclick=()=>retryPlayback();$('player-retry').onclick=()=>retryPlayback();
function chooseMyanmar(item){
 clearCatalogSelection();myanmarPage=true;
 choose({id:'myanmar-'+item.id,myanmarChannel:true,sourcePage:item.page,home:item.name,away:'',league:'Myanmar TV',sport:'tv',kickoff:0,live:true,finished:false,post:'myanmar:'+item.id,channels:[{id:item.id,name:item.name}]});
}
const myanmarRender=render;
render=function(...args){
 if(!myanmarPage)return myanmarRender(...args);
 $('results-controls').hidden=true;catalogControls.hidden=true;resultsContentTabs.hidden=true;
 const query=$('search').value.trim().toLowerCase(),rows=myanmarChannels.filter(c=>c.name.toLowerCase().includes(query));
 $('count').textContent=myanmarBusy?'Loading…':rows.length+' channels';$('list').replaceChildren();
 const status=node('p',myanmarBusy?'Loading Myanmar TV channels…':myanmarError||'Source: myanmartvchannels.com'+(myanmarCached?' · saved directory':''),'meta myanmar-status');status.setAttribute('role','status');$('list').append(status);
 for(const item of rows){
  const b=node('button','','card myanmar-card'+(selected?.id==='myanmar-'+item.id?' active':''));b.type='button';b.dataset.fixtureId='myanmar-'+item.id;b.setAttribute('aria-label','Watch '+item.name);
  const badge=node('span',item.name.slice(0,2).toUpperCase(),'myanmar-logo-fallback');const img=document.createElement('img');img.src='/tv-channels/'+encodeURIComponent(item.id)+'.webp';img.alt='';img.loading='lazy';img.onload=()=>{badge.hidden=true;};img.onerror=()=>{img.hidden=true;};
  b.append(badge,img,node('strong',item.name),node('span','Watch live','meta'));b.onclick=()=>chooseMyanmar(item);$('list').append(b);
 }
 if(!rows.length&&!myanmarBusy){$('list').append(node('p',query?'No channels match this search.':myanmarError||'No channels available. Press Refresh to try again.','meta'));}
};
async function refreshMyanmar(force=false){
 if(myanmarBusy)return;
 if(!force&&myanmarLoaded&&Date.now()-myanmarLoaded<300000){render();return;}
 myanmarBusy=true;myanmarError='';render();
 try{const data=await rpc('myanmar_channels');if(!Array.isArray(data?.channels))throw Error('Invalid channel directory');myanmarChannels=data.channels;myanmarCached=!!data.cached;myanmarLoaded=Date.now();}
 catch(e){myanmarError='Could not load Myanmar TV. Press Refresh to retry.';}
 finally{myanmarBusy=false;render();}
}
const myanmarRefresh=$('refresh').onclick;
$('refresh').onclick=()=>myanmarPage?refreshMyanmar(true):myanmarRefresh();

// Desktop filters and touch navigation share the same channel page.
document.addEventListener('DOMContentLoaded',()=>{
 if(window.kayTvPreview)return;
 const button=node('button','Myanmar TV');button.id='myanmar-tv-tab';button.type='button';button.setAttribute('aria-label','Myanmar TV');document.querySelector('.filters').append(button);
 function openMyanmar(){myanmarPage=true;if(typeof showMobileView==='function')showMobileView('matches');render();refreshMyanmar();if(typeof updateMobileNavigation==='function')updateMobileNavigation('matches');}
 button.onclick=openMyanmar;
 const nav=$('mobile-tabs');
 if(nav){
  document.body.classList.add('phone-tablet');nav.classList.add('has-myanmar-tv');const mobile=node('button');mobile.id='mobile-myanmar';mobile.type='button';mobile.setAttribute('aria-label','Myanmar TV');mobile.title='Myanmar TV';mobile.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5H21V18H3Z M8 22H16 M12 18V22 M7 1L12 5 17 1"/></svg><span>Myanmar TV</span>';mobile.onclick=openMyanmar;nav.insertBefore(mobile,$('mobile-watch'));
  const update=updateMobileNavigation;updateMobileNavigation=function(view){update(view);const active=myanmarPage&&view!=='watch';if(active)for(const child of nav.children){child.classList.remove('active');child.removeAttribute('aria-current');}mobile.classList.toggle('active',active);if(active)mobile.setAttribute('aria-current','page');else mobile.removeAttribute('aria-current');};
 }
 const baseRender=render;
 render=function(...args){
  const result=baseRender(...args);document.body.classList.toggle('myanmar-page',myanmarPage);
  document.querySelector('.list-heading h2').textContent=myanmarPage?'Myanmar TV':'Match centre';
  button.classList.toggle('active',myanmarPage);button.setAttribute('aria-pressed',String(myanmarPage));
  for(const child of document.querySelectorAll('.filters [data-filter]'))child.classList.toggle('active',!myanmarPage&&child.dataset.filter===filter);
  if(myanmarPage)$('match-league-controls').hidden=true;
  if(nav)updateMobileNavigation(document.body.classList.contains('mobile-watch')?'watch':'matches');
  return result;
 };
 render();
});
