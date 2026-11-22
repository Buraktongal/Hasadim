'use strict';

// Harita sayfası: il sınırlarıyla çizilmiş Türkiye haritası (renk ilan yoğunluğu) ve
// İl haritası (ilan yoğunluğu). Veri: /api/meyve-ilanlari/harita
(() => {
    const api = window.HasadimApi;
    const $ = s => document.querySelector(s);
    const node = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
    const number = v => new Intl.NumberFormat('tr-TR').format(v);
    const unit = u => ({ kg: 'kg', balya: 'balya', m2: 'm²' })[u] || 'kg';
    const price = p => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: p.kategori === 'Arazi' ? 0 : 2, maximumFractionDigits: p.kategori === 'Arazi' ? 0 : 2 }).format(p.kilogramFiyati) + (p.kategori === 'Arazi' ? '' : ' / ' + unit(p.birim));
    let data = { iller: [], noktalar: [] };
    let request = 0;

    const form = $('#mapFilters');
    const params = new URLSearchParams(location.search);

    function query() {
        const p = new URLSearchParams();
        for (const key of ['kategori', 'meyveTuru']) { const v = form.elements.namedItem(key).value; if (v) p.set(key, v); }
        return p;
    }

    function marketLink(extra = {}) {
        const p = query();
        for (const [k, v] of Object.entries(extra)) if (v) p.set(k, v);
        return '/html/index.html' + (p.size ? '?' + p : '');
    }

    const SVG = 'http://www.w3.org/2000/svg';
    const svgNode = (tag, attrs = {}, text) => {
        const n = document.createElementNS(SVG, tag);
        for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
        if (text !== undefined) n.textContent = text;
        return n;
    };
    const shapes = new Map();   // il → { group, path }
    let selected = '';

    // İlin ilanlarındaki en çok geçen ürünler (harita noktalarından).
    function productsOf(city) {
        const counts = new Map();
        for (const p of data.noktalar) if (p.il === city) counts.set(p.meyveTuru, (counts.get(p.meyveTuru) || 0) + 1);
        return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 4);
    }

    function showInfo(city) {
        const box = $('#cityInfo');
        box.replaceChildren();
        if (!city) {
            box.append(node('p', 'Haritada bir ile dokun; o ildeki ilan sayısını ve ürünleri burada gör.', 'muted city-info-hint'));
            return;
        }
        const count = data.iller.find(x => x.il === city)?.count || 0;
        const head = node('div', undefined, 'city-info-head');
        head.append(node('strong', city, 'city-info-name'), node('span', count ? number(count) + ' ilan' : 'İlan yok', 'city-info-count' + (count ? '' : ' empty')));
        box.append(head);
        const products = productsOf(city);
        if (products.length) {
            const list = node('ul', undefined, 'city-info-products');
            for (const [name, n] of products) {
                const li = node('li');
                if (window.FruitIcons) li.append(window.FruitIcons.node(name, 18));
                li.append(node('span', name), node('small', String(n)));
                list.append(li);
            }
            box.append(list);
        }
        if (count) {
            const go = node('a', city + ' ilanlarını gör →', 'primary city-info-go');
            go.href = marketLink({ il: city });
            box.append(go);
        } else box.append(node('p', 'Bu seçimde ' + city + ' için yayında ilan yok.', 'muted'));
    }

    function select(city, focus = false) {
        if (selected) shapes.get(selected)?.group.classList.remove('is-selected');
        selected = city;
        const shape = shapes.get(city);
        if (shape) {
            shape.group.classList.add('is-selected');
            shape.group.parentNode.append(shape.group);   // seçili il sınırı üstte çizilsin
            if (focus) {
                shape.group.focus({ preventScroll: true });
                shape.group.scrollIntoView?.({ block: 'nearest', inline: 'center', behavior: 'smooth' });
            }
        }
        showInfo(city);
    }

    // Üzerine gelinen ilin adı ve ilan sayısı (adı haritaya sığmayan iller dahil).
    let tooltip = null;
    function tip(city, event) {
        const root = $('#cityMap');
        if (!tooltip) {
            tooltip = node('div', undefined, 'tr-tooltip');
            tooltip.setAttribute('aria-hidden', 'true');
            tooltip.hidden = true;
            root.append(tooltip);
        }
        if (!city) { tooltip.hidden = true; return; }
        const count = data.iller.find(x => x.il === city)?.count || 0;
        tooltip.replaceChildren(node('strong', city), node('span', count ? number(count) + ' ilan' : 'İlan yok'));
        tooltip.hidden = false;
        const box = root.getBoundingClientRect();
        let x, y;
        if (event && event.clientX !== undefined) { x = event.clientX - box.left + root.scrollLeft; y = event.clientY - box.top; }
        else {
            const r = shapes.get(city).path.getBoundingClientRect();
            x = r.left + r.width / 2 - box.left + root.scrollLeft; y = r.top + r.height / 2 - box.top;
        }
        // Kenarlarda taşmasın.
        const w = tooltip.offsetWidth, h = tooltip.offsetHeight;
        const left = Math.max(root.scrollLeft + 4, Math.min(x - w / 2, root.scrollLeft + root.clientWidth - w - 4));
        const top = y - h - 14 < 4 ? y + 18 : y - h - 14;
        tooltip.style.transform = 'translate(' + Math.round(left) + 'px, ' + Math.round(top) + 'px)';
    }

    function buildMap() {
        const geo = window.TurkiyeIller;
        const root = $('#cityMap');
        if (!geo || !root || shapes.size) return;
        const svg = svgNode('svg', { viewBox: '0 0 ' + geo.width + ' ' + geo.height, class: 'tr-map-svg', role: 'group', 'aria-label': 'Türkiye il haritası' });
        const provinces = svgNode('g', { class: 'tr-provinces' });
        const labels = svgNode('g', { class: 'tr-labels', 'aria-hidden': 'true' });
        for (const [city, d, lx, ly, room] of [...geo.iller].sort((a, b) => b[4] - a[4])) {
            const group = svgNode('g', { class: 'tr-il', tabindex: '0', role: 'button', 'data-il': city });
            const path = svgNode('path', { d, 'fill-rule': 'evenodd' });
            const title = svgNode('title', {}, city);
            group.append(title, path);
            group.addEventListener('click', () => select(city));
            group.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(city); } });
            group.addEventListener('pointerenter', e => { group.classList.add('is-hover'); tip(city, e); });
            group.addEventListener('pointermove', e => tip(city, e));
            group.addEventListener('pointerleave', () => { group.classList.remove('is-hover'); tip(); });
            group.addEventListener('focus', () => tip(city));
            group.addEventListener('blur', () => tip());
            provinces.append(group);
            // İl adı sığıyorsa (veya ilde ilan varsa) yazılır; diğerlerinin adı üzerine gelince görünür.
            const fits = room * 2.5 >= city.length * 4.6;
            const label = svgNode('g', { class: 'tr-label', transform: 'translate(' + lx + ' ' + ly + ')' });
            label.append(svgNode('text', { class: 'tr-name', y: '-2' }, city));
            const badge = svgNode('g', { class: 'tr-badge', transform: 'translate(0 8)' });
            badge.append(svgNode('rect', { x: '-9', y: '-6', width: '18', height: '12', rx: '6' }), svgNode('text', { y: '0.5' }));
            label.append(badge);
            labels.append(label);
            shapes.set(city, { group, path, title, label, badge, room, fits });
        }
        svg.append(provinces, labels);
        root.replaceChildren(svg);
        // Telefonda harita yana kayar; ilk açılışta ortadan başlasın.
        setTimeout(() => { root.scrollLeft = (root.scrollWidth - root.clientWidth) / 2; });
    }

    // Komşu illerin adları üst üste binerse adı gizlenir (üzerine gelince görünür).
    // Öncelik: ilanı olan iller, sonra büyük iller.
    let nameBoxes = null;
    function declutter() {
        if (!shapes.size || $('#cityPanel').hidden) return;
        if (!nameBoxes) {
            const list = [];
            try {
                for (const [city, s] of shapes) {
                    const n = s.label.querySelector('.tr-name');
                    if (!n) continue;
                    const box = n.getBBox(), m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(s.label.getAttribute('transform'));
                    list.push({ city, n, s, x: box.x + +m[1] - 1, y: box.y + +m[2] - 1, w: box.width + 2, h: box.height + 2 });
                }
            } catch { return; }
            if (!list.some(b => b.w > 2)) return;
            nameBoxes = list;
        }
        const counts = new Map(data.iller.map(x => [x.il, x.count]));
        const order = [...nameBoxes].sort((a, b) => ((counts.get(b.city) ? 1 : 0) - (counts.get(a.city) ? 1 : 0)) || (b.s.room - a.s.room));
        const shown = [];
        for (const b of order) {
            const clash = !(b.s.fits || counts.get(b.city)) || shown.some(o => b.x < o.x + o.w && o.x < b.x + b.w && b.y < o.y + o.h && o.y < b.y + b.h);
            b.n.setAttribute('visibility', clash ? 'hidden' : 'visible');
            b.s.label.classList.toggle('compact', clash);
            if (clash) b.s.badge.removeAttribute('transform'); else b.s.badge.setAttribute('transform', 'translate(0 8)');
            if (!clash) shown.push(b);
        }
    }

    function renderCities() {
        buildMap();
        const counts = new Map(data.iller.map(x => [x.il, x.count]));
        const max = Math.max(1, ...counts.values());
        for (const [city, s] of shapes) {
            const count = counts.get(city) || 0;
            const level = count ? Math.min(5, 1 + Math.floor(Math.sqrt(count / max) * 4.999)) : 0;
            s.group.setAttribute('class', 'tr-il level-' + level + (city === selected ? ' is-selected' : ''));
            s.group.setAttribute('aria-label', city + ', ' + (count ? number(count) + ' ilan' : 'ilan yok'));
            s.title.textContent = city + ' · ' + (count ? number(count) + ' ilan' : 'ilan yok');
            s.badge.lastChild.textContent = count > 999 ? '999+' : String(count);
            const wide = String(count).length > 2 ? 24 : String(count).length > 1 ? 18 : 14;
            s.badge.firstChild.setAttribute('x', String(-wide / 2));
            s.badge.firstChild.setAttribute('width', String(wide));
            s.badge.setAttribute('visibility', count ? 'visible' : 'hidden');
            s.label.classList.toggle('has-count', count > 0);
            s.label.classList.toggle('on-strong', level >= 3);
        }
        showInfo(selected);
        declutter();
        const top = $('#topCities');
        top.replaceChildren();
        for (const x of data.iller.slice(0, 10)) {
            const li = node('li');
            const b = node('button', x.il, 'textbtn');
            b.type = 'button';
            b.onclick = () => select(x.il, true);
            li.append(b, node('span', number(x.count) + ' ilan', 'muted'));
            top.append(li);
        }
        if (!data.iller.length) top.append(node('li', 'Bu seçimde yayında ilan yok.', 'muted'));
        $('#mapTotal').textContent = number(data.iller.reduce((s, x) => s + x.count, 0)) + ' ilan · ' + data.iller.length + ' il';
    }

    async function load() {
        const mine = ++request;
        $('#mapStatus').textContent = 'Harita yükleniyor…';
        try {
            const result = await api('/api/meyve-ilanlari/harita?' + query());
            if (mine !== request) return;
            data = result;
            $('#mapStatus').textContent = '';
            renderCities();
            setTimeout(declutter);
            const url = new URL(location.href);
            for (const key of ['kategori', 'meyveTuru']) { const v = form.elements.namedItem(key).value; if (v) url.searchParams.set(key, v); else url.searchParams.delete(key); }
            history.replaceState(null, '', url.pathname + url.search);
            const listLink = $('#mapListLink');
            if (listLink) listLink.href = marketLink();
        } catch (e) { $('#mapStatus').textContent = e.message; }
    }

    function fillProducts(selected = '') {
        const category = form.elements.namedItem('kategori').value;
        const select = form.elements.namedItem('meyveTuru');
        select.replaceChildren(new Option(category ? 'Tüm ürünler' : 'Önce kategori seç', ''));
        select.disabled = !category;
        for (const p of category ? window.HasadimCatalog.products(category) : []) select.add(new Option(p, p));
        select.value = selected;
    }

    form.elements.namedItem('kategori').value = params.get('kategori') || '';
    fillProducts(params.get('meyveTuru') || '');
    form.elements.namedItem('kategori').addEventListener('change', () => { fillProducts(); void load(); });
    form.elements.namedItem('meyveTuru').addEventListener('change', () => void load());
    form.onsubmit = e => { e.preventDefault(); void load(); };
    // Sokak haritası kaldırıldı; eski ?gorunum=sokak bağlantıları il haritasını açar.
    if (params.has('gorunum')) { const url = new URL(location.href); url.searchParams.delete('gorunum'); history.replaceState(null, '', url.pathname + url.search); }
    void load();
})();
