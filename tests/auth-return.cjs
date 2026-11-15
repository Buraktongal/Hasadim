const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const context = vm.createContext({ window: {}, URL });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/Hasadim.Web/wwwroot/js/return-path.js'), 'utf8'), context);
const resolve = context.window.HasadimReturn.resolve;
for (const input of ['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', '/%2f%2fevil.example', '/html/giris.html', '/api/account/logout', null, '']) {
    assert.equal(resolve(input), '/', input);
}
assert.equal(resolve('/html/ilan.html?id=abc'), '/html/ilan.html?id=abc');
assert.equal(resolve('/?action=new-listing'), '/?action=new-listing');
assert.equal(resolve('/?view=messages'), '/?view=messages');
console.log('PASS: login return paths preserve local intent and reject external or unsupported destinations');
