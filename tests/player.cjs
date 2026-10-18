const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
function element(){const flags=new Set();return {hidden:false,value:'',textContent:'',disabled:false,children:[],classList:{contains:k=>flags.has(k),toggle:(k,on)=>on?flags.add(k):flags.delete(k)},setAttribute(){},addEventListener(){},replaceChildren(...a){this.children=a},add(a){this.children.push(a)},click(){this.onclick?.()}}}
const ids=['video','player-controls','quality-info','quality','toggle-play','mute','volume','volume-value','stage','fullscreen','message'];
const els=Object.fromEntries(ids.map(id=>[id,element()]));
Object.assign(els.video,{volume:1,muted:false,paused:true,videoHeight:720,play(){this.paused=false;return Promise.resolve()},pause(){this.paused=true}});
const player={levels:[{height:720,bitrate:2000000},{height:1080,bitrate:4000000}],currentLevel:0};
const context=vm.createContext({$:id=>els[id],hls:player,Option:class{constructor(text,value){this.text=text;this.value=value}},document:{body:element(),addEventListener(){}},rpc:async(_,args)=>args,console});
vm.runInContext(fs.readFileSync('ui/player.js','utf8'),context);
(async()=>{
vm.runInContext('populateQualities(hls)',context);assert.equal(els.quality.children.length,3);assert.match(els.quality.children[2].text,/1080p/);
els.quality.value='1';els.quality.onchange();assert.equal(player.currentLevel,1);
els.quality.value='-1';els.quality.onchange();assert.equal(player.currentLevel,-1);
els.volume.value='35';els.volume.oninput();assert.equal(els.video.volume,.35);assert.equal(els['volume-value'].textContent,'35%');
els.mute.onclick();assert.equal(els.video.muted,true);els.mute.onclick();assert.equal(els.video.muted,false);
els.video.volume=0;els.mute.onclick();assert.equal(els.video.volume,.8);
await vm.runInContext('setFullscreen(true)',context);assert(els.stage.classList.contains('is-fullscreen'));
await vm.runInContext('setFullscreen(false)',context);assert(!els.stage.classList.contains('is-fullscreen'));
player.levels=[{height:720}];player.currentLevel=0;vm.runInContext('populateQualities(hls)',context);assert.match(els['quality-info'].textContent,/Single quality/);
vm.runInContext('resetPlayerControls()',context);assert.equal(els.quality.disabled,true);assert.equal(els['player-controls'].hidden,true);
console.log('Player volume, mute, HLS manual/Auto quality, single quality, fullscreen, reset passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
