const fs=require('fs'),vm=require('vm'),assert=require('assert');
function harness(saved){
 const nodes=new Map(),store=new Map(saved?[['live-sport.goal-notifications',saved]]:[]);let opened;
 const node=(tag,text='',cls='')=>({textContent:text,children:[],append(...items){this.children.push(...items)},setAttribute(k,v){this[k]=v},remove(){this.removed=true}});
 const $=id=>{if(!nodes.has(id))nodes.set(id,node('div'));return nodes.get(id)};
 const c=vm.createContext({matches:[],node,$,displayName:n=>n,choose:m=>opened=m,Date,localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},setTimeout:()=>1,clearTimeout(){}});
 vm.runInContext(fs.readFileSync('ui/live-notifications.js','utf8'),c);c.initializeGoalNotificationToggle();return{c,$,store,get opened(){return opened}};
}
let h=harness(),m={id:'a',sport:'1',home:'Home',away:'Away',kickoff:100,live:true,finished:false,homeScore:'0',awayScore:'0',scoreSource:'ESPN'};h.c.matches=[m];
const count=()=>h.$('match-live-notifications').children.length;
h.c.observeGoalChanges();assert.equal(count(),0);m.homeScore='1';h.c.observeGoalChanges();assert.equal(count(),1);h.c.observeGoalChanges();assert.equal(count(),1);
let toast=h.$('match-live-notifications').children[0];assert.match(toast.children[0].children[0].textContent,/Home scored/);toast.children[0].onclick();assert.equal(h.opened,m);
m.homeScore='0';h.c.observeGoalChanges();m.homeScore='1';h.c.observeGoalChanges();assert.equal(count(),1);
m.scoreSource='FotMob';m.homeScore='2';h.c.observeGoalChanges();assert.equal(count(),1);m.awayScore='1';h.c.observeGoalChanges();assert.equal(count(),2);
h.$('toggle-goal-notifications').onclick();assert.equal(h.store.get('live-sport.goal-notifications'),'false');m.awayScore='2';h.c.observeGoalChanges();assert.equal(count(),2);h.$('toggle-goal-notifications').onclick();h.c.observeGoalChanges();assert.equal(count(),2);
m.finished=true;m.live=false;m.homeScore='3';h.c.observeGoalChanges();assert.equal(count(),2);
h=harness('false');assert.equal(h.$('toggle-goal-notifications')['aria-pressed'],'false');
console.log('Goal alerts: baseline suppression, scoring team, repeated refresh, correction, source change, toggle persistence and finished matches passed');
