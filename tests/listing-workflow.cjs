const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');
class Node {
    constructor(tag, text = '', cls = '') {
        this.tagName = tag; this.text = text; this.className = cls;
        this.children = []; this.disabled = false; this.value = '';
    }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children = nodes; }
    setAttribute() {}
    focus() {}
    all() { return this.children.flatMap(n => [n, ...n.all()]); }
    get textContent() { return this.text + this.children.map(n => n.textContent).join(''); }
    set textContent(v) { this.text = String(v); this.children = []; }
}
const queue = new Node('div');
let calls = [], refreshed = 0;
const item = { id: 'id-1', status: 1, hidden: false, isMine: false,
    version: 'AAAAAAAAAAE=', baslik: 'Elma', listingNumber: 123, ownerName: 'Satıcı', il: 'Antalya', ilce: 'Korkuteli' };
const context = vm.createContext({
    window: {}, user: { isAdmin: true },
    document: { querySelector: s => s === '#reviewQueue' ? queue : null },
    el: (tag, text, cls) => new Node(tag, text, cls),
    button: (text, cls, handler) => { const n = new Node('button', text, cls); n.click = handler; return n; },
    api: async (url, method, body) => {
        calls.push({ url, method, body });
        return { items: [item], total: 25, pageSize: 12 };
    },
    openDetail() {}, renderDetail: async () => refreshed++, console
});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/Hasadim.Web/wwwroot/js/listing-workflow.js'), 'utf8'), context);
const workflow = context.window.ListingWorkflow;
(async () => {
    assert(workflow.editable({ isMine: true, hidden: false, status: 2 }));
    assert(!workflow.editable({ isMine: true, hidden: false, status: 1 }));
    assert(!workflow.editable({ isMine: false, hidden: false, status: 2 }));
    assert(!workflow.editable({ isMine: true, hidden: true, status: 2 }));
    const status = new Node('div');
    workflow.appendStatus(status, { ...item, status: 2, reviewNote: '<script>kontrol</script>' });
    assert(status.textContent.includes('Düzeltme bekliyor'));
    assert(status.textContent.includes('<script>kontrol</script>'));
    assert(!status.all().some(n => n.tagName === 'script'));
    const approved = new Node('div'); workflow.appendStatus(approved, { ...item, status: 3 });
    assert(approved.textContent.includes('30 günlük yayını başlatabilir'));
    const published = new Node('div');
    workflow.appendStatus(published, { ...item, status: 4,
        publishedAt: '2026-10-15T09:00:00', expiresAt: '2026-11-14T09:00:00' });
    assert(published.textContent.includes('Yayın başlangıcı:'));
    assert(published.textContent.includes('Yayın bitişi:'));
    const expired = new Node('div'); workflow.appendStatus(expired, { ...item, status: 5 });
    assert(expired.textContent.includes('Geçmiş ilanlar'));
    const legacy = new Node('div'); workflow.appendReviewActions(legacy, { ...item, status: 3 });
    assert(legacy.all().find(n => n.tagName === 'form').hidden);
    assert(legacy.textContent.includes('30 günlük yayını başlat'));
    await workflow.loadQueue(2);
    assert(calls[0].url.endsWith('page=2'));
    assert(queue.textContent.includes('2 / 3'));
    const actions = new Node('div'); workflow.appendReviewActions(actions, item);
    const form = actions.all().find(n => n.tagName === 'form');
    const note = actions.all().find(n => n.tagName === 'textarea');
    note.value = '  ';
    await form.onsubmit({ preventDefault() {} });
    assert(calls.length === 1);
    note.value = ' Konumu düzelt ';
    await form.onsubmit({ preventDefault() {} });
    assert(calls.at(-1).url.endsWith('request-changes'));
    assert.equal(calls.at(-1).body.note, 'Konumu düzelt');
    assert.equal(calls.at(-1).body.version, item.version);
    assert.equal(refreshed, 1);
    await form.onsubmit({ preventDefault() {} });
    assert.equal(calls.length, 2);
    const approveBox = new Node('div'); workflow.appendReviewActions(approveBox, item);
    await approveBox.all().find(n => n.text === 'Onayla ve yayımla').click();
    assert(calls.at(-1).url.endsWith('approve'));
    context.user = { isAdmin: false };
    const hiddenActions = new Node('div'); workflow.appendReviewActions(hiddenActions, item);
    assert.equal(hiddenActions.children.length, 0);
    const hiddenStatus = new Node('div'); workflow.appendStatus(hiddenStatus, item);
    assert.equal(hiddenStatus.children.length, 0);
    console.log('PASS: owner editing rules, status/note safety, approval explanation, paginated queue, required reason, versioned decisions, double-submit protection and admin controls');
})().catch(error => { console.error(error); process.exitCode = 1; });
