'use strict';

// Ürün takvimi (mobildeki görünümle aynı): kategori çipleri, ürün başına 12 aylık şerit.
// Hasat dönemi açık, yoğun hasat koyu renkli kesintisiz bir şerittir; içinde bulunulan ay bütün satırlarda vurgulanır.
// Ay başlıkları kaydırırken üstte sabit kalır. Bir satıra tıklayınca o ürünün (çeşidin) ilanları açılır.
(() => {
    const catalog = window.HasadimCatalog;
    const $ = s => document.querySelector(s);
    const node = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined && text !== null) n.textContent = text; if (cls) n.className = cls; return n; };
    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    const now = new Date().getMonth() + 1;
    const form = $('#calendarFilters');
    const field = name => form.elements.namedItem(name);
    const icon = (name, size) => { const s = node('span', undefined, 'cc-icon'); if (window.FruitIcons) s.append(window.FruitIcons.node(name, size)); return s; };

    function rows(category) {
        const list = [];
        for (const c of catalog.categories) {
            if (c.land || (category && c.id !== category)) continue;
            for (const product of c.products) {
                const s = catalog.seasons[product];
                if (s) list.push({ category: c, product, season: s[0], peak: s[1] });
                for (const [variety, vs] of Object.entries(catalog.varietySeasons[product] || {}))
                    list.push({ category: c, product, variety, season: vs[0], peak: vs[1] });
            }
        }
        return list;
    }

    function link(r) {
        const p = new URLSearchParams({ kategori: r.category.id, meyveTuru: r.product });
        if (r.variety) p.set('cesit', r.variety);
        return '/html/index.html?' + p;
    }

    function chips() {
        const root = $('#ccChips'); root.replaceChildren();
        const current = field('kategori').value;
        const add = (id, label, iconName) => {
            const b = node('button', undefined, 'cc-chip' + (current === id ? ' on' : ''));
            b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(current === id));
            if (iconName) b.append(icon(iconName, 18));
            b.append(node('span', label));
            b.onclick = () => {
                field('kategori').value = id;
                const url = new URL(location.href);
                if (id) url.searchParams.set('kategori', id); else url.searchParams.delete('kategori');
                history.replaceState(null, '', url.pathname + url.search);
                chips(); render();
            };
            root.append(b);
        };
        add('', 'Tümü');
        for (const c of catalog.categories) if (!c.land) add(c.id, c.short || c.name, c.icon || c.products[0]);
    }

    // Bir aydaki durum: 0 yok, 1 hasat dönemi, 2 yoğun hasat.
    const state = (r, m) => (m < 1 || m > 12 ? 0 : r.peak.includes(m) ? 2 : r.season.includes(m) ? 1 : 0);

    function track(r) {
        const t = node('span', undefined, 'cc-track');
        for (let m = 1; m <= 12; m++) {
            const st = state(r, m);
            const cell = node('span', undefined, 'cc-cell' + (m === now ? ' now' : ''));
            cell.setAttribute('role', 'cell');
            cell.setAttribute('aria-label', months[m - 1] + ': ' + (st === 2 ? 'yoğun hasat' : st === 1 ? 'hasat dönemi' : 'dönem dışı'));
            const bar = node('i', undefined, st === 2 ? 'peak' : st === 1 ? 'season' : 'off');
            // Şerit kesintisizdir: yalnızca başı ve sonu yuvarlatılır.
            if (st && !state(r, m - 1)) bar.classList.add('start');
            if (st && !state(r, m + 1)) bar.classList.add('end');
            cell.append(bar);
            t.append(cell);
        }
        return t;
    }

    function render() {
        const category = field('kategori').value;
        const query = field('ara').value.trim().toLocaleLowerCase('tr-TR');
        const list = rows(category).filter(r => !query || (r.product + ' ' + (r.variety || '')).toLocaleLowerCase('tr-TR').includes(query));
        const board = $('#calendarTable');
        board.replaceChildren();

        const head = node('div', undefined, 'cc-row cc-months');
        head.setAttribute('role', 'row');
        const corner = node('span', 'Ürün', 'cc-name'); corner.setAttribute('role', 'columnheader'); head.append(corner);
        const mt = node('span', undefined, 'cc-track');
        months.forEach((m, i) => {
            const h = node('span', undefined, 'cc-cell' + (i + 1 === now ? ' now' : ''));
            h.setAttribute('role', 'columnheader'); h.title = m;
            h.append(node('b', m.slice(0, 3), 'cc-m-long'), node('b', m.slice(0, 1), 'cc-m-short'));
            if (i + 1 === now) h.setAttribute('aria-current', 'date');
            mt.append(h);
        });
        head.append(mt);
        board.append(head);

        let group = '';
        for (const r of list) {
            if (r.category.id !== group) {
                group = r.category.id;
                const g = node('div', undefined, 'cc-group');
                g.setAttribute('role', 'row');
                g.append(icon(r.category.icon || r.category.products[0], 18), node('span', r.category.name));
                board.append(g);
            }
            const a = node('a', undefined, 'cc-row' + (r.variety ? ' variety' : ''));
            a.href = link(r);
            a.setAttribute('role', 'row');
            const name = node('span', undefined, 'cc-name');
            name.setAttribute('role', 'rowheader');
            name.append(icon(r.product, 20), node('span', r.variety || r.product, 'cc-label'));
            if (r.variety) name.querySelector('.cc-label').setAttribute('translate', 'no');
            a.append(name, track(r));
            board.append(a);
        }
        if (!list.length) board.append(node('p', 'Aramana uyan ürün yok.', 'cc-empty'));

        const chipsRoot = $('#inSeason');
        chipsRoot.replaceChildren();
        for (const r of rows(category).filter(r => !r.variety && r.peak.includes(now)).slice(0, 18)) {
            const a = node('a', undefined, 'season-chip');
            a.href = link(r);
            a.append(icon(r.product, 20), node('span', r.product));
            chipsRoot.append(a);
        }
        $('#seasonTitle').textContent = months[now - 1] + ' ayında yoğun hasatta';
    }

    field('kategori').value = new URLSearchParams(location.search).get('kategori') || '';
    form.addEventListener('input', render);
    form.onsubmit = e => { e.preventDefault(); render(); };
    chips();
    render();
})();
