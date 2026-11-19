'use strict';

// Harita sayfası: il haritası (her il bir kutu, renk ilan yoğunluğu) ve
// OpenStreetMap üzerinde ilan noktaları. Veri: /api/meyve-ilanlari/harita
(() => {
    // Türkiye il haritası için ızgara konumları [sütun, satır] (il merkezlerine göre).
    const GRID = {"Adana":[10,7],"Adıyaman":[13,6],"Afyonkarahisar":[5,5],"Ağrı":[17,4],"Amasya":[10,3],"Ankara":[7,4],"Antalya":[6,7],"Artvin":[16,2],"Aydın":[3,6],"Balıkesir":[3,4],"Bilecik":[5,3],"Bingöl":[15,5],"Bitlis":[17,5],"Bolu":[7,3],"Burdur":[5,6],"Bursa":[4,4],"Çanakkale":[1,3],"Çankırı":[8,3],"Çorum":[9,3],"Denizli":[4,6],"Diyarbakır":[14,6],"Edirne":[2,2],"Elazığ":[13,5],"Erzincan":[14,4],"Erzurum":[15,4],"Eskişehir":[6,4],"Gaziantep":[12,7],"Giresun":[13,2],"Gümüşhane":[14,3],"Hakkari":[18,6],"Hatay":[11,8],"Isparta":[6,6],"Mersin":[9,7],"İstanbul":[4,2],"İzmir":[2,5],"Kars":[17,3],"Kastamonu":[9,2],"Kayseri":[10,5],"Kırklareli":[2,1],"Kırşehir":[9,4],"Kocaeli":[5,2],"Konya":[7,6],"Kütahya":[5,4],"Malatya":[12,5],"Manisa":[3,5],"Kahramanmaraş":[11,6],"Mardin":[15,7],"Muğla":[3,7],"Muş":[16,5],"Nevşehir":[9,5],"Niğde":[9,6],"Ordu":[12,2],"Rize":[15,2],"Sakarya":[6,3],"Samsun":[11,2],"Siirt":[16,6],"Sinop":[10,1],"Sivas":[11,4],"Tekirdağ":[3,2],"Tokat":[11,3],"Trabzon":[14,2],"Tunceli":[14,5],"Şanlıurfa":[13,7],"Uşak":[4,5],"Van":[18,5],"Yozgat":[10,4],"Zonguldak":[7,2],"Aksaray":[8,5],"Bayburt":[15,3],"Karaman":[8,7],"Kırıkkale":[8,4],"Batman":[15,6],"Şırnak":[17,6],"Bartın":[7,1],"Ardahan":[17,2],"Iğdır":[18,4],"Yalova":[4,3],"Karabük":[8,2],"Kilis":[12,8],"Osmaniye":[11,7],"Düzce":[6,2]};
    const api = window.HasadimApi;
    const $ = s => document.querySelector(s);
    const node = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
    const number = v => new Intl.NumberFormat('tr-TR').format(v);
    const unit = u => ({ kg: 'kg', balya: 'balya', m2: 'm²' })[u] || 'kg';
    const price = p => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: p.kategori === 'Arazi' ? 0 : 2, maximumFractionDigits: p.kategori === 'Arazi' ? 0 : 2 }).format(p.kilogramFiyati) + (p.kategori === 'Arazi' ? '' : ' / ' + unit(p.birim));
    let data = { iller: [], noktalar: [] };
    let street = null;
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

    function renderCities() {
        const root = $('#cityGrid');
        root.replaceChildren();
        const counts = new Map(data.iller.map(x => [x.il, x.count]));
        const max = Math.max(1, ...counts.values());
        for (const [city, [col, row]] of Object.entries(GRID)) {
            const count = counts.get(city) || 0;
            const level = count ? Math.min(5, 1 + Math.floor(Math.sqrt(count / max) * 4.999)) : 0;
            const cell = node(count ? 'a' : 'span', undefined, 'city-cell level-' + level);
            cell.style.gridColumn = String(col);
            cell.style.gridRow = String(row);
            if (count) cell.href = marketLink({ il: city });
            cell.title = city + ': ' + number(count) + ' ilan';
            cell.setAttribute('aria-label', city + ', ' + number(count) + ' ilan');
            cell.append(node('span', city.length > 9 ? city.slice(0, 8) + '.' : city, 'city-name'), node('strong', count ? number(count) : '–', 'city-count'));
            root.append(cell);
        }
        const top = $('#topCities');
        top.replaceChildren();
        for (const x of data.iller.slice(0, 10)) {
            const li = node('li');
            const a = node('a', x.il);
            a.href = marketLink({ il: x.il });
            li.append(a, node('span', number(x.count) + ' ilan', 'muted'));
            top.append(li);
        }
        if (!data.iller.length) top.append(node('li', 'Bu seçimde yayında ilan yok.', 'muted'));
        $('#mapTotal').textContent = number(data.iller.reduce((s, x) => s + x.count, 0)) + ' ilan · ' + data.iller.length + ' il';
    }

    function popup(p) {
        const box = $('#mapPopup');
        box.replaceChildren();
        const close = node('button', '×', 'close');
        close.type = 'button'; close.setAttribute('aria-label', 'Kapat');
        close.onclick = () => { box.hidden = true; };
        const title = node('a', p.baslik, 'popup-title');
        title.href = '/html/ilan.html?id=' + encodeURIComponent(p.id);
        title.setAttribute('translate', 'no');
        const meta = node('p', (window.HasadimCatalog?.category(p.kategori)?.name || '') + ' · ' + p.meyveTuru + ' · ' + p.il + ' / ' + p.ilce, 'muted');
        const qty = p.kategori === 'Arazi' ? number(p.miktarKg) + ' m²' : number(p.miktarKg) + ' ' + unit(p.birim);
        box.append(close, title, meta, node('p', price(p) + ' · ' + qty, 'popup-price'),
            node('small', p.exact ? 'Satıcının işaretlediği konum' : 'Yaklaşık konum (il merkezine yakın)', 'muted'));
        const open = node('a', 'İlanı incele →', 'primary');
        open.href = title.href;
        box.append(open);
        box.hidden = false;
    }

    function renderStreet() {
        const root = $('#streetMap');
        if (!street) street = window.HasadimMap.create(root, { center: window.HasadimMap.TURKEY.center, zoom: 6 });
        if (!street) return;
        const points = data.noktalar.map(p => {
            const exact = p.enlem !== null && p.enlem !== undefined && p.boylam !== null && p.boylam !== undefined;
            const at = exact ? [Number(p.enlem), Number(p.boylam)] : window.HasadimMap.approximate(p.id, p.il);
            return at ? { ...p, lat: at[0], lon: at[1], exact } : null;
        }).filter(Boolean);
        street.setPoints(points, p => {
            const b = node('button', undefined, 'map-price-pin' + (p.exact ? ' exact' : ''));
            b.type = 'button';
            if (window.FruitIcons) b.append(window.FruitIcons.node(p.meyveTuru, 18));
            b.append(node('span', new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 1 }).format(p.kilogramFiyati) + ' ₺'));
            b.setAttribute('aria-label', p.baslik + ', ' + price(p));
            b.onclick = event => { event.stopPropagation(); popup(p); };
            return b;
        });
        street.fit(points);
        $('#streetNote').textContent = number(points.length) + ' ilan gösteriliyor' + (data.noktalar.length >= 500 ? ' (en yeni 500 ilan)' : '') + '. Konumu işaretlenmemiş ilanlar il merkezine yakın gösterilir.';
    }

    function tab(name) {
        for (const b of document.querySelectorAll('[data-map-tab]')) {
            const on = b.dataset.mapTab === name;
            b.setAttribute('aria-selected', String(on));
            $('#' + b.getAttribute('aria-controls')).hidden = !on;
        }
        const url = new URL(location.href);
        url.searchParams.set('gorunum', name);
        history.replaceState(null, '', url.pathname + url.search);
        if (name === 'sokak') setTimeout(renderStreet);
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
            if (!$('#streetPanel').hidden) renderStreet();
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
    for (const b of document.querySelectorAll('[data-map-tab]')) b.onclick = () => tab(b.dataset.mapTab);
    tab(params.get('gorunum') === 'sokak' ? 'sokak' : 'il');
    void load();
})();
