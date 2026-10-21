const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const harness=vm.runInNewContext(fs.readFileSync('tests/failover.cjs','utf8').split('(async()=>{')[0]+'\nharness',{require,console});
(async()=>{
 const sources=[{url:'https://alternate.test/live.m3u8',format:'hls'},{url:'https://original.test/live.m3u8',format:'hls'}];
 let calls=0;const h=harness(async()=>{calls++;return {sources}});
 const cache=new Map();h.context.localStorage={getItem:k=>cache.get(k)||null,setItem:(k,v)=>cache.set(k,v)};
 await h.start();assert.equal(h.instances[0].url,sources[0].url);
 h.fatal();await h.advance(500);assert.equal(h.context.channel.id,'A');assert.equal(h.instances[1].url,sources[1].url);assert.equal(calls,1);
 h.progress(1);assert(cache.size);h.fatal();await h.advance(1500);assert.equal(h.context.channel.id,'B');
 h.run("rpc=async()=>{throw Error('network')}");await h.start(0);assert.equal(h.instances.at(-1).url,sources[0].url);h.progress(2);
 const original=cache.get('live-sport.stream-cache');await h.advance(10000);h.progress(3);assert.equal(cache.get('live-sport.stream-cache'),original);
 await h.advance(300001);await h.start(0);assert.match(h.$('message').textContent,/Switching to B/);
 const old=h.instances.at(-1);await h.start(2);old.emit('error',{fatal:true});assert.equal(h.context.channel.id,'C');
 const bounded=harness(async()=>({sources}));await bounded.start();
 for(let i=0;i<3;i++){bounded.fatal();await bounded.advance(500);bounded.fatal();await bounded.advance(1500);}
 assert.match(bounded.$('message').textContent,/All commentator/);assert.equal(bounded.instances.length,6);assert.equal(bounded.timers.size,0);
 const manual=harness(async()=>({sources}));await manual.start();manual.fatal();await manual.start(2);await manual.advance(500);assert.equal(manual.context.channel.id,'C');assert.equal(manual.instances.length,2);
 console.log('Stream route tests passed: alternate/original before commentator, bounded recovery, cache TTL, no cache renewal, stale events.');
})().catch(e=>{console.error(e);process.exit(1)});
