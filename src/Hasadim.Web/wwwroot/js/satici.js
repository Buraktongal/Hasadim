'use strict';

// Herkese açık satıcı profili (html/satici.html).
// Üst kart (kapak, fotoğraf, rozetler, iletişim) + yan sütun (özet, hazır stok, hasat takvimi, bölge haritası, hakkında)
// + ürüne göre süzülebilen ilan kartları (fotoğraflar fareyle/kaydırarak gezilir).
(() => {
    const $ = s => document.querySelector(s);
    const node = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined && text !== null) n.textContent = text; if (cls) n.className = cls; return n; };
    const nf = new Intl.NumberFormat('tr-TR');
    const id = new URLSearchParams(location.search).get('id');
    const catalog = () => window.HasadimCatalog;
    const status = t => { $('#status').textContent = t; };
    const ACTIVITY = { Producer: 'Üretici', Buyer: 'Alıcı', Trader: 'Tüccar', Cooperative: 'Kooperatif', Other: 'Satıcı' };
    const unitName = u => ({ kg: 'kg', balya: 'balya', m2: 'm²' })[u] || 'kg';

    function ago(value) {
        const d = new Date(value); if (Number.isNaN(d.getTime())) return '';
        const days = Math.floor((Date.now() - d.getTime()) / 864e5);
        if (days < 1) return 'bugün';
        if (days < 30) return days + ' gün önce';
        if (days < 365) return Math.floor(days / 30) + ' ay önce';
        return Math.floor(days / 365) + ' yıl önce';
    }
    function amount(qty, unit) {
        if (unit === 'kg' && qty >= 1000) return nf.format(Math.round(qty / 100) / 10) + ' ton';
        if (unit === 'm2' && qty >= 1000) return nf.format(Math.round(qty / 100) / 10) + ' dönüm';
        return nf.format(qty) + ' ' + unitName(unit);
    }
    function icon(name, size) {
        const box = node('span', undefined, 'sp-fruit');
        if (window.FruitIcons) box.append(window.FruitIcons.node(name, size)); else box.textContent = '🌱';
        return box;
    }

    // ---------- Üst kart ----------
    function hero(p, listings) {
        document.title = (p.businessName || p.displayName) + ' — Hasadım';
        const avatar = $('#spAvatar');
        if (p.photoUrl) { const img = node('img'); img.src = p.photoUrl; img.alt = p.displayName; avatar.append(img); }
        else avatar.append(node('span', (p.businessName || p.displayName || 'S').trim().slice(0, 1).toLocaleUpperCase('tr-TR'), 'sp-initial'));
        $('#spName').textContent = p.businessName || p.displayName;
        $('#spName').setAttribute('translate', 'no');
        const place = [p.district, p.city].filter(Boolean).join(', ');
        $('#spSub').textContent = [p.businessName ? p.displayName : null, place || null, p.memberSince ? 'Üyelik: ' + new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(p.memberSince)) : null].filter(Boolean).join(' · ');
        $('#spCoverPlace').textContent = place ? '📍 ' + place : '';
        $('#spCoverPlace').hidden = !place;

        const badges = $('#spBadges');
        const badge = (text, cls) => badges.append(node('span', text, 'sp-badge ' + (cls || '')));
        badge(ACTIVITY[p.activity] || 'Satıcı', 'sp-badge-role');
        if (p.accountType === 'Business') badge('Kurumsal (beyan)');
        if (p.memberSince && Date.now() - new Date(p.memberSince).getTime() < 30 * 864e5) badge('Yeni üye', 'sp-badge-new');
        if (p.emailVerified) badge('✓ E-posta doğrulandı', 'sp-badge-ok');
        badge(nf.format(p.activeListingCount ?? listings.length) + ' ilan yayında');
        if (listings.some(x => isInSeason(x.meyveTuru))) badge('🌱 Şu an hasatta ürünü var', 'sp-badge-season');

        const phone = $('#spPhone');
        if (p.phone) {
            phone.hidden = false;
            phone.href = 'tel:' + p.phone.replace(/[^0-9+]/g, '');
            phone.querySelector('.sp-phone-number').textContent = p.phone;
            phone.setAttribute('aria-label', 'Satıcıyı ara: ' + p.phone);
        } else {
            phone.hidden = false;
            phone.querySelector('.sp-phone-label').textContent = 'Telefon';
            phone.removeAttribute('href');
            phone.classList.add('sp-disabled');
            phone.title = 'Satıcı numarasını gizlemiş ya da görmek için giriş yapman gerekiyor.';
            phone.setAttribute('aria-disabled', 'true');
        }
        $('#spShare').onclick = async () => {
            const url = location.origin + '/html/satici.html?id=' + encodeURIComponent(p.id);
            try {
                if (navigator.share) await navigator.share({ title: (p.businessName || p.displayName) + ' — Hasadım', url });
                else { await navigator.clipboard.writeText(url); toast('Profil bağlantısı kopyalandı.'); }
            } catch { /* kullanıcı paylaşmaktan vazgeçti */ }
        };
        $('#spMessage').onclick = () => openMessage(p, listings);
        $('#spMessage').hidden = p.isMine === true;
    }

    function toast(text) {
        const t = node('div', text, 'sp-toast'); t.setAttribute('role', 'status');
        document.body.append(t); setTimeout(() => t.remove(), 3200);
    }

    // ---------- Yan sütun ----------
    const month = new Date().getMonth() + 1;
    function isInSeason(product) { const s = catalog()?.seasons?.[product]; return Boolean(s && s[0].includes(month)); }

    function stats(p, listings) {
        $('#spStatListings').textContent = nf.format(p.activeListingCount ?? listings.length);
        $('#spStatProducts').textContent = nf.format(new Set(listings.map(x => x.meyveTuru)).size);
        const since = p.memberSince ? new Date(p.memberSince) : null;
        if (!since) { $('#spStatYears').textContent = '—'; return; }
        const months = Math.max(0, Math.round((Date.now() - since.getTime()) / (30.4 * 864e5)));
        if (months < 12) { $('#spStatYears').textContent = months < 1 ? 'Yeni' : nf.format(months); $('#spStatYearsLabel').textContent = months < 1 ? 'üye' : 'aydır üye'; }
        else { $('#spStatYears').textContent = nf.format(Math.floor(months / 12)); $('#spStatYearsLabel').textContent = 'yıldır üye'; }
    }

    // Ürün başına toplam miktar ve fiyat aralığı: toptan alıcı satıcının ne kadar malı olduğunu tek bakışta görür.
    function stock(listings) {
        const root = $('#spStock'); root.replaceChildren();
        const groups = new Map();
        for (const x of listings) {
            if (x.kategori === 'Arazi') continue;
            const key = x.meyveTuru + '|' + x.birim;
            const g = groups.get(key) || { product: x.meyveTuru, unit: x.birim, qty: 0, min: Infinity, max: 0, n: 0 };
            g.qty += Number(x.miktarKg) || 0; g.min = Math.min(g.min, x.kilogramFiyati); g.max = Math.max(g.max, x.kilogramFiyati); g.n++;
            groups.set(key, g);
        }
        const list = [...groups.values()].sort((a, b) => b.qty - a.qty).slice(0, 6);
        $('.sp-stock').hidden = !list.length;
        const tl = v => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(v);
        for (const g of list) {
            const row = node('div', undefined, 'sp-stock-row');
            const text = node('div');
            text.append(node('strong', g.product), node('span', g.min === g.max ? tl(g.min) + ' / ' + unitName(g.unit) : tl(g.min) + ' – ' + tl(g.max) + ' / ' + unitName(g.unit), 'muted'));
            row.append(icon(g.product, 26), text, node('b', amount(g.qty, g.unit), 'sp-stock-qty'));
            root.append(row);
        }
    }

    // Satıcının ürünlerinin hasat takvimi (12 ay, bu ay vurgulu).
    function seasons(listings) {
        const root = $('#spSeasons'); root.replaceChildren();
        const products = [...new Set(listings.map(x => x.meyveTuru))].filter(p => catalog()?.seasons?.[p]).slice(0, 8);
        root.closest('.sp-card').hidden = !products.length;
        if (!products.length) return;
        const head = node('div', undefined, 'sp-season-row sp-season-head');
        head.append(node('span'));
        const months = ['O', 'Ş', 'M', 'N', 'M', 'H', 'T', 'A', 'E', 'E', 'K', 'A'];
        const strip = node('span', undefined, 'sp-strip');
        months.forEach((m, i) => strip.append(node('i', m, i + 1 === month ? 'now' : '')));
        head.append(strip); root.append(head);
        for (const p of products) {
            const [season, peak] = catalog().seasons[p];
            const row = node('div', undefined, 'sp-season-row');
            const label = node('span', undefined, 'sp-season-label'); label.append(icon(p, 18), node('span', p));
            const bar = node('span', undefined, 'sp-strip');
            for (let m = 1; m <= 12; m++) bar.append(node('i', undefined, (peak.includes(m) ? 'peak' : season.includes(m) ? 'on' : '') + (m === month ? ' now' : '')));
            bar.setAttribute('aria-label', p + ': hasat ' + season.length + ' ay' + (season.includes(month) ? ', şu an hasatta' : ''));
            row.append(label, bar); root.append(row);
        }
    }

    // Türkiye haritasında satıcının ilan verdiği iller (ilan sayısına göre koyulaşır).
    function map(p, listings) {
        const root = $('#spMap'); root.replaceChildren();
        const data = window.TurkiyeIller;
        const counts = new Map();
        for (const x of listings) counts.set(x.il, (counts.get(x.il) || 0) + 1);
        if (!counts.size && p.city) counts.set(p.city, 0);
        root.closest('.sp-card').hidden = !data || !counts.size;
        if (!data || !counts.size) return;
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('viewBox', `0 0 ${data.width} ${data.height}`);
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', 'İlanların bulunduğu iller: ' + [...counts.keys()].join(', '));
        const max = Math.max(1, ...counts.values());
        for (const [name, d] of data.iller) {
            const path = document.createElementNS(ns, 'path');
            path.setAttribute('d', d);
            const c = counts.get(name);
            path.setAttribute('class', c === undefined ? 'sp-il' : 'sp-il on' + (c / max > .6 ? ' hi' : ''));
            const title = document.createElementNS(ns, 'title'); title.textContent = name + (c ? ' · ' + c + ' ilan' : '');
            path.append(title); svg.append(path);
        }
        root.append(svg);
        $('#spMapList').textContent = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([il, n]) => n ? il + ' (' + n + ')' : il).join(' · ');
    }

    function about(p) {
        $('#spAbout').textContent = p.about || 'Satıcı henüz tanıtım bilgisi eklememiş.';
        $('#spAbout').classList.toggle('muted', !p.about);
        if (p.about) $('#spAbout').setAttribute('translate', 'no');
        const facts = $('#spFacts'); facts.replaceChildren();
        const add = (k, v) => { if (v) facts.append(node('dt', k), node('dd', v)); };
        add('Faaliyet', ACTIVITY[p.activity]);
        add('Hesap türü', p.accountType === 'Business' ? 'Kurumsal (kullanıcı beyanı)' : 'Bireysel');
        add('Konum', [p.city, p.district].filter(Boolean).join(' / '));
    }

    // ---------- İlan kartları ----------
    let all = [], filter = '', shown = 12;
    function chips() {
        const root = $('#spChips'); root.replaceChildren();
        const counts = new Map();
        for (const x of all) counts.set(x.meyveTuru, (counts.get(x.meyveTuru) || 0) + 1);
        const add = (value, label, n) => {
            const b = node('button', undefined, 'sp-chip' + (filter === value ? ' on' : ''));
            b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(filter === value));
            if (value) b.append(icon(value, 16));
            b.append(node('span', label + (n !== undefined ? ' (' + n + ')' : '')));
            b.onclick = () => { filter = value; shown = 12; chips(); cards(); };
            root.append(b);
        };
        add('', 'Tümü');
        [...counts.entries()].sort((a, b) => b[1] - a[1]).forEach(([p, n]) => add(p, p, n));
        root.hidden = counts.size < 2;
    }

    function card(x) {
        const a = node('a', undefined, 'sp-item');
        a.href = '/html/ilan.html?id=' + encodeURIComponent(x.id) + '&seller=' + encodeURIComponent(id);
        const media = node('div', undefined, 'sp-item-media');
        if (x.photoUrl) {
            const img = node('img'); img.src = x.photoUrl; img.alt = x.baslik; img.loading = 'lazy';
            media.append(img);
            window.CardPhotos?.attach(media, img, x.photos);
        } else media.append(icon(x.meyveTuru, 64));
        const cat = catalog()?.category?.(x.kategori);
        media.append(node('span', cat?.short || x.kategori, 'sp-item-cat'));
        if (isInSeason(x.meyveTuru) && x.kategori !== 'Arazi') media.append(node('span', 'Hasat döneminde', 'sp-item-season'));
        const body = node('div', undefined, 'sp-item-body');
        body.append(node('span', (x.meyveTuru + (x.cesit ? ' · ' + x.cesit : '')).toLocaleUpperCase('tr-TR'), 'sp-item-tag'));
        const title = node('h3', x.baslik); title.setAttribute('translate', 'no');
        body.append(title);
        body.append(node('p', '📍 ' + [x.ilce, x.il].filter(Boolean).join(', ') + ' · ' + ago(x.publishedAt || x.olusturulmaTarihi) + ' · 👁 ' + nf.format(x.viewCount || 0), 'sp-item-meta'));
        const foot = node('div', undefined, 'sp-item-foot');
        foot.append(window.MarketPresentation.price(x));
        if (x.kategori !== 'Arazi') foot.append(node('span', amount(x.miktarKg, x.birim), 'sp-item-qty'));
        body.append(foot);
        a.append(media, body);
        return a;
    }

    function cards() {
        const list = all.filter(x => !filter || x.meyveTuru === filter);
        const root = $('#spListings'); root.replaceChildren();
        $('#spListingsCount').textContent = '(' + nf.format(all.length) + ')';
        if (!list.length) root.append(node('p', 'Bu satıcının şu an yayında ilanı yok.', 'sp-empty'));
        list.slice(0, shown).forEach(x => root.append(card(x)));
        $('#spMore').hidden = list.length <= shown;
        $('#spMore').onclick = () => { shown += 12; cards(); };
    }

    // ---------- Mesaj ----------
    function openMessage(p, listings) {
        const api = window.HasadimApi;
        const d = $('#spMessageDialog'), f = $('#spMessageForm'), err = f.querySelector('.form-error');
        const select = f.elements.listingId;
        select.replaceChildren(...listings.map(x => new Option(x.baslik + ' (' + x.meyveTuru + ')', x.id)));
        if (!listings.length) { toast('Mesaj göndermek için satıcının yayında bir ilanı olmalı.'); return; }
        f.elements.body.value = 'Merhaba, Hasadım’daki profilinizi gördüm. Bu ilanla ilgileniyorum.';
        err.textContent = '';
        f.onsubmit = async e => {
            e.preventDefault();
            const b = f.querySelector('[type=submit]'); b.disabled = true; err.textContent = '';
            try {
                await api('/api/messages', 'POST', { listingId: select.value, recipientId: p.id, body: f.elements.body.value.trim() });
                d.close(); toast('Mesajın gönderildi. Yanıtı Mesajlar bölümünde görürsün.');
            } catch (x) {
                if (x.status === 401) { location.href = api.loginUrl(); return; }
                err.textContent = x.message;
            } finally { b.disabled = false; }
        };
        for (const c of d.querySelectorAll('[data-close]')) c.onclick = () => d.close();
        d.showModal();
        f.elements.body.focus();
    }

    // ---------- Açılış ----------
    async function load() {
        if (!/^[0-9a-f-]{36}$/i.test(id || '')) throw Error('Satıcı bağlantısı geçersiz.');
        const api = window.HasadimApi;
        const p = await api('/api/profiles/' + id);
        const items = [];
        for (let page = 1; page <= 4; page++) {
            const data = await api('/api/meyve-ilanlari?ownerId=' + encodeURIComponent(id) + '&pageSize=100&page=' + page);
            items.push(...data.items);
            if (page * data.pageSize >= data.total) break;
        }
        all = items;
        await window.layoutReady?.catch(() => { });
        window.setBreadcrumbs?.([{ label: 'Ana sayfa', href: '/' }, { label: 'Satıcılar' }, { label: p.businessName || p.displayName }]);
        hero(p, all); stats(p, all); stock(all); seasons(all); map(p, all); about(p); chips(); cards();
        document.querySelector('.sp-hero').hidden = false;
        document.querySelector('.sp-grid').hidden = false;
        status('');
    }
    status('Yükleniyor…');
    const run = load().catch(e => status(e.message));
    window.HasadimLoading?.track?.(run);
})();
