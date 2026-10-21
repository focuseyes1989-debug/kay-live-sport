const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const harness=vm.runInNewContext(fs.readFileSync('tests/failover.cjs','utf8').split('(async()=>{')[0]+'\nharness',{require,console});
(async()=>{
 const h=harness();const box=h.$('recovery-bar');box.setAttribute=(k,v)=>box[k]=v;
 await h.start();assert.equal(box['data-kind'],'connecting');assert.equal(box['aria-busy'],'true');assert(!box.hidden);assert(h.$('player-retry').hidden);
 h.progress(1);assert.equal(box['data-kind'],'connected');assert.equal(box['aria-busy'],'false');assert.equal(h.$('recovery-title').textContent,'Connected');
 await h.advance(2000);h.progress(2);await h.advance(1000);assert(box.hidden,'success does not restart its timer for each frame');
 await h.start();h.progress(1);await h.advance(1000);h.context.recoveryNotice('Connection failed',true);await h.advance(3000);assert(!box.hidden);assert.equal(box['data-kind'],'error');assert(!h.$('player-retry').hidden);
 await h.start();h.progress(1);h.context.stop();await h.advance(3000);assert(box.hidden);
 console.log('Player notices: connecting spinner state, first-frame success, timed dismissal, persistent error/Retry and stale timer cancellation passed');
})().catch(e=>{console.error(e);process.exitCode=1});
