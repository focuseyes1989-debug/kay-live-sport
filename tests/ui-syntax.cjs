const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync('ui/index.html','utf8');
for(const block of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(block[1]);
console.log('Inline UI JavaScript syntax passed');
