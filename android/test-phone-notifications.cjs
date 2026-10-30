const vm=require('vm'),fs=require('fs'),assert=require('assert');
(async()=>{
 const calls=[],stored=new Map(),rows=[];let denied=false,fail=false;
 const element=()=>({style:{},append(){},prepend(row){rows.push(row)},setAttribute(k,v){this[k]=v}});
 const match={sport:'1',home:'Home',away:'Away',kickoff:100,live:false};
 const context={node:element,matches:[match],liveFixtureKey:m=>['1',m.home,m.away,m.kickoff].join('|'),observeLiveTransitions:()=>{},localStorage:{getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)},document:{addEventListener(){},querySelector:()=>element()},rpc:async(c,a)=>{calls.push([c,a]);if(fail)throw Error('native error');return {granted:!denied}}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/phone-notifications.js','utf8'),context);
 await new Promise(setImmediate);assert.equal(calls[0][1].enabled,false);
 await rows[0].onclick();assert.equal(calls[1][0],'phone_notification_permission');assert.equal(calls[2][0],'phone_notifications');assert.equal(calls[2][1].enabled,true);
 match.live=true;context.observeLiveTransitions();await new Promise(setImmediate);
 assert.equal(JSON.parse(calls.at(-1)[1].fixtures)[0].live,true);
 await rows[0].onclick();assert.equal(calls.at(-1)[1].enabled,false);assert.equal(stored.get('live-sport.phone-system-notifications'),'false');
 fail=true;await rows[0].onclick();assert.equal(stored.get('live-sport.phone-system-notifications'),'false');
 console.log('Phone background notification opt-in, permission, fixture synchronization, cancellation and failure rollback passed');
})();
