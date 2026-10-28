const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '../src/Hasadim.Web/wwwroot');
const html = fs.readFileSync(path.join(root, 'html/kayit.html'), 'utf8');
assert.match(html, /name="phone"/);
assert.match(html, /id="registrationCodeForm" hidden/);
class Field { constructor(value = '') { this.value = value; this.disabled = false; this.textContent = ''; } focus() {} }
class Form {
    constructor(fields) { this.fields = fields; this.button = new Field(); this.hidden = false; this.elements = { namedItem: n => fields[n] }; }
    querySelector() { return this.button; }
    addEventListener(_type, fn) { this.submit = fn; }
    reportValidity() { return true; }
    reset() { for (const field of Object.values(this.fields)) field.value = ''; }
}
const form = new Form({ email: new Field('test@example.test'), password: new Field('TestPassword123'), phone: new Field('05011111111'), displayName: new Field('Test') });
const codeForm = new Form({ code: new Field() }); codeForm.hidden = true;
const confirm = new Field(), restart = new Field(), timer = new Field();
const nodes = { '#registerForm': form, '#registrationCodeForm': codeForm, '#completeRegistration': confirm, '#restartRegistration': restart, '#registrationTimer': timer, '#registrationEmail': new Field() };
let now = Date.now(), interval, message, sent = 0, completed = 0, failMail = true;
class ClockDate extends Date { static now() { return now; } }
const context = vm.createContext({
    document: { querySelector: n => nodes[n] }, Date: ClockDate,
    FormData: class { constructor(f) { this.values = Object.entries(f.fields).map(([k, v]) => [k, v.value]); } [Symbol.iterator]() { return this.values[Symbol.iterator](); } },
    status: text => { message = text; }, setInterval: fn => { interval = fn; return 1; }, clearInterval() {},
    api: async (route, data) => {
        if (route === 'register') {
            if (failMail) throw Error('E-posta gönderilemedi.');
            assert.equal(data.phone, '05011111111');
            sent++;
            return { challengeId: 'test-id', expiresAt: new Date(now + 120000).toISOString(), mesaj: 'Kod gönderildi.' };
        }
        assert.equal(route, 'register/confirm');
        assert.equal(data.challengeId, 'test-id');
        if (data.code !== '123456') throw Error('Kod hatalı.');
        completed++;
        return { mesaj: 'Hesap oluşturuldu.' };
    }
});
(async () => {
    vm.runInContext(fs.readFileSync(path.join(root, 'js/registration.js'), 'utf8'), context);
    const event = { preventDefault() {} };
    await form.submit(event);
    assert.equal(form.hidden, false); assert.equal(codeForm.hidden, true); assert.equal(sent, 0);
    failMail = false;
    await form.submit(event);
    assert.equal(form.hidden, true); assert.equal(codeForm.hidden, false); assert.equal(completed, 0);
    assert.equal(form.fields.password.value, ''); assert.match(timer.textContent, /2:00/);
    codeForm.fields.code.value = '111111'; await codeForm.submit(event);
    assert.equal(completed, 0); assert.equal(codeForm.hidden, false); assert.match(message, /hatalı/);
    now += 120000; interval(); assert.equal(confirm.disabled, true);
    codeForm.fields.code.value = '123456'; await codeForm.submit(event); assert.equal(completed, 0);
    restart.onclick(); assert.equal(form.hidden, false); assert.equal(codeForm.hidden, true);
    form.fields.password.value = 'TestPassword123'; await form.submit(event);
    codeForm.fields.code.value = '123456'; await codeForm.submit(event);
    assert.equal(completed, 1); assert.equal(codeForm.hidden, true); assert.equal(form.hidden, true);
    assert.match(message, /Hesap oluşturuldu/);
    console.log('PASS: registration delivery failure, code step, 2-minute timer, wrong code, retry and completion');
})().catch(e => { console.error(e); process.exitCode = 1; });
