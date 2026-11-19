'use strict';

// Sayfa yükleme düzeni. Head içinde, defer olmadan, theme.js'ten hemen sonra yüklenir.
//
// İlk açılış: üst menü, alt bölüm ve sayfa verileri farklı anlarda geldiği için
// sayfa parça parça beliriyordu. Artık bütün bölümler hazır olana kadar gizli
// kalır ve hepsi aynı anda görünür. Bekleme uzarsa Hasadım yükleme ekranı çıkar.
//
// Sonraki beklemeler (filtre, sayfa değişimi, kaydetme): üstte ince bir ilerleme
// çizgisi; bekleme uzarsa ortada küçük bir yükleme kartı. Arka planda yapılan
// bildirim yoklamaları bu göstergeleri tetiklemez.
(() => {
    const root = document.documentElement;
    const QUIET = 80;             // zincirleme isteklerin arasındaki kısa boşluklar için
    const MAX_WAIT = 8000;        // ne olursa olsun sayfa bu süre sonunda gösterilir
    const BAR_DELAY = 250, CARD_DELAY = 1200;
    const BACKGROUND = /\/api\/(?:messages\/notifications|notifications\/count)(?:[?#]|$)/;
    const lang = () => (window.HasadimTheme?.language?.() === 'en' ? 'en' : 'tr');

    let pending = 0, busy = 0, ready = false, domReady = false;
    let quietTimer = 0, barTimer = 0, cardTimer = 0;
    let splash = null, bar = null, card = null;

    root.classList.add('is-loading');

    function track(promise, { background = false } = {}) {
        let open = true;
        const counted = !background && ready;
        pending++;
        if (counted) busy++;
        changed();
        const done = () => {
            if (!open) return;
            open = false;
            pending--;
            if (counted) busy--;
            changed();
        };
        Promise.resolve(promise).then(done, done);
        return promise;
    }

    function changed() {
        if (!ready) {
            clearTimeout(quietTimer);
            if (domReady && pending === 0) quietTimer = setTimeout(() => { if (pending === 0) finish(); }, QUIET);
            return;
        }
        if (busy > 0) {
            if (!barTimer && !root.classList.contains('is-busy')) barTimer = setTimeout(showBusy, BAR_DELAY);
            if (!cardTimer && !root.classList.contains('is-busy-long')) cardTimer = setTimeout(showLongBusy, CARD_DELAY);
        } else {
            clearTimeout(barTimer); clearTimeout(cardTimer);
            barTimer = cardTimer = 0;
            root.classList.remove('is-busy', 'is-busy-long');
        }
    }

    function showBusy() { barTimer = 0; if (busy > 0) { ensureIndicators(); root.classList.add('is-busy'); } }
    function showLongBusy() {
        cardTimer = 0;
        if (busy <= 0) return;
        ensureIndicators();
        card.querySelector('.hasadim-loading-text').textContent = lang() === 'en' ? 'Loading…' : 'Yükleniyor…';
        root.classList.add('is-busy-long');
    }

    function finish() {
        if (ready) return;
        ready = true;
        clearTimeout(quietTimer);
        root.classList.remove('is-loading');
        root.classList.add('is-ready');
        if (splash) {
            splash.classList.add('is-leaving');
            setTimeout(() => splash?.remove(), 450);
        }
        window.dispatchEvent(new Event('hasadim:ready'));
    }

    // Hasadım yaprağı: logodaki yeşil yaprak ve altın damar; çevresinde dönen hasat halkası.
    function leaf(size) {
        const NS = 'http://www.w3.org/2000/svg';
        const el = (name, attrs) => {
            const node = document.createElementNS(NS, name);
            for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
            return node;
        };
        const svg = el('svg', { viewBox: '0 0 80 80', width: size, height: size, 'aria-hidden': 'true', class: 'hasadim-leaf' });
        svg.append(
            el('circle', { cx: 40, cy: 40, r: 36, class: 'leaf-track' }),
            el('circle', { cx: 40, cy: 40, r: 36, class: 'leaf-orbit', pathLength: 100 }));
        const g = el('g', { class: 'leaf-body' });
        g.append(
            el('path', { d: 'M27 58C24 40 32 24 55 18c2 22-8 37-28 40Z', class: 'leaf-blade' }),
            el('path', { d: 'M28 56C34 42 41 32 51 23', class: 'leaf-vein', pathLength: 100 }),
            el('path', { d: 'M27 58l-3 6', class: 'leaf-stem' }));
        svg.append(g);
        return svg;
    }

    function buildSplash() {
        if (splash || ready || !document.body) return;
        splash = document.createElement('div');
        splash.className = 'hasadim-splash';
        splash.setAttribute('role', 'status');
        splash.setAttribute('aria-live', 'polite');
        const mark = document.createElement('p');
        mark.className = 'hasadim-splash-mark';
        mark.textContent = 'Hasadım';
        mark.translate = false;
        const text = document.createElement('p');
        text.className = 'hasadim-splash-text';
        text.textContent = lang() === 'en' ? 'Getting the harvest ready…' : 'Hasat hazırlanıyor…';
        const rows = document.createElement('div');
        rows.className = 'hasadim-splash-rows';
        rows.setAttribute('aria-hidden', 'true');
        for (let i = 0; i < 5; i++) rows.append(document.createElement('span'));
        splash.append(leaf(84), mark, rows, text);
        document.body.append(splash);
    }

    function ensureIndicators() {
        if (bar || !document.body) return;
        bar = document.createElement('div');
        bar.className = 'hasadim-progress';
        bar.setAttribute('aria-hidden', 'true');
        card = document.createElement('div');
        card.className = 'hasadim-loading-card';
        card.setAttribute('role', 'status');
        const text = document.createElement('span');
        text.className = 'hasadim-loading-text';
        card.append(leaf(34), text);
        document.body.append(bar, card);
    }

    // Sayfanın yaptığı bütün istekler sayılır; arka plan yoklamaları hariç.
    const nativeFetch = typeof window.fetch === 'function' ? window.fetch.bind(window) : null;
    if (nativeFetch) {
        window.fetch = (input, init) => {
            const url = typeof input === 'string' ? input : (input?.url || String(input));
            const background = Boolean(init?.hasadimQuiet) || (ready && BACKGROUND.test(url));
            return track(nativeFetch(input, init), { background });
        };
    }

    const onDom = () => {
        domReady = true;
        if (!ready) buildSplash();
        if (document.fonts?.ready) track(document.fonts.ready);
        changed();
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onDom, { once: true });
    else onDom();
    setTimeout(finish, MAX_WAIT);
    // Geri/ileri ile önbellekten dönülen sayfada bekleyecek bir şey yoktur.
    window.addEventListener('pageshow', e => { if (e.persisted) { finish(); busy = 0; changed(); } });

    window.HasadimLoading = {
        // Sayfa betikleri kendi hazırlık işlerini (betik yükleme, çeviri) buraya bildirir.
        track: promise => track(promise),
        isReady: () => ready,
        whenReady: () => (ready ? Promise.resolve() : new Promise(r => window.addEventListener('hasadim:ready', r, { once: true }))),
        finish
    };
})();
