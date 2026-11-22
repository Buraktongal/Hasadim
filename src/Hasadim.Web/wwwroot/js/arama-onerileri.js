'use strict';

// Üst arama kutusu önerileri: yazdıkça eşleşen ürünler ve satıcılar (kullanıcılar) listelenir.
// Ürün seçilince pazar yeri o ürünle süzülür, satıcı seçilince satıcının profili açılır.
// Enter ile öneri seçilmeden aranırsa eskisi gibi ilanlarda arama yapılır.
(() => {
    const ACTIVITY = { Producer: 'Üretici', Buyer: 'Alıcı', Trader: 'Tüccar', Cooperative: 'Kooperatif', Other: 'Satıcı' };
    const fold = s => (s || '').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');
    const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

    function attach(input) {
        if (!input || input.dataset.suggest) return;
        input.dataset.suggest = '1';
        const form = input.closest('form');
        form.classList.add('has-suggest');
        const box = el('div', 'search-suggest');
        box.id = 'globalQuerySuggest';
        box.setAttribute('role', 'listbox');
        box.setAttribute('aria-label', 'Arama önerileri');
        box.hidden = true;
        form.append(box);
        input.setAttribute('role', 'combobox');
        input.setAttribute('aria-autocomplete', 'list');
        input.setAttribute('aria-controls', box.id);
        input.setAttribute('aria-expanded', 'false');
        input.setAttribute('autocomplete', 'off');

        let timer = 0, seq = 0, active = -1, cache = new Map();
        const options = () => [...box.querySelectorAll('[role=option]')];
        const close = () => { box.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1; };
        const highlight = i => {
            const list = options(); if (!list.length) return;
            active = (i + list.length) % list.length;
            list.forEach((o, k) => o.setAttribute('aria-selected', String(k === active)));
            input.setAttribute('aria-activedescendant', list[active].id);
            list[active].scrollIntoView({ block: 'nearest' });
        };

        function products(q) {
            const cat = window.HasadimCatalog; if (!cat) return [];
            const n = fold(q), out = [];
            for (const c of cat.categories) for (const p of c.products) {
                const f = fold(p);
                if (f.includes(n)) out.push({ p, c, rank: f.startsWith(n) ? 0 : 1 });
            }
            return out.sort((a, b) => a.rank - b.rank || a.p.localeCompare(b.p, 'tr')).slice(0, 5);
        }
        async function sellers(q) {
            const key = fold(q);
            if (cache.has(key)) return cache.get(key);
            const r = await fetch('/api/profiles/search?q=' + encodeURIComponent(q), { credentials: 'same-origin', headers: { Accept: 'application/json' } });
            const list = r.ok ? await r.json() : [];
            cache.set(key, list);
            return list;
        }

        function option(href, icon, title, sub, id) {
            const a = el('a', 'suggest-option');
            a.href = href; a.id = 'sg-' + id; a.setAttribute('role', 'option'); a.setAttribute('aria-selected', 'false');
            a.tabIndex = -1;
            const text = el('span', 'suggest-text');
            const t = el('strong', null, title); t.setAttribute('translate', 'no');
            text.append(t);
            if (sub) text.append(el('small', null, sub));
            a.append(icon, text);
            a.addEventListener('mousedown', e => e.preventDefault()); // odak kutudan kaçmasın
            return a;
        }
        function avatar(s) {
            const box = el('span', 'suggest-avatar');
            if (s.photoUrl) { const img = el('img'); img.src = s.photoUrl; img.alt = ''; box.append(img); }
            else box.textContent = (s.name || '?').trim().slice(0, 1).toLocaleUpperCase('tr-TR');
            return box;
        }
        function productIcon(name) {
            const box = el('span', 'suggest-icon');
            if (window.FruitIcons) box.append(window.FruitIcons.node(name, 24)); else box.textContent = '🌱';
            return box;
        }

        async function update() {
            const q = input.value.trim();
            const my = ++seq;
            if (q.length < 2) { close(); return; }
            const prod = products(q);
            let sel = [];
            try { sel = await sellers(q); } catch { sel = []; }
            if (my !== seq) return;
            box.replaceChildren();
            let i = 0;
            if (prod.length) {
                box.append(el('div', 'suggest-head', 'Ürünler'));
                for (const x of prod) box.append(option('/?meyveTuru=' + encodeURIComponent(x.p), productIcon(x.p), x.p, x.c.name, i++));
            }
            if (sel.length) {
                box.append(el('div', 'suggest-head', 'Satıcılar'));
                for (const s of sel) {
                    const sub = [s.personName, ACTIVITY[s.activity], [s.district, s.city].filter(Boolean).join(', '), s.activeListingCount + ' ilan'].filter(Boolean).join(' · ');
                    const o = option('/html/satici.html?id=' + encodeURIComponent(s.id), avatar(s), s.name, sub, i++);
                    if (s.emailVerified) o.querySelector('strong').append(el('span', 'suggest-check', '✓'));
                    box.append(o);
                }
            }
            const all = option('/?q=' + encodeURIComponent(q), el('span', 'suggest-icon suggest-search', '⌕'), '“' + q + '” için ilanlarda ara', null, i++);
            all.dataset.submit = '1';
            box.append(all);
            box.hidden = false; active = -1;
            input.setAttribute('aria-expanded', 'true');
        }

        input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(update, 220); });
        input.addEventListener('focus', () => { if (input.value.trim().length >= 2) update(); });
        input.addEventListener('blur', () => setTimeout(close, 120));
        input.addEventListener('keydown', e => {
            if (box.hidden) return;
            if (e.key === 'ArrowDown') { e.preventDefault(); highlight(active + 1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); highlight(active - 1); }
            else if (e.key === 'Escape') { close(); }
            else if (e.key === 'Enter' && active >= 0) {
                const o = options()[active];
                if (o.dataset.submit) { close(); return; } // normal arama formu çalışsın
                e.preventDefault(); location.href = o.href;
            }
        });
        box.addEventListener('click', e => {
            const o = e.target.closest('[data-submit]');
            if (o) { e.preventDefault(); close(); form.requestSubmit(); }
        });
        form.addEventListener('submit', close);
    }

    const start = () => attach(document.querySelector('#globalQuery'));
    if (window.layoutReady) window.layoutReady.then(start, () => {}); else start();
})();
