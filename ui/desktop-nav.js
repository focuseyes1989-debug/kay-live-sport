// Keep the desktop navigation available even when the match list is collapsed.
document.addEventListener('DOMContentLoaded',()=>{
 if(window.kayAndroid)return;
 const filters=document.querySelector('.filters');
 const rail=document.createElement('nav');rail.id='desktop-nav';rail.setAttribute('aria-label','Main navigation');
 const icons=[
  ['All matches','M3 10 12 3l9 7v11h-6v-7H9v7H3Z'],
  ['Live now','M10 8v8l6-4ZM5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14'],
  ['Results','M12 7v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0'],
  ['Myanmar TV','M3 4h18v14H3ZM8 22h8M12 18v4M9 1l3 3 3-3']
 ];
 [...filters.children].forEach((button,index)=>{
  const [label,path]=icons[index]||[button.textContent,'M4 4h16v16H4Z'];
  button.title=label;button.setAttribute('aria-label',label);button.dataset.tooltip=label;
  button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="'+path+'"/></svg>';
 });
 rail.append(filters);document.body.append(rail);document.body.classList.add('desktop-navigation');
 rail.addEventListener('click',event=>{
  if(!event.target.closest('button'))return;
  setSidebarHidden(false);
  try{localStorage.setItem('live-sport.sidebar-hidden','false');}catch{}
 });
 const updateCurrent=()=>{for(const button of filters.children){if(button.classList.contains('active'))button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}};
 new MutationObserver(updateCurrent).observe(filters,{subtree:true,attributes:true,attributeFilter:['class']});updateCurrent();
 const style=document.createElement('style');style.textContent=`
 body.desktop-navigation main{margin-left:64px;width:calc(100% - 64px)}
 #desktop-nav{position:fixed;top:60px;bottom:24px;left:0;width:64px;background:#101824;border-right:1px solid var(--line);padding:12px 6px;z-index:20}
 #desktop-nav .filters{display:flex;flex-direction:column;align-items:center;gap:10px;padding:0;margin:0;border:0;border-radius:0;background:none}
 #desktop-nav .filters button{position:relative;display:grid;place-items:center;flex:none;width:44px;height:44px;min-height:44px;padding:10px;border:1px solid transparent;border-radius:12px;background:transparent;color:#94a6bd}
 #desktop-nav svg{width:23px;height:23px;pointer-events:none}
 #desktop-nav .filters button:hover,#desktop-nav .filters button:focus-visible{background:#173b30;border-color:#2c7257;color:#85efbd}
 #desktop-nav .filters button.active{background:#1b4938;border-color:#35c98d;color:#7df0b9;box-shadow:inset 3px 0 0 #3edba1}
 #desktop-nav .filters [data-filter=live]{color:#ff5265}
 #desktop-nav button::after{content:attr(data-tooltip);position:absolute;left:calc(100% + 12px);top:50%;transform:translateY(-50%);padding:7px 10px;border:1px solid #355047;border-radius:7px;background:#17272a;color:#e5f5ee;font-size:12px;white-space:nowrap;pointer-events:none;opacity:0}
 #desktop-nav button:hover::after,#desktop-nav button:focus-visible::after{opacity:1}
 body.player-fullscreen #desktop-nav{visibility:hidden}
 `;document.head.append(style);
});
