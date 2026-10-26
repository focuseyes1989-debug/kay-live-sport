// Apply before the first paint. Invalid/missing preferences use Light.
(()=>{
 let theme='light';
 try{if(localStorage.getItem('live-sport.phone-theme')==='dark')theme='dark';}catch{}
 document.documentElement.dataset.phoneTheme=theme;
})();
