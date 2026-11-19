(function(){
 window.kayTvSimple=true;
 var startupError='';
 function showError(){
  if(!startupError||!document.body)return;
  var box=document.getElementById('tv-startup-error');
  if(!box){
   box=document.createElement('div');box.id='tv-startup-error';box.setAttribute('role','alert');
   box.style.cssText='position:fixed;left:5%;right:5%;bottom:5%;z-index:99999;padding:20px;background:#fff0f0;color:#74212a;border:2px solid #b72b47;border-radius:12px;font:16px/1.6 sans-serif;white-space:pre-wrap;overflow-wrap:anywhere';
   document.body.appendChild(box);
  }
  box.textContent='TV startup error\n'+startupError;
 }
 window.addEventListener('error',function(event){
  if(startupError)return;
  if(event.message)startupError=event.message+' (line '+event.lineno+')';
  else if(event.target&&event.target.tagName==='SCRIPT')startupError='Could not load application script.';
  showError();
 },true);
 document.addEventListener('DOMContentLoaded',showError);
})();
