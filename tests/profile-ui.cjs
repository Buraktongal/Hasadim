const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '../src/Hasadim.Web/wwwroot');
const html = fs.readFileSync(path.join(root, 'html/profilim.html'), 'utf8');
assert(!html.includes('role="search"') && !html.includes('globalQuery'));
assert(html.indexOf('/js/locations.js') < html.indexOf('/js/profile.js'));
assert.match(html, /id="profileEditor"[^>]*hidden/);
assert.match(html, /select name="city"/);
assert.match(html, /select name="district"/);
class Element {
    constructor() { this.hidden = false; this.disabled = false; this.value = ''; this.children = []; this.textContent = ''; this.type = 'text'; }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children = nodes; this.value = ''; }
    add(node) { this.children.push(node); }
    setAttribute(k, v) { this[k] = v; }
    focus() { this.focused = true; }
    reset() { for (const f of Object.values(this.fields || {})) { f.value = ''; f.checked = false; } }
}
const nodes = Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(m => ['#' + m[1], new Element()]));
nodes['#profileEditor'].hidden = true;
nodes['#profileOverview'].hidden = true;
const fields = Object.fromEntries([...html.matchAll(/name="([^"]+)"/g)].map(m => [m[1], new Element()]));
fields.showPhone.type = 'checkbox';
const form = nodes['#profileForm'];
form.fields = fields; form.elements = { namedItem: name => fields[name] || null };
class FormData {
    constructor(form) { this.values = Object.entries(form.fields).filter(([, f]) => !f.disabled).map(([k, f]) => [k, f.value]); }
    [Symbol.iterator]() { return this.values[Symbol.iterator](); }
}
let profile = { id: 'owner', version: 'v1', displayName: 'Burak', accountType: 'Individual', activity: 'Producer', city: 'Antalya', district: 'Korkuteli', about: '<b>Bahçem</b>', phone: '', showPhone: true, email: 'test@example.test', emailVerified: true, completion: 80, activeListingCount: 2 };
let puts = 0, failLocations = true, failSave = false, emailRequests = 0, mailAvailable = false;
const locationData = JSON.parse(fs.readFileSync(path.join(root, 'data/iller-ilceler.json'), 'utf8'));
const context = vm.createContext({
    document: { body: { dataset: { page: 'edit' } }, querySelector: s => nodes[s] || null, createElement: () => new Element() },
    window: {}, location: { search: '', pathname: '/html/profilim.html' }, URLSearchParams, FormData, console,
    Option: class { constructor(text, value) { this.text = text; this.value = value; } },
    fetch: async (url, options = {}) => {
        if (url === '/data/iller-ilceler.json') return { ok: !failLocations, json: async () => locationData };
        if (url === '/api/csrf') return { ok: true, json: async () => ({ token: 'token' }) };
        if (url === '/api/account/me/resend-confirmation') {
            assert.equal(options.method, 'POST');
            assert.equal(options.headers['X-CSRF-TOKEN'], 'token');
            emailRequests++;
            return { ok: mailAvailable, status: mailAvailable ? 200 : 503,
                json: async () => ({ mesaj: mailAvailable ? 'Bağlantı gönderildi.' : 'E-posta gönderimi şu anda kullanılamıyor.' }) };
        }
        assert.equal(url, '/api/profiles/me');
        if (options.method === 'PUT') {
            if (failSave) return { ok: false, status: 409, json: async () => ({ mesaj: 'Sürüm değişti.' }) };
            puts++; profile = { ...profile, ...JSON.parse(options.body), version: 'v' + (puts + 1) };
        }
        return { ok: true, json: async () => ({ ...profile }) };
    }
});
const tick = () => new Promise(r => setImmediate(r));
(async () => {
    vm.runInContext(fs.readFileSync(path.join(root, 'js/locations.js'), 'utf8'), context);
    vm.runInContext(fs.readFileSync(path.join(root, 'js/profile.js'), 'utf8'), context);
    await tick();
    assert.equal(nodes['#profileOverview'].hidden, false);
    assert.equal(nodes['#profileEditor'].hidden, true);
    assert(nodes['#profileDetails'].children.some(row => row.children[1].children[0].textContent === '<b>Bahçem</b>'));
    const row = label => nodes['#profileDetails'].children.find(row => row.children[0].textContent === label).children[1];
    assert.equal(row('E-posta').children[1].textContent, 'Doğrulandı');
    assert.equal(row('E-posta').children.length, 2);
    assert(!nodes['#profileDetails'].children.some(row => row.children[0].textContent === 'E-posta doğrulaması'));
    assert.equal(row('Telefon').children[1].textContent, 'Doğrulanmadı');
    assert.equal(row('Telefon').children.at(-1).disabled, true);
    profile.emailVerified = false;
    context.nextProfile = profile;
    vm.runInContext('metadata(nextProfile)', context);
    const verifyEmail = row('E-posta').children.at(-1);
    await verifyEmail.onclick();
    assert.match(nodes['#status'].textContent, /kullanılamıyor/);
    assert.equal(verifyEmail.disabled, false);
    mailAvailable = true;
    await verifyEmail.onclick();
    assert.equal(emailRequests, 2);
    assert.match(nodes['#status'].textContent, /gönderildi/);
    assert.equal(row('E-posta').children[1].textContent, 'Doğrulanmadı');
    await nodes['#editProfile'].onclick();
    assert.equal(nodes['#profileEditor'].hidden, true);
    assert.match(nodes['#status'].textContent, /yüklenemedi/);
    assert.equal(nodes['#editProfile'].disabled, false);
    failLocations = false;
    await nodes['#editProfile'].onclick();
    assert.equal(nodes['#profileEditor'].hidden, false);
    assert.equal(fields.city.value, 'Antalya');
    assert.equal(fields.district.value, 'Korkuteli');
    assert(fields.city.children.length > 80);
    fields.city.value = 'İstanbul'; fields.city.onchange();
    assert.equal(fields.district.value, '');
    assert(fields.district.children.some(o => o.value === 'Kadıköy'));
    await form.onsubmit({ preventDefault() {} });
    assert.equal(puts, 0);
    fields.displayName.value = 'Kaydedilmedi';
    nodes['#cancelProfile'].onclick();
    assert.equal(nodes['#profileEditor'].hidden, true);
    await nodes['#editProfile'].onclick();
    assert.equal(fields.displayName.value, 'Burak');
    assert.equal(fields.city.value, 'Antalya');
    fields.displayName.value = 'Yeni ad';
    failSave = true;
    await form.onsubmit({ preventDefault() {} });
    assert.equal(nodes['#profileEditor'].hidden, false);
    assert.equal(fields.displayName.value, 'Yeni ad');
    assert.equal(nodes['#cancelProfile'].disabled, false);
    failSave = false;
    await form.onsubmit({ preventDefault() {} });
    assert.equal(puts, 1);
    assert.equal(nodes['#profileEditor'].hidden, true);
    assert.equal(nodes['#name'].textContent, 'Yeni ad');
    await nodes['#editProfile'].onclick();
    assert.equal(fields.version.value, 'v2');
    assert.equal(fields.displayName.value, 'Yeni ad');
    console.log('PASS: profile overview, edit/cancel/save, error preservation, location retry, saved selections and dependent districts');
})().catch(e => { console.error(e); process.exitCode = 1; });
