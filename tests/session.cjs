const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('ui/session.js','utf8');const now=1800000000000;
const fixture={id:'m1',scoreId:'feed1',home:'Home',away:'Away',kickoff:now/1000-1000,sport:'1',live:true,finished:false,channels:[{id:'A'},{id:'B'}]};
const saved={id:'m1',scoreId:'feed1',home:'Home',away:'Away',kickoff:fixture.kickoff,channelId:'B'};
function app(rows=[fixture],last=saved,selected=null){const storage=new Map([['live-sport.last-playback',JSON.stringify(last)],['live-sport.sidebar-hidden','true']]);const calls=[];const msg={textContent:''};const context=vm.createContext({matches:rows,selected,Date:class extends Date{static now(){return now}},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},$:()=>msg,choose:(m,c)=>calls.push([m,c]),setSidebarHidden:hidden=>calls.push(['sidebar',hidden])});vm.runInContext(source,context);return{storage,calls,msg,run:s=>vm.runInContext(s,context)}}
let h=app();h.run('restoreLastPlayback()');assert.equal(h.calls[0][1],'B');h.run('restoreLastPlayback()');assert.equal(h.calls.length,1);
h=app([{...fixture,id:'different-post'}]);h.run('restoreLastPlayback()');assert.equal(h.calls[0][1],'B');
for(const rows of [[{...fixture,finished:true}],[{...fixture,live:false}],[],[{...fixture,channels:[]}],[{...fixture,kickoff:now/1000-12000}]] ){
 const last=rows[0]?.kickoff!==undefined?{...saved,kickoff:rows[0].kickoff}:saved;
 h=app(rows,last);h.run('restoreLastPlayback()');assert.deepEqual(h.calls[0],['sidebar',false]);assert.equal(h.storage.get('live-sport.sidebar-hidden'),'false');assert.equal(h.storage.has('live-sport.last-playback'),false);
}
h=app([fixture],saved,{id:'user-choice'});h.run('restoreLastPlayback()');assert.equal(h.calls.length,0);
h=app([fixture],null);h.run('restoreLastPlayback()');assert.equal(h.calls.length,0);
h=app();h.run('rememberPlayback(matches[0],matches[0].channels[0])');assert.equal(JSON.parse(h.storage.get('live-sport.last-playback')).channelId,'A');
h=app([{...fixture,channels:[{id:'A'}]}]);h.run('restoreLastPlayback()');assert.equal(h.calls[0][1],'B'); // choose handles missing B using first available channel.
console.log('Session restore passed: preferred commentator, one-time startup, stable feed identity, ended/missing/offline match returns to visible list, user selection protected, successful playback saved.');
