const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const acorn = require('acorn');
const root = path.join(__dirname, 'www');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert(html.includes('window.kayTvSimple'), 'Prepare the TV frontend before running this test');
let scripts = 0;
for (const name of fs.readdirSync(root).filter(name => name.endsWith('.js'))) {
  acorn.parse(fs.readFileSync(path.join(root, name), 'utf8'), {ecmaVersion: 2019});
  scripts++;
}
for (const match of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
  acorn.parse(match[1], {ecmaVersion: 2019});
  scripts++;
}
assert.throws(() => acorn.parse('object?.value', {ecmaVersion: 2019}));
console.log(scripts + ' TV scripts parse without optional chaining or newer syntax');

