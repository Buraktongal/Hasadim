'use strict';

// Hesap merkezi sayfaları: Tekliflerim, Bildirimler, Kayıtlı aramalar, Engellenen üyeler.
(() => {
    const api = window.HasadimApi;
    const $ = s => document.querySelector(s);
    const page = document.body.dataset.page;
    const node = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
    const button = (text, cls, fn) => { const b = node('button', text, cls); b.type = 'button'; b.onclick = fn; return b; };
    const money = (v, digits = 2) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);
    const number = v => new Intl.NumberFormat('tr-TR').format(v);
    const unitOf = u => ({ kg: 'kg', balya: 'balya', m2: 'm²' })[u] || 'kg';
    const when = value => {
        const d = new Date(/(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : value + 'Z');
        const minutes = Math.round((Date.now() - d) / 60000);
        if (minutes < 1) return 'az önce';
        if (minutes < 60) return minutes + ' dk önce';
        if (minutes < 1440) return Math.round(minutes / 60) + ' saat önce';
        return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(d);
    };
    let toastTimer;
    const toast = text => { const t = $('#toast'); if (!t) return; t.textContent = text; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 5000); };
    const status = text => { const s = $('#centerStatus'); if (s) { s.textContent = text; s.hidden = !text; } };
    const confirmAction = (message, options) => window.HasadimConfirm ? window.HasadimConfirm(message, options) : Promise.resolve(confirm(message));
    const empty = (root, title, text, link) => {
        const box = node('div', undefined, 'empty');
        box.append(node('strong', title), node('p', text));
        if (link) { const a = node('a', link[1], 'primary'); a.href = link[0]; box.append(a); }
        root.replaceChildren(box);
    };
    const handle = error => {
        if (error.status === 401) { location.href = api.loginUrl(); return; }
        status(error.message);
    };

    // ---- Tekliflerim ----
    const offerStates = ['Yanıt bekliyor', 'Kabul edildi', 'Reddedildi', 'Geri çekildi'];
    async function offers() {
        const box = new URLSearchParams(location.search).get('kutu') === 'giden' ? 'giden' : 'gelen';
        for (const tab of document.querySelectorAll('[data-box]')) {
            if (tab.dataset.box === box) tab.setAttribute('aria-current', 'page'); else tab.removeAttribute('aria-current');
        }
        const root = $('#offerList');
        let pageNo = 1;
        async function load(append = false) {
            status(append ? '' : 'Teklifler yükleniyor…');
            try {
                const data = await api('/api/offers?kutu=' + box + '&page=' + pageNo);
                if (!append) root.replaceChildren();
                status('');
                if (!data.items.length && !append) {
                    empty(root, box === 'gelen' ? 'Henüz teklif almadın' : 'Henüz teklif vermedin',
                        box === 'gelen' ? 'Alıcılar ilanlarına teklif verdiğinde burada görünür.' : 'Beğendiğin bir ilanın detayında “Teklif ver” düğmesini kullanabilirsin.',
                        box === 'gelen' ? null : ['/', 'İlanlara göz at']);
                }
                for (const o of data.items) root.append(offerCard(o, () => { pageNo = 1; void load(); }));
                $('#centerMore').hidden = data.items.length < 30;
            } catch (e) { handle(e); }
        }
        $('#centerMore').onclick = () => { pageNo++; void load(true); };
        await load();
    }

    function offerCard(o, reload) {
        const land = o.kategori === 'Arazi';
        const u = unitOf(o.birim);
        const card = node('article', undefined, 'center-card offer-card status-' + o.status);
        const head = node('div', undefined, 'center-card-head');
        const link = node('a', o.listingTitle, 'center-title');
        link.setAttribute('translate', 'no');
        link.href = '/html/ilan.html?id=' + encodeURIComponent(o.listingId);
        head.append(link, node('span', offerStates[o.status] || '', 'state-pill state-' + o.status));
        const who = o.sent ? 'Satıcı: ' + o.sellerName : 'Alıcı: ' + o.buyerName;
        const facts = node('dl', undefined, 'offer-facts');
        const add = (label, value, cls) => { const d = node('div', undefined, cls); d.append(node('dt', label), node('dd', value)); facts.append(d); };
        add('Teklif', money(o.amount, land ? 0 : 2) + (land ? '' : ' / ' + u), 'offer-amount');
        add('İlan fiyatı', money(o.listingPrice, land ? 0 : 2) + (land ? '' : ' / ' + u));
        if (o.quantity) { add('Miktar', number(o.quantity) + ' ' + u); add('Toplam', money(o.amount * o.quantity)); }
        const diff = o.listingPrice ? Math.round((o.amount - o.listingPrice) / o.listingPrice * 1000) / 10 : 0;
        if (diff) add('Fark', '%' + number(Math.abs(diff)) + (diff < 0 ? ' düşük' : ' yüksek'));
        card.append(head, node('p', who + ' · İlan No: ' + o.listingNumber + ' · ' + when(o.createdAt), 'muted'), facts);
        if (o.note) { const note = node('p', '“' + o.note + '”', 'offer-note'); note.setAttribute('translate', 'no'); card.append(note); }
        if (o.reply) card.append(node('p', 'Satıcının yanıtı: ' + o.reply, 'offer-reply'));
        const actions = node('div', undefined, 'actions');
        if (!o.sent && o.status === 0) {
            const reply = node('input');
            reply.maxLength = 500; reply.placeholder = 'Alıcıya kısa bir not (isteğe bağlı)';
            reply.setAttribute('aria-label', 'Alıcıya not');
            const respond = accept => async () => {
                const ok = await confirmAction(accept ? 'Teklif kabul edilecek ve alıcıya bildirilecek. Satışı mesajlaşarak tamamlayabilirsiniz.' : 'Teklif reddedilecek ve alıcıya bildirilecek.',
                    { title: accept ? 'Teklif kabul edilsin mi?' : 'Teklif reddedilsin mi?', okText: accept ? 'Kabul et' : 'Reddet', danger: !accept });
                if (!ok) return;
                try { const r = await api('/api/offers/' + o.id + (accept ? '/accept' : '/reject'), 'POST', { reply: reply.value.trim() || null }); toast(r?.mesaj || 'Yanıt gönderildi.'); reload(); void window.NotificationBell?.refresh(); }
                catch (e) { toast(e.message); }
            };
            actions.append(reply, button('Kabul et', 'primary', respond(true)), button('Reddet', 'secondary', respond(false)));
        }
        if (o.sent && o.status === 0) {
            actions.append(button('Teklifi geri çek', 'secondary', async () => {
                if (!await confirmAction('Teklifin geri çekilecek ve satıcıya bildirilecek.', { title: 'Teklif geri çekilsin mi?', okText: 'Geri çek', danger: true })) return;
                try { const r = await api('/api/offers/' + o.id + '/withdraw', 'POST'); toast(r?.mesaj || 'Teklif geri çekildi.'); reload(); }
                catch (e) { toast(e.message); }
            }));
        }
        if (o.status === 1) {
            const chat = node('a', o.sent ? 'Satıcıyla mesajlaş' : 'Alıcıyla mesajlaş', 'secondary');
            chat.href = o.sent ? '/html/ilan.html?id=' + encodeURIComponent(o.listingId) : '/?view=messages';
            actions.append(chat);
        }
        if (actions.children.length) card.append(actions);
        return card;
    }

    // ---- Bildirimler ----
    const kindIcons = { message: '✉', 'offer-received': '₺', 'offer-accepted': '✓', 'offer-rejected': '×', 'offer-withdrawn': '↩', 'price-drop': '↓', 'saved-search': '☆' };
    async function notifications() {
        const root = $('#notificationList');
        let pageNo = 1;
        async function load(append = false) {
            try {
                const data = await api('/api/notifications?page=' + pageNo);
                if (!append) root.replaceChildren();
                status('');
                if (!data.items.length && !append) empty(root, 'Bildirimin yok', 'Teklif, mesaj, kayıtlı arama ve fiyat düşüşü bildirimlerin burada görünür.');
                for (const n of data.items) root.append(notificationCard(n));
                $('#centerMore').hidden = !data.hasMore;
            } catch (e) { handle(e); }
        }
        $('#centerMore').onclick = () => { pageNo++; void load(true); };
        $('#readAll').onclick = async () => {
            try { await api('/api/notifications/read', 'POST'); for (const c of root.querySelectorAll('.unread')) c.classList.remove('unread'); void window.NotificationBell?.refresh(); toast('Tüm bildirimler okundu.'); }
            catch (e) { toast(e.message); }
        };
        await load();
    }

    // İngilizce arayüzde bildirim metni, bildirimdeki değerlerden yeniden yazılır.
    function localizedBody(n) {
        if (window.HasadimI18n?.lang() !== 'en' || !n.data) return null;
        let d;
        try { d = JSON.parse(n.data); } catch { return null; }
        const price = (v, u) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TRY' }).format(v) + (u === 'm2' ? '' : u === 'balya' ? '/bale' : '/kg');
        switch (n.kind) {
            case 'message': return `You have a new message about “${d.listing}”.`;
            case 'offer-received': return `New offer of ${price(d.amount, d.unit)} on “${d.listing}”.`;
            case 'offer-accepted': return `Your ${price(d.amount, d.unit)} offer on “${d.listing}” was accepted.`;
            case 'offer-rejected': return `Your ${price(d.amount, d.unit)} offer on “${d.listing}” was rejected.`;
            case 'offer-withdrawn': return `The ${price(d.amount, d.unit)} offer on “${d.listing}” was withdrawn.`;
            case 'price-drop': return `“${d.listing}” in your favorites dropped from ${price(d.oldPrice, d.unit)} to ${price(d.newPrice, d.unit)}.`;
            case 'saved-search': return `“${d.listing}” just went live and matches your saved search.`;
            default: return null;
        }
    }

    function notificationCard(n) {
        const card = node('article', undefined, 'center-card notification-card kind-' + n.kind + (n.readAt ? '' : ' unread'));
        const icon = node('span', kindIcons[n.kind] || '•', 'notification-icon');
        icon.setAttribute('aria-hidden', 'true');
        const body = node('div', undefined, 'notification-body');
        const title = n.link ? node('a', n.title, 'center-title') : node('strong', n.title, 'center-title');
        if (n.link) title.href = n.link;
        const english = localizedBody(n);
        const text = node('p', english ?? n.body);
        text.setAttribute('translate', 'no');
        body.append(title, text, node('small', when(n.createdAt), 'muted'));
        const remove = button('×', 'icon-button', async () => {
            try { await api('/api/notifications/' + n.id, 'DELETE'); card.remove(); void window.NotificationBell?.refresh(); }
            catch (e) { toast(e.message); }
        });
        remove.setAttribute('aria-label', 'Bildirimi sil');
        card.append(icon, body, remove);
        const markRead = async () => {
            if (n.readAt) return;
            n.readAt = new Date().toISOString();
            card.classList.remove('unread');
            try { await api('/api/notifications/' + n.id + '/read', 'POST'); void window.NotificationBell?.refresh(); } catch { }
        };
        title.addEventListener('click', markRead);
        card.addEventListener('click', event => { if (!event.target.closest('button')) void markRead(); });
        return card;
    }

    // ---- Kayıtlı aramalar ----
    const filterLabels = { kategori: 'Kategori', meyveTuru: 'Ürün', cesit: 'Çeşit', il: 'İl', ilce: 'İlçe', minFiyat: 'En az fiyat', maxFiyat: 'En çok fiyat', minMiktar: 'En az miktar', maxMiktar: 'En çok miktar', ambalaj: 'Ambalaj', teslimat: 'Teslimat', imarDurumu: 'İmar', tapuDurumu: 'Tapu', q: 'Kelime', sort: 'Sıralama' };
    const sortLabels = { priceAsc: 'Fiyat artan', priceDesc: 'Fiyat azalan', qtyDesc: 'Miktar çoktan aza', qtyAsc: 'Miktar azdan çoğa' };
    async function savedSearches() {
        const root = $('#savedList');
        async function load() {
            try {
                const items = await api('/api/saved-searches');
                status('');
                root.replaceChildren();
                if (!items.length) { empty(root, 'Kayıtlı araman yok', 'Pazar yerinde filtre seçip “Bu aramayı kaydet” düğmesine bas.', ['/', 'Pazar yerine git']); return; }
                for (const s of items) {
                    const card = node('article', undefined, 'center-card saved-card');
                    const head = node('div', undefined, 'center-card-head');
                    const link = node('a', s.name, 'center-title');
                    link.href = '/html/index.html' + (s.query ? '?' + s.query : '');
                    head.append(link);
                    const chips = node('div', undefined, 'card-badges');
                    for (const [key, value] of new URLSearchParams(s.query)) {
                        const shown = key === 'kategori' ? window.HasadimCatalog?.category(value)?.name || value : key === 'sort' ? sortLabels[value] || value : value;
                        chips.append(node('span', (filterLabels[key] || key) + ': ' + shown, 'badge'));
                    }
                    if (!chips.children.length) chips.append(node('span', 'Tüm ilanlar', 'badge'));
                    const toggle = node('label', undefined, 'switch-row compact');
                    const check = node('input');
                    check.type = 'checkbox'; check.checked = s.notify; check.setAttribute('role', 'switch');
                    toggle.append(node('span', 'Yeni ilan bildirimi'), check);
                    check.onchange = async () => {
                        try { await api('/api/saved-searches/' + s.id + '/notify?on=' + check.checked, 'POST'); toast(check.checked ? 'Bildirim açıldı.' : 'Bildirim kapatıldı.'); }
                        catch (e) { check.checked = !check.checked; toast(e.message); }
                    };
                    const actions = node('div', undefined, 'actions');
                    const open = node('a', 'İlanları göster', 'secondary');
                    open.href = link.href;
                    actions.append(open, toggle, button('Sil', 'textbtn danger-text', async () => {
                        if (!await confirmAction('“' + s.name + '” araması silinecek.', { title: 'Kayıtlı arama silinsin mi?', okText: 'Sil', danger: true })) return;
                        try { await api('/api/saved-searches/' + s.id, 'DELETE'); void load(); } catch (e) { toast(e.message); }
                    }));
                    card.append(head, chips, node('small', 'Kaydedildi: ' + when(s.createdAt), 'muted'), actions);
                    root.append(card);
                }
            } catch (e) { handle(e); }
        }
        await load();
    }

    // ---- Engellenen üyeler ----
    async function blocks() {
        const root = $('#blockList');
        async function load() {
            try {
                const items = await api('/api/blocks');
                status('');
                root.replaceChildren();
                if (!items.length) { empty(root, 'Engellediğin üye yok', 'Rahatsız edici bir satıcı veya alıcıyı ilan detayından engelleyebilirsin.'); return; }
                for (const b of items) {
                    const card = node('article', undefined, 'center-card block-card');
                    const initial = node('span', (b.displayName || '?').trim().slice(0, 1).toLocaleUpperCase('tr-TR'), 'seller-initial');
                    initial.setAttribute('aria-hidden', 'true');
                    const info = node('div');
                    info.append(node('strong', b.displayName), node('small', 'Engellendi: ' + when(b.createdAt), 'muted'));
                    card.append(initial, info, button('Engeli kaldır', 'secondary', async () => {
                        if (!await confirmAction(b.displayName + ' adlı üyenin engeli kaldırılacak.', { title: 'Engel kaldırılsın mı?', okText: 'Engeli kaldır' })) return;
                        try { const r = await api('/api/blocks/' + b.userId, 'DELETE'); toast(r?.mesaj || 'Engel kaldırıldı.'); void load(); } catch (e) { toast(e.message); }
                    }));
                    root.append(card);
                }
            } catch (e) { handle(e); }
        }
        await load();
    }

    const pages = { offers, notifications, 'saved-searches': savedSearches, blocks };
    if (pages[page]) void pages[page]();
})();
