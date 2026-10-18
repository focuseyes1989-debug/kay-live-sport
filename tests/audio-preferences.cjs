const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const script=fs.readFileSync('ui/player.js','utf8').split('function resetPlayerControls()')[0];
function load(storage){const video={volume:1,muted:false};const context=vm.createContext({$:()=>video,localStorage:storage});vm.runInContext(script,context);return {video,context};}
const saved=new Map();const storage={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v)};
let app=load(storage);assert.equal(app.video.volume,.8);assert.equal(app.video.muted,false);
app.video.volume=.37;app.video.muted=true;vm.runInContext('persistAudioPreferences()',app.context);
app=load(storage);assert.equal(app.video.volume,.37);assert.equal(app.video.muted,true);
app.video.volume=0;app.video.muted=false;vm.runInContext('persistAudioPreferences()',app.context);
app=load(storage);assert.equal(app.video.volume,0);assert.equal(app.video.muted,false);
for(const invalid of ['bad JSON','null','{"volume":3,"muted":"yes"}','{"volume":"0.5"}']){saved.set('live-sport.audio',invalid);app=load(storage);assert.equal(app.video.volume,.8);assert.equal(app.video.muted,false);}
app=load({getItem(){throw Error('unavailable')},setItem(){throw Error('unavailable')}});assert.equal(app.video.volume,.8);assert.doesNotThrow(()=>vm.runInContext('persistAudioPreferences()',app.context));
console.log('Audio preferences passed: restart, muted/unmuted, zero volume, invalid data and unavailable storage.');
