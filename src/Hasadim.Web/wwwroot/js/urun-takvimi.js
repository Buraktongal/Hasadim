'use strict';

// Ürün takvimi: hangi ürünün hangi aylarda hasat edildiği / piyasada bulunduğu.
(() => {
    const catalog = window.HasadimCatalog;
    const $ = s => document.querySelector(s);
    const node = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    const now = new Date().getMonth() + 1;
    const form = $('#calendarFilters');

    function rows(category) {
        const list = [];
        for (const c of catalog.categories) {
            if (c.land || (category && c.id !== category)) continue;
            for (const product of c.products) {
                const s = catalog.seasons[product];
                if (!s) continue;
                list.push({ category: c, product, season: s[0], peak: s[1] });
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

    function render() {
        const category = form.elements.namedItem('kategori').value;
        const query = form.elements.namedItem('ara').value.trim().toLocaleLowerCase('tr-TR');
        const list = rows(category).filter(r => !query || (r.product + ' ' + (r.variety || '')).toLocaleLowerCase('tr-TR').includes(query));
        const table = $('#calendarTable');
        table.replaceChildren();
        const head = node('thead');
        const hr = node('tr');
        hr.append(node('th', 'Ürün'));
        months.forEach((m, i) => { const th = node('th', m, i + 1 === now ? 'this-month' : ''); th.scope = 'col'; if (i + 1 === now) th.setAttribute('aria-current', 'date'); hr.append(th); });
        head.append(hr);
        table.append(head);
        const body = node('tbody');
        let group = '';
        for (const r of list) {
            if (r.category.id !== group) {
                group = r.category.id;
                const tr = node('tr', undefined, 'group-row');
                const th = node('th');
                th.append(node('span', r.category.name, 'group-label'));
                th.colSpan = 13;
                tr.append(th);
                body.append(tr);
            }
            const tr = node('tr');
            const name = node('th', undefined, 'product-cell');
            name.scope = 'row';
            if (window.FruitIcons) name.append(window.FruitIcons.node(r.product, 22));
            const a = node('a', r.variety ? r.variety : r.product);
            a.href = link(r);
            if (r.variety) { name.classList.add('variety-row'); a.setAttribute('translate', 'no'); }
            name.append(a);
            tr.append(name);
            for (let m = 1; m <= 12; m++) {
                const peak = r.peak.includes(m), on = r.season.includes(m);
                const td = node('td', undefined, (peak ? 'peak' : on ? 'season' : '') + (m === now ? ' this-month' : ''));
                td.setAttribute('aria-label', months[m - 1] + ': ' + (peak ? 'yoğun hasat' : on ? 'hasat dönemi' : 'dönem dışı'));
                if (peak || on) td.append(node('span', peak ? '●' : '', 'sr-hidden'));
                tr.append(td);
            }
            body.append(tr);
        }
        if (!list.length) {
            const tr = node('tr'); const td = node('td', 'Aramana uyan ürün yok.', 'muted'); td.colSpan = 13; tr.append(td); body.append(tr);
        }
        table.append(body);
        const chips = $('#inSeason');
        chips.replaceChildren();
        for (const r of rows(category).filter(r => !r.variety && r.peak.includes(now)).slice(0, 18)) {
            const a = node('a', undefined, 'season-chip');
            a.href = link(r);
            if (window.FruitIcons) a.append(window.FruitIcons.node(r.product, 20));
            a.append(node('span', r.product));
            chips.append(a);
        }
        $('#seasonTitle').textContent = months[now - 1] + ' ayında yoğun hasatta';
        // Dar ekranda tablo, bu ay görünecek şekilde kendiliğinden kaydırılır.
        const scroller = $('.calendar-scroll');
        const current = table.querySelector('thead th.this-month');
        if (scroller && current && scroller.scrollWidth > scroller.clientWidth) {
            const sticky = table.querySelector('thead th')?.offsetWidth || 0;
            scroller.scrollLeft = Math.max(0, current.offsetLeft - sticky - (scroller.clientWidth - sticky) / 2 + current.offsetWidth / 2);
        }
    }

    const params = new URLSearchParams(location.search);
    form.elements.namedItem('kategori').value = params.get('kategori') || '';
    form.addEventListener('input', render);
    form.addEventListener('change', render);
    form.onsubmit = e => { e.preventDefault(); render(); };
    render();
})();
