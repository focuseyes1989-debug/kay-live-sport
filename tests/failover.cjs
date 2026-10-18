const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
function harness(resolve=async()=>({url:'https://example.test/live.m3u8'})){
 let now=1000,id=0;const timers=new Map(),instances=[];
 const elements=new Map();const $=key=>{if(!elements.has(key))elements.set(key,{hidden:false,textContent:'',children:[],classList:{toggle(){}},pause(){this.paused=true},load(){this.currentTime=0},removeAttribute(){},play(){this.paused=false;return Promise.resolve()},canPlayType(){return false},currentTime:0,volume:.42,muted:true});return elements.get(key)};
 class Hls{static Events={MANIFEST_PARSED:'manifest',LEVEL_SWITCHED:'level',ERROR:'error'};static isSupported(){return true}constructor(){this.callbacks={};instances.push(this)}on(k,fn){this.callbacks[k]=fn}loadSource(u){this.url=u}attachMedia(){}destroy(){this.destroyed=true}emit(k,v){this.callbacks[k]?.(k,v)}}
 const channels=['A','B','C'].map(id=>({id,name:id}));
 const context=vm.createContext({$,Hls,Date:class extends Date{static now(){return now}},selected:{id:'match',post:'42',channels},channel:null,playToken:0,hls:null,rpc:(_,args)=>resolve(args),resetPlayerControls(){},populateQualities(){},updateQualityInfo(){},node(){return {}},render(){},updateSelected(){},setInterval(){},setTimeout(fn,ms){const key=++id;timers.set(key,{fn,at:now+ms});return key},clearTimeout(key){timers.delete(key)}});
 vm.runInContext(fs.readFileSync('ui/playback.js','utf8'),context);
 return {context,$,channels,instances,timers,run:code=>vm.runInContext(code,context),async advance(ms){now+=ms;for(const [key,t] of [...timers])if(t.at<=now){timers.delete(key);t.fn()}await Promise.resolve();await Promise.resolve();},async start(i=0){await context.play(channels[i])},fatal(){instances.at(-1).emit('error',{fatal:true})},progress(time){$('video').currentTime=time;$('video').ontimeupdate?.()},now:()=>now};
}
(async()=>{
 let h=harness(async a=>{if(a.channel==='A')throw Error('offline');return {url:'https://example.test/live.m3u8'}});
 await h.start();assert.match(h.$('message').textContent,/Switching to B/);await h.advance(1500);assert.equal(h.context.channel.id,'B');h.fatal();await h.advance(1500);assert.equal(h.context.channel.id,'C');h.fatal();assert.match(h.$('message').textContent,/All commentator/);assert.equal(h.timers.size,0);assert.equal(h.$('player-retry').hidden,false);assert.equal(h.$('video').volume,.42);assert.equal(h.$('video').muted,true);
 // Manual selection cancels a queued recovery and stale HLS callbacks.
 h=harness();await h.start();const old=h.instances[0];h.fatal();await h.start(2);await h.advance(1500);old.emit('error',{fatal:true});assert.equal(h.context.channel.id,'C');assert.equal(h.timers.size,0);
 // A slow URL request cannot replace a newer manual choice.
 let release;h=harness(a=>a.channel==='A'?new Promise(r=>release=r):Promise.resolve({url:'https://example.test/B'}));const late=h.start();await h.start(1);release({url:'https://example.test/A'});await late;assert.equal(h.context.channel.id,'B');assert.equal(h.instances.length,1);assert.equal(h.instances[0].url,'https://example.test/B');
 // Startup without frames times out, including stalled resolver requests.
 h=harness();await h.start();await h.advance(30000);h.run('checkPlaybackHealth()');assert.match(h.$('message').textContent,/timed out/);
 h=harness(()=>new Promise(()=>{}));h.start();await h.advance(30000);h.run('checkPlaybackHealth()');assert.match(h.$('message').textContent,/Switching to B/);
 // A frozen playing tag recovers. Intentional pauses do not.
 h=harness();await h.start();h.progress(1);await h.advance(21000);h.run('checkPlaybackHealth()');assert.match(h.$('message').textContent,/stopped progressing/);
 h=harness();await h.start();h.progress(1);h.run('setPlaybackIntent(false)');await h.advance(60000);h.run('checkPlaybackHealth()');assert.equal(h.timers.size,0);h.run('setPlaybackIntent(true)');h.run('checkPlaybackHealth()');assert.equal(h.timers.size,0);await h.advance(21000);h.run('checkPlaybackHealth()');assert.equal(h.timers.size,1);
 h=harness();await h.start();h.run('setPlaybackIntent(false)');h.fatal();assert.equal(h.timers.size,0);assert.match(h.$('message').textContent,/while paused/);
 // Healthy viewing starts a fresh future recovery cycle.
 h=harness();await h.start();h.fatal();await h.advance(1500);h.progress(1);await h.advance(31000);h.progress(32);h.fatal();assert.match(h.$('message').textContent,/Switching to A/);
 // Autoplay permissions are not mistaken for an offline stream.
 h=harness();await h.start();h.$('video').play=()=>Promise.reject(Object.assign(Error(),{name:'NotAllowedError'}));h.instances[0].emit('manifest');await Promise.resolve();await Promise.resolve();await h.advance(60000);h.run('checkPlaybackHealth()');assert.equal(h.timers.size,0);assert.match(h.$('message').textContent,/Press Play/);

 // Signed FLV URLs retain their query and use FLV playback, not HLS.
 h=harness(async()=>({url:'https://example.test/live.flv?auth_key=signed',format:'flv'}));
 const flvs=[];h.context.mpegts={getFeatureList:()=>({mseLivePlayback:true}),Events:{ERROR:'error'},createPlayer(config){const p={config,on(k,f){this.error=f},attachMediaElement(){},load(){this.loaded=true},destroy(){this.destroyed=true}};flvs.push(p);return p}};
 await h.start();assert.equal(h.instances.length,0);assert.equal(flvs[0].config.url,'https://example.test/live.flv?auth_key=signed');assert(flvs[0].loaded);
 h.progress(1);assert.match(h.$('message').textContent,/Playing live/);
 flvs[0].error('network','http',{code:403});assert(flvs[0].destroyed);assert.match(h.$('message').textContent,/403/);
 await h.advance(1500);assert.equal(flvs.length,2);flvs[0].error('network','http',{code:403});assert.equal(h.context.channel.id,'B');
 h.run('stop()');assert(flvs[1].destroyed);
 console.log('Failover tests passed: resolver/fatal errors, bounded exhaustion, stale callbacks, manual cancellation, startup timeout, frozen video, pause/resume, stable recovery reset, autoplay, volume preservation.');
})().catch(e=>{console.error(e);process.exitCode=1});
