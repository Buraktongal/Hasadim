'use strict';

// Kategori menüsü (ana kategori → ürün), liste/galeri görünümü, sıralama
// çubuğu ve adres çubuğundaki filtreler. İlan verisini app.js yükler.
window.MarketCatalog = (() => {
    const icons = {
        Elma: '🍎', Armut: '🍐', Ayva: '🍐', Portakal: '🍊', Mandalina: '🍊', Limon: '🍋', Greyfurt: '🍊', Üzüm: '🍇', Kiraz: '🍒', Vişne: '🍒', Şeftali: '🍑', Nektarin: '🍑', Kayısı: '🍑', Erik: '🟣', Nar: '🔴', Çilek: '🍓', Ahududu: '🍓', Böğürtlen: '🫐', 'Yaban mersini': '🫐', Dut: '🫐', Karpuz: '🍉', Kavun: '🍈', Muz: '🍌', İncir: '🌿', 'Trabzon hurması': '🟠', Avokado: '🥑', Kivi: '🥝', Diğer: '🌱'
    };
    const filterKeys = ['q', 'kategori', 'meyveTuru', 'cesit', 'il', 'ilce', 'minFiyat', 'maxFiyat', 'minMiktar', 'maxMiktar', 'ambalaj', 'teslimat', 'imarDurumu', 'tapuDurumu', 'sort'];
    const layoutKey = 'hasadim-layout';
    let counts = new Map();
    let categoryCounts = new Map();
    let total = 0;

    const catalog = () => window.HasadimCatalog;
    const node = (tag, text, cls) => {
        const n = document.createElement(tag);
        if (text !== undefined) n.textContent = text;
        if (cls) n.className = cls;
        return n;
    };
    const $ = selector => document.querySelector(selector);
    const icon = fruit => icons[fruit] || '🌱';
    // Çizilmiş simge; fruit-icons.js yüklenmemişse emoji kullanılır.
    const iconNode = (fruit, size = 18) => window.FruitIcons ? window.FruitIcons.node(fruit, size, 'category-icon') : node('span', icon(fruit), 'category-icon');
    const isMarketPage = () => document.body?.dataset?.page === 'market';
    const option = (text, value) => {
        const o = node('option', text);
        o.value = value;
        return o;
    };
    const format = n => new Intl.NumberFormat('tr-TR').format(n);

    // Seçim nesnesi: { kategori, meyveTuru }. Ürün verilip kategori verilmezse katalogdan bulunur.
    function normalize(selection) {
        if (typeof selection === 'string') selection = { meyveTuru: selection };
        const product = selection?.meyveTuru || '';
        const category = selection?.kategori || (product ? catalog()?.categoryOf(product) || '' : '');
        return { kategori: category, meyveTuru: product };
    }

    function categoryHref(selection) {
        const { kategori, meyveTuru } = normalize(selection);
        const params = new URLSearchParams();
        if (kategori) params.set('kategori', kategori);
        if (meyveTuru) params.set('meyveTuru', meyveTuru);
        return '/html/index.html' + (params.size ? '?' + params : '');
    }

    // Üstteki yatay kategori çubuğu: ana kategoriler + harita ve ürün takvimi.
    function renderBar(selection) {
        const bar = $('#categoryBar');
        if (!bar) return;
        const { kategori } = normalize(selection);
        bar.replaceChildren();
        const all = node('a', 'Tüm ilanlar', 'category-link');
        all.href = categoryHref({});
        if (!kategori && isMarketPage()) all.setAttribute('aria-current', 'page');
        bar.append(all);
        for (const c of catalog()?.categories || []) {
            const link = node('a', undefined, 'category-link');
            link.href = categoryHref({ kategori: c.id });
            link.append(iconNode(c.icon), node('span', c.short));
            if (c.id === kategori) link.setAttribute('aria-current', 'page');
            link.onclick = event => {
                if (!isMarketPage() || !window.MarketCatalog.onCategory) return;
                event.preventDefault();
                window.MarketCatalog.onCategory({ kategori: c.id, meyveTuru: '' });
            };
            bar.append(link);
        }
        const tools = node('span', undefined, 'category-tools');
        for (const [href, text, page] of [['/html/harita.html', 'Harita', 'map'], ['/html/urun-takvimi.html', 'Ürün takvimi', 'calendar']]) {
            const link = node('a', text, 'category-link category-tool');
            link.href = href;
            if (document.body?.dataset?.page === page) link.setAttribute('aria-current', 'page');
            tools.append(link);
        }
        bar.append(tools);
    }

    function item(label, count, { selected, iconName, onClick, cls = '' }) {
        const li = node('li');
        const b = node('button', undefined, ('category-item ' + cls + (selected ? ' selected' : '')).trim());
        b.type = 'button';
        if (iconName) b.append(iconNode(iconName));
        b.append(node('span', label, 'category-name'), node('span', format(count), 'category-count'));
        b.setAttribute('aria-pressed', String(Boolean(selected)));
        b.onclick = onClick;
        li.append(b);
        return li;
    }

    // Soldaki liste: kategori seçilmemişse ana kategoriler, seçilmişse o kategorinin ürünleri.
    function renderList(selection) {
        const list = $('#categoryList');
        if (!list) return;
        const { kategori, meyveTuru } = normalize(selection);
        const pick = value => () => window.MarketCatalog.onCategory?.(value);
        list.replaceChildren();
        if (!kategori) {
            list.append(item('Tüm ilanlar', total, { selected: true, onClick: pick({}) }));
            for (const c of catalog()?.categories || []) {
                list.append(item(c.name, categoryCounts.get(c.id) || 0, { iconName: c.icon, onClick: pick({ kategori: c.id }) }));
            }
        } else {
            const c = catalog()?.category(kategori);
            list.append(item('← Tüm kategoriler', total, { onClick: pick({}), cls: 'category-back' }));
            list.append(item(c.name, categoryCounts.get(kategori) || 0, { selected: !meyveTuru, iconName: c.icon, onClick: pick({ kategori }), cls: 'category-parent' }));
            for (const product of c.products) {
                const count = counts.get(product) || 0;
                if (!count && product !== meyveTuru) continue;
                list.append(item(product, count, { selected: product === meyveTuru, iconName: product, onClick: pick({ kategori, meyveTuru: product }), cls: 'category-child' }));
            }
            if (!c.products.some(p => counts.get(p))) list.append(node('li', 'Bu kategoride henüz yayında ilan yok.', 'muted'));
        }
        if (!counts.size && total === 0) list.append(node('li', 'Henüz yayında ilan yok.', 'muted'));
    }

    async function loadCounts(api) {
        try {
            const data = await api('/api/meyve-ilanlari/kategoriler');
            if (!Array.isArray(data)) return;
            counts = new Map(data.map(x => [x.meyveTuru, x.count]));
            categoryCounts = new Map();
            for (const x of data) {
                const id = x.kategori || catalog()?.categoryOf(x.meyveTuru) || 'Meyve';
                categoryCounts.set(id, (categoryCounts.get(id) || 0) + (x.count || 0));
            }
            total = data.reduce((sum, x) => sum + (x.count || 0), 0);
        } catch {
            counts = new Map();
        }
    }

    // Ürün seçimi seçili kategoriye göre dolar ("Tüm …" seçeneğiyle).
    function fillProducts(form, selected = '') {
        const category = form.elements.namedItem('kategori')?.value || '';
        const select = form.elements.namedItem('meyveTuru');
        if (!select || typeof select.replaceChildren !== 'function') return;
        const c = category ? catalog()?.category(category) : null;
        select.replaceChildren(option(c ? 'Tüm ' + c.name.toLocaleLowerCase('tr-TR') + ' ürünleri' : 'Tüm ürünler', ''));
        const groups = c ? [c] : (catalog()?.categories || []);
        for (const g of groups) {
            const parent = !c && typeof document.createElement('optgroup').append === 'function' ? node('optgroup') : null;
            if (parent) parent.label = g.name;
            for (const product of g.products) (parent || select).append(option(product, product));
            if (parent) select.append(parent);
        }
        if (selected && !Array.from(select.options || []).some(o => o.value === selected)) select.append(option(selected, selected));
        select.value = selected;
        syncCategoryFields(form);
    }

    // Arazi seçilince ürün/teslimat filtreleri yerine arazi filtreleri görünür.
    function syncCategoryFields(form) {
        const land = form.elements.namedItem('kategori')?.value === 'Arazi';
        for (const n of form.querySelectorAll('[data-land-only]')) n.hidden = !land;
        for (const n of form.querySelectorAll('[data-product-only]')) n.hidden = land;
        const priceLegend = form.querySelector('[data-price-legend]');
        if (priceLegend) priceLegend.textContent = land ? 'Fiyat (toplam TL)' : 'Fiyat (TL / birim)';
        const qtyLegend = form.querySelector('[data-qty-legend]');
        if (qtyLegend) qtyLegend.textContent = land ? 'Alan (m²)' : 'Miktar (kg / balya)';
        const variety = form.elements.namedItem('cesit');
        if (variety?.closest) { const label = variety.closest('label'); if (label) label.hidden = land; }
    }

    // Çeşit seçimi seçili ürüne göre dolar.
    function fillVarieties(form, selected = '') {
        const fruit = form.elements.namedItem('meyveTuru')?.value || '';
        const select = form.elements.namedItem('cesit');
        if (!select || typeof select.replaceChildren !== 'function') return;
        select.replaceChildren(option(fruit ? 'Tüm çeşitler' : 'Önce ürün seç', ''));
        const list = fruit && typeof fruitVarieties !== 'undefined' ? (fruitVarieties[fruit] || []) : [];
        for (const variety of list) select.append(option(variety, variety));
        if (selected && !list.includes(selected)) select.append(option(selected, selected));
        select.value = selected;
        select.disabled = !fruit || !list.length && !selected;
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
                if (districtSelect.options[0]) districtSelect.options[0].textContent = citySelect.value ? 'Tüm ilçeler' : 'Önce il seç';
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
        if (values.meyveTuru && !values.kategori && catalog()) values.kategori = catalog().categoryOf(values.meyveTuru);
        return values;
    }

    function writeUrl(url, form, enabled) {
        for (const key of filterKeys) {
            if (key === 'q') continue;
            const field = form.elements.namedItem(key);
            const value = enabled && !field?.closest?.('[hidden]') ? field?.value?.trim() : '';
            if (value && !(key === 'sort' && value === 'new')) url.searchParams.set(key, value);
            else url.searchParams.delete(key);
        }
    }

    // Kayıtlı arama için geçerli filtrelerin adres biçimi.
    function queryString(form) {
        const params = new URLSearchParams();
        for (const key of filterKeys) {
            const field = form.elements.namedItem(key);
            const value = field?.value?.trim();
            if (value && !field.closest?.('[hidden]') && !(key === 'sort' && value === 'new')) params.set(key, value);
        }
        return params.toString();
    }

    function apply(form, values) {
        for (const [key, value] of Object.entries(values)) {
            if (['q', 'cesit', 'il', 'ilce', 'meyveTuru'].includes(key)) continue;
            const field = form.elements.namedItem(key);
            if (field) field.value = value;
        }
        fillProducts(form, values.meyveTuru || '');
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
        const category = form.elements.namedItem('kategori');
        category?.addEventListener?.('change', () => { fillProducts(form); fillVarieties(form); });
        const fruit = form.elements.namedItem('meyveTuru');
        if (fruit && form.elements.namedItem('cesit')) {
            fruit.addEventListener?.('change', () => {
                // Ürün seçilince kategori de ona göre seçilir.
                if (fruit.value && category && !category.value) {
                    const id = catalog()?.categoryOf(fruit.value);
                    if (id) { category.value = id; const keep = fruit.value; fillProducts(form, keep); }
                }
                fillVarieties(form);
            });
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

    async function refresh(api, selection) {
        await loadCounts(api);
        renderList(selection);
        renderBar(selection);
    }

    function highlight(selection) {
        renderList(selection);
        renderBar(selection);
    }

    return { icon, iconNode, icons, bind, refresh, highlight, readUrl, writeUrl, queryString, apply, fillProducts, fillVarieties, syncCategoryFields, syncSort, setLayout, categoryHref, onCategory: null };
})();
