// A fixed public browser destination: no signed player/session links are saved.
(()=>{
 const panel=node('div','','asianbookie-fallback');
 const button=node('button','Watch on AsianBookie');button.id='watch-asianbookie';button.type='button';
 const hint=node('p','Opens in your browser. Ads may appear before the player. Select your match on AsianBookie.');
 const status=node('p');status.id='asianbookie-status';status.setAttribute('role','status');
 panel.append(button,hint,status);document.querySelector('.list-heading').after(panel);
 const playerButton=node('button','Watch on AsianBookie');playerButton.id='watch-asianbookie-player';playerButton.type='button';
 playerButton.title='Open AsianBookie Live in your browser';$('retry').before(playerButton);
 async function open(){
  if(button.disabled)return;
  button.disabled=playerButton.disabled=true;
  button.setAttribute('aria-busy','true');playerButton.setAttribute('aria-busy','true');status.textContent='Opening browser…';
  try{
   const result=await rpc('open_asianbookie',{});
   if(result?.opened!==true)throw Error('Could not open the browser.');
   status.textContent='Opened in browser. Select your match and close the ad when its Close button appears.';
  }catch(error){
   status.textContent=String(error.message||error);
   if(document.body.classList.contains('mobile-watch')||$('stage').classList.contains('is-fullscreen'))recoveryNotice(status.textContent,false,'info');
  }finally{
   button.disabled=playerButton.disabled=false;
   button.setAttribute('aria-busy','false');playerButton.setAttribute('aria-busy','false');
  }
 }
 button.onclick=playerButton.onclick=open;
})();
