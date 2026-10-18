const fs=require('fs'),vm=require('vm'),assert=require('assert');let now=100000,refreshes=0;const button={disabled:false},labels=[{dataset:{countdownId:'a'}}];const a={id:'a',kickoff:101,live:false,finished:false,status:'Scheduled'};
const c=vm.createContext({Date:class extends Date{static now(){return now}},matches:[a],scoreBusy:false,$:()=>button,document:{querySelectorAll:()=>labels},refresh(){refreshes++},node:()=>({dataset:{}})});
vm.runInContext(fs.readFileSync('ui/countdown.js','utf8'),c);
assert.equal(c.kickoffCountdown(a),'Starts in 00:00:01');
assert.equal(c.kickoffCountdown({...a,kickoff:100+90061}),'Starts in 1d 01:01:01');
assert.equal(c.kickoffCountdown({...a,kickoff:null}),'');assert.equal(c.kickoffCountdown({...a,live:true}),'');assert.equal(c.kickoffCountdown({...a,finished:true}),'');assert.equal(c.kickoffCountdown({...a,status:'Postponed'}),'');
c.tickKickoffCountdowns();assert.equal(refreshes,0);assert.equal(labels[0].textContent,'Starts in 00:00:01');
now=101000;c.scoreBusy=true;c.tickKickoffCountdowns();assert.equal(refreshes,0);assert.equal(labels[0].textContent,'Awaiting live status');
c.scoreBusy=false;button.disabled=true;c.tickKickoffCountdowns();assert.equal(refreshes,0);
button.disabled=false;c.matches.push({...a,id:'b'});c.tickKickoffCountdowns();assert.equal(refreshes,1);c.tickKickoffCountdowns();assert.equal(refreshes,1);
a.live=true;c.tickKickoffCountdowns();assert(labels[0].hidden);
c.matches.push({...a,id:'c',live:false,kickoff:102});now=150000;c.tickKickoffCountdowns();assert.equal(refreshes,2);
assert.equal(a.live,true);assert.equal(c.matches[2].live,false); // Time alone must not invent live status.
console.log('Countdown, day rollover, kickoff boundary, busy deferral, batched checks, sleep/resume and confirmed-only live status passed');
