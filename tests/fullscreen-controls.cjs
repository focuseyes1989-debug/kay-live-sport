const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
function element(){const classes=new Set(),events={};return{hidden:true,paused:false,events,classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k)},addEventListener:(k,fn)=>events[k]=fn,contains:node=>node==='control'}}
const stage=element(),bar=element(),recovery=element(),video=element(),doc=element();doc.activeElement=null;let timer=null;const context=vm.createContext({$:id=>id==='stage'?stage:id==='player-controls'?bar:recovery,video,document:doc,clearTimeout(){timer=null},setTimeout(fn,delay){assert.equal(delay,3000);timer=fn}});vm.runInContext(fs.readFileSync('ui/fullscreen-controls.js','utf8'),context);
stage.classList.add('is-fullscreen');context.setFullscreenControls();timer();assert(stage.classList.contains('controls-hidden'));
stage.events.pointermove();assert(!stage.classList.contains('controls-hidden'));
bar.events.mouseenter();timer();assert(!stage.classList.contains('controls-hidden'));bar.events.mouseleave();timer();assert(stage.classList.contains('controls-hidden'));
video.paused=true;video.events.pause();timer();assert(!stage.classList.contains('controls-hidden'));video.paused=false;video.events.play();timer();assert(stage.classList.contains('controls-hidden'));
doc.activeElement='control';doc.events.keydown();timer();assert(!stage.classList.contains('controls-hidden'));stage.events.pointermove();timer();assert(stage.classList.contains('controls-hidden'));
recovery.hidden=false;stage.events.pointermove();timer();assert(!stage.classList.contains('controls-hidden'));recovery.getAttribute=()=> 'connected';stage.events.pointermove();timer();assert(stage.classList.contains('controls-hidden'));recovery.hidden=true;
stage.classList.remove('is-fullscreen');context.setFullscreenControls();assert(!stage.classList.contains('controls-hidden'));assert.equal(timer,null);
console.log('Fullscreen controls passed: idle hide, mouse reveal, hover, pause, keyboard focus, recovery visibility, windowed cleanup.');
