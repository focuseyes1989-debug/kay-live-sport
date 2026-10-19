const fs=require('fs'),vm=require('vm'),assert=require('assert');
const shared=vm.createContext({require,console});vm.runInContext(fs.readFileSync('tests/failover.cjs','utf8').split('(async()=>{')[0],shared);
function setup(){const h=shared.harness();h.context.node=()=>({dataset:{},classList:{toggle(){}}});h.$('channels').replaceChildren=()=>{h.$('channels').children=[]};h.$('channels').append=b=>h.$('channels').children.push(b);const m={id:'m',post:'42',home:'Home',away:'Away',kickoff:100,live:false,finished:false,channels:[{id:'A',name:'Caster'}]};h.context.matches=[m];h.context.rpc=async cmd=>cmd==='matches'?[{...m,post:'43',channels:[{id:'B',name:'Fresh'}]}]:{url:'https://example.test/live.m3u8'};h.context.choose(m);return {h,m}}
(async()=>{
 let {h,m}=setup();assert(!h.$('try-stream').hidden);assert.equal(h.instances.length,0);await h.context.tryScheduledStream();await Promise.resolve();assert.equal(h.context.selected.live,false);assert.equal(h.context.selected.post,'43');assert.equal(h.context.channel.id,'B');assert(h.$('try-stream').hidden);assert(h.context.isManualStreamMatch(h.context.selected));assert.equal(h.instances.length,1);
 h.context.choose({...m,id:'next',home:'Next'});assert(!h.context.isManualStreamMatch(h.context.selected));assert(!h.$('try-stream').hidden);
 for(const extra of [{live:true},{finished:true},{channels:[]}]){({h,m}=setup());h.context.choose({...m,...extra});assert(h.$('try-stream').hidden);}
 ({h,m}=setup());h.context.rpc=async()=>{throw Error('offline')};await h.context.tryScheduledStream();assert(!h.$('try-stream').disabled);assert(!h.$('try-stream').hidden);assert.match(h.$('message').textContent,/offline/);
 ({h,m}=setup());let release;h.context.rpc=()=>new Promise(r=>release=r);const pending=h.context.tryScheduledStream();h.context.choose({...m,id:'new',home:'Other'});release([m]);await pending;assert.equal(h.context.selected.home,'Other');assert.equal(h.instances.length,0);
 ({h,m}=setup());h.context.rpc=async()=>[{...m,finished:true}];await h.context.tryScheduledStream();assert.equal(h.instances.length,0);assert.match(h.$('message').textContent,/No commentator/);
 console.log('Try stream: scheduled manual playback, fresh links, unchanged status, hidden button guards, failures and stale/finished request rejection passed');
})().catch(e=>{console.error(e);process.exitCode=1});
