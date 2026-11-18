'use strict';

// Kategori menüsü, liste/galeri görünümü, sıralama çubuğu ve
// adres çubuğundaki filtreler. İlan verisini app.js yükler.
window.MarketCatalog = (() => {
    const icons = {
        Elma: '🍎', Armut: '🍐', Portakal: '🍊', Mandalina: '🍊', Limon: '🍋', Üzüm: '🍇',
        Kiraz: '🍒', Vişne: '🍒', Şeftali: '🍑', Kayısı: '🍑', Erik: '🟣', Nar: '🔴',
        Çilek: '🍓', Karpuz: '🍉', Kavun: '🍈', Muz: '🍌', İncir: '🌿', Avokado: '🥑',
        Kivi: '🥝', Diğer: '🌱'
    };
    const barFruits = ['Elma', 'Armut', 'Portakal', 'Mandalina', 'Limon', 'Üzüm', 'Kiraz', 'Şeftali', 'Kayısı', 'Nar', 'Çilek', 'Karpuz', 'Avokado'];
    const filterKeys = ['q', 'meyveTuru', 'cesit', 'il', 'ilce', 'minFiyat', 'maxFiyat', 'minMiktar', 'maxMiktar', 'ambalaj', 'teslimat', 'sort'];
    const layoutKey = 'hasadim-layout';
    let counts = new Map();
    let total = 0;

    const node = (tag, text, cls) => {
        const n = document.createElement(tag);
        if (text !== undefined) n.textContent = text;
        if (cls) n.className = cls;
        return n;
    };
    const $ = selector => document.querySelector(selector);
    const icon = fruit => icons[fruit] || '🌱';
    const isMarketPage = () => document.body?.dataset?.page === 'market';
    const option = (text, value) => {
        const o = node('option', text);
        o.value = value;
        return o;
    };

    function categoryHref(fruit) {
        return '/html/index.html' + (fruit ? '?meyveTuru=' + encodeURIComponent(fruit) : '');
    }

    // Üstteki yatay kategori çubuğu her sayfada aynı bağlantıları kullanır.
    function renderBar(selected) {
        const bar = $('#categoryBar');
        if (!bar) return;
        bar.replaceChildren();
        const all = node('a', 'Tüm ilanlar', 'category-link');
        all.href = categoryHref('');
        if (!selected) all.setAttribute('aria-current', 'page');
        bar.append(all);
        for (const fruit of barFruits) {
            const link = node('a', undefined, 'category-link');
            link.href = categoryHref(fruit);
            link.append(node('span', icon(fruit), 'category-icon'), node('span', fruit));
            if (fruit === selected) link.setAttribute('aria-current', 'page');
            link.onclick = event => {
                if (!isMarketPage() || !window.MarketCatalog.onCategory) return;
                event.preventDefault();
                window.MarketCatalog.onCategory(fruit);
            };
            bar.append(link);
        }
    }

    // Soldaki kategori listesi; yayındaki ilan sayılarını gösterir.
    function renderList(selected) {
        const list = $('#categoryList');
        if (!list) return;
        list.replaceChildren();
        const fruits = Object.keys(icons);
        const entries = [['', 'Tüm meyveler', total], ...fruits.map(f => [f, f, counts.get(f) || 0])];
        for (const [value, label, count] of entries) {
            if (value && !count && value !== selected) continue;
            const item = node('li');
            const b = node('button', undefined, 'category-item' + (value === (selected || '') ? ' selected' : ''));
            b.type = 'button';
            if (value) b.append(node('span', icon(value), 'category-icon'));
            b.append(node('span', label, 'category-name'), node('span', new Intl.NumberFormat('tr-TR').format(count), 'category-count'));
            b.setAttribute('aria-pressed', String(value === (selected || '')));
            b.onclick = () => window.MarketCatalog.onCategory?.(value);
            item.append(b);
            list.append(item);
        }
        if (!counts.size) {
            const note = node('li', 'Kategori sayıları yüklenemedi; filtreler çalışmaya devam eder.', 'muted');
            if (total === 0) note.textContent = 'Henüz yayında ilan yok.';
            list.append(note);
        }
    }

    async function loadCounts(api) {
        try {
            const data = await api('/api/meyve-ilanlari/kategoriler');
            if (!Array.isArray(data)) return;
            counts = new Map(data.map(x => [x.meyveTuru, x.count]));
            total = data.reduce((sum, x) => sum + (x.count || 0), 0);
        } catch {
            counts = new Map();
        }
    }

    // Çeşit seçimi seçili meyveye göre dolar.
    function fillVarieties(form, selected = '') {
        const fruit = form.elements.namedItem('meyveTuru')?.value || '';
        const select = form.elements.namedItem('cesit');
        if (!select || typeof select.replaceChildren !== 'function') return;
        select.replaceChildren(option(fruit ? 'Tüm çeşitler' : 'Önce meyve seçin', ''));
        const list = fruit && typeof fruitVarieties !== 'undefined' ? (fruitVarieties[fruit] || []) : [];
        for (const variety of list) select.append(option(variety, variety));
        if (selected && !list.includes(selected)) select.append(option(selected, selected));
        select.value = selected;
        select.disabled = !fruit;
    }

    // İl ve ilçe seçimi editördeki ortak veriyi kullanır; yüklenemezse
    // seçim alanları boş kalır, arama yine çalışır.
    async function setupLocations(form, city = '', district = '') {
        if (typeof Option === 'undefined' || !window.setupLocationSelectors) return;
        const citySelect = form.elements.namedItem('il');
        const districtSelect = form.elements.namedItem('ilce');
        if (!citySelect || citySelect.tagName?.toLowerCase() !== 'select') return;
        try {
            await window.setupLocationSelectors(form, city, district);
            const rename = () => {
                if (citySelect.options[0]) citySelect.options[0].textContent = 'Tüm iller';
                if (districtSelect.options[0]) districtSelect.options[0].textContent = citySelect.value ? 'Tüm ilçeler' : 'Önce il seçin';
            };
            rename();
            citySelect.addEventListener('change', rename);
        } catch {
            citySelect.disabled = false;
        }
    }

    function readUrl() {
        const params = new URLSearchParams(location.search);
        const values = {};
        for (const key of filterKeys) {
            const value = params.get(key);
            if (value) values[key] = value.slice(0, 150);
        }
        return values;
    }

    function writeUrl(url, form, enabled) {
        for (const key of filterKeys) {
            if (key === 'q') continue;
            const value = enabled ? form.elements.namedItem(key)?.value?.trim() : '';
            if (value && !(key === 'sort' && value === 'new')) url.searchParams.set(key, value);
            else url.searchParams.delete(key);
        }
    }

    function apply(form, values) {
        for (const [key, value] of Object.entries(values)) {
            if (key === 'q' || key === 'cesit' || key === 'il' || key === 'ilce') continue;
            const field = form.elements.namedItem(key);
            if (field) field.value = value;
        }
        fillVarieties(form, values.cesit || '');
        const city = form.elements.namedItem('il');
        if (city) city.value = values.il || '';
        const district = form.elements.namedItem('ilce');
        if (district) district.value = values.ilce || '';
        syncSort(form);
        return setupLocations(form, values.il || '', values.ilce || '');
    }

    function syncSort(form) {
        const bar = $('#sortBar');
        const field = form.elements.namedItem('sort');
        if (bar && field) bar.value = field.value || 'new';
    }

    function layout() {
        try { return localStorage.getItem(layoutKey) === 'gallery' ? 'gallery' : 'list'; }
        catch { return 'list'; }
    }

    function setLayout(value) {
        const list = $('#listings');
        const header = $('#listHeader');
        if (!list) return;
        const gallery = value === 'gallery';
        list.className = 'cards ' + (gallery ? 'gallery-view' : 'list-view');
        if (header) header.hidden = gallery;
        for (const b of document.querySelectorAll('[data-layout]')) {
            b.setAttribute('aria-pressed', String(b.dataset.layout === value));
        }
        try { localStorage.setItem(layoutKey, value); } catch { }
    }

    function bind(form, reload) {
        const fruit = form.elements.namedItem('meyveTuru');
        if (fruit && form.elements.namedItem('cesit')) {
            fruit.addEventListener?.('change', () => fillVarieties(form));
        }
        const bar = $('#sortBar');
        if (bar) bar.onchange = () => {
            const field = form.elements.namedItem('sort');
            if (field) field.value = bar.value;
            reload();
        };
        for (const b of document.querySelectorAll('[data-layout]')) {
            b.onclick = () => setLayout(b.dataset.layout);
        }
        setLayout(layout());
    }

    async function refresh(api, selected) {
        await loadCounts(api);
        renderList(selected);
        renderBar(selected);
    }

    function highlight(selected) {
        renderList(selected);
        renderBar(selected);
    }

    return { icon, icons, bind, refresh, highlight, readUrl, writeUrl, apply, fillVarieties, syncSort, setLayout, onCategory: null };
})();
