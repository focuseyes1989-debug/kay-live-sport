const fs=require('fs'),vm=require('vm'),assert=require('assert');
function element(tag='',text='',cls=''){const e={tag,text,textContent:text,children:[],hidden:false,parentElement:{classList:{toggle(){}}},classes:new Set(cls.split(' ')),setAttribute(){},append(...x){this.children.push(...x)},after(x){this.next=x},replaceChildren(...x){this.children=x},querySelectorAll(q){return this.children.flatMap(c=>[...(q==='.highlights-card'&&c.classes.has('highlights-card')?[c]:[]),...c.querySelectorAll(q)])},querySelector(){return this.children.find(c=>c.tag==='p')}};e.classList={add:c=>e.classes.add(c),remove:c=>e.classes.delete(c)};return e;}
function harness(){const stage=element(),head=element();let calls=0,now=new Date(2026,2,9,0,5).getTime();const timers=[];class ClockDate extends Date {constructor(...args){super(...(args.length?args:[now]))}static now(){return now}}
 const c=vm.createContext({URL,playToken:0,stop(){},wantPlayback:false,window:{},Date:ClockDate,setInterval:fn=>timers.push(fn),document:{createElement:element,head,addEventListener(){}},node:element,$:()=>stage,selected:{id:'result-1',sport:'1',finished:true,home:'Liverpool',away:'Manchester City',kickoff:(now-60000)/1000},updateSelected(){},rpc:async()=>{calls++;return {videos:[{title:'Liverpool vs Manchester City highlights',videoId:'3uoy7oVLriY',url:'https://www.youtube.com/watch?v=3uoy7oVLriY'}]}}});vm.runInContext(fs.readFileSync('ui/highlights.js','utf8'),c);return {c,panel:stage.next,calls:()=>calls,setNow:value=>now=value,timers}}

const walk=e=>[e,...e.children.flatMap(walk)],text=e=>walk(e).map(n=>n.text).join(' ');
(async()=>{
 const url='https://hoofoot.net/full-matches/premier-league/liverpool-vs-man-city-highlights-march-9-2026/';
 let {c,panel,calls}=harness();c.rpc=async()=>({videos:[{title:'Liverpool vs Manchester City',url}]});await c.refreshHighlights();assert(!panel.hidden);assert.match(text(panel),/Watch highlights/);assert(!walk(panel).some(n=>n.tag==='iframe'));
 let opened;c.rpc=async(command,args)=>{opened={command,args};return {opened:true};};await walk(panel).find(n=>n.text==='Watch highlights').onclick();assert.equal(opened.command,'open_highlight');assert.equal(opened.args.url,url);
 for(const bad of ['https://www.youtube.com/watch?v=x','https://matchhighlights.live/','https://hoofoot.net.evil.test/full-matches/','file:///test','https://hoofoot.net/full-matches/?x=1'])assert.equal(c.safeHighlightLink(bad),false);
 assert(c.safeHighlightLink('https://hoofoot.net/full-matches/'));
 for(const days of [0,-1,-2,1]){const h=harness(),d=new Date(2026,2,9,0,0);d.setDate(d.getDate()+days);h.c.selected.kickoff=d.getTime()/1000;await h.c.refreshHighlights();assert.equal(h.panel.hidden,days!==0&&days!==-1);assert.equal(h.calls(),days===0||days===-1?1:0);}
 ({c,panel}=harness());let resolve;c.rpc=()=>new Promise(r=>resolve=r);const pending=c.refreshHighlights();c.selected={...c.selected,finished:false};await c.refreshHighlights();resolve({videos:[{title:'Stale',url}]});await pending;assert(panel.hidden);
 ({c,panel}=harness());c.rpc=async()=>{throw Error('offline')};await c.refreshHighlights();assert.match(text(panel),/Could not load/);
 console.log('HooFoot fixture highlights: browser-only playback, strict source URL, today/yesterday, stale responses and retry passed');
})().catch(e=>{console.error(e);process.exitCode=1});
