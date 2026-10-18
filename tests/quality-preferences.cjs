const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
function launch(saved,levels,height=0){
 const nodes=new Map();function $(id){if(!nodes.has(id))nodes.set(id,{value:'',children:[],classList:{contains(){return false},toggle(){}},setAttribute(){},addEventListener(){},replaceChildren(...a){this.children=a},add(a){this.children.push(a)}});return nodes.get(id)}
 Object.assign($('video'),{volume:1,muted:false,videoHeight:height,addEventListener(){}});
 const player={levels,currentLevel:-1};const storage={getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v)};
 const context=vm.createContext({$,hls:player,localStorage:storage,Option:class{constructor(text,value){this.text=text;this.value=value}},document:{body:$('body'),addEventListener(){}},rpc:async(_,a)=>a});
 vm.runInContext(fs.readFileSync('ui/player.js','utf8'),context);vm.runInContext('populateQualities(hls)',context);
 return {$,player,run:s=>vm.runInContext(s,context)};
}
const saved=new Map();let app=launch(saved,[{height:720},{height:1080}]);
app.$('quality').value='1';app.$('quality').onchange();assert.equal(JSON.parse(saved.get('live-sport.quality-height')),1080);
app=launch(saved,[{height:1080},{height:480},{height:720}]);assert.equal(app.player.currentLevel,0);assert.equal(app.$('quality').value,'0');
app=launch(saved,[{height:360},{height:720}]);assert.equal(app.player.currentLevel,-1);assert.equal(app.$('quality').value,'-1');assert.equal(JSON.parse(saved.get('live-sport.quality-height')),1080);
app=launch(saved,[{height:1080}]);assert.equal(app.player.currentLevel,0);
app=launch(saved,[{}],0);assert.equal(app.player.currentLevel,-1);app.$('video').videoHeight=1080;app.run('updateQualityInfo()');assert.equal(app.player.currentLevel,0);
app.$('quality').value='-1';app.$('quality').onchange();app=launch(saved,[{height:1080}]);assert.equal(app.player.currentLevel,-1);
app=launch(saved,[{}],720);app.$('quality').value='0';app.$('quality').onchange();assert.equal(JSON.parse(saved.get('live-sport.quality-height')),720);
for(const invalid of ['bad','-1','"720"','{}']){saved.set('live-sport.quality-height',invalid);app=launch(saved,[{height:720}]);assert.equal(app.player.currentLevel,-1);}
console.log('Quality preferences passed: saved resolution, restart with reordered variants, missing-quality Auto fallback, preference retained, single stream metadata, explicit Auto, invalid data.');
