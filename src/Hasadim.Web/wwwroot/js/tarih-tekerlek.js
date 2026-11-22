'use strict';

// Tarih alanları için iPhone'daki gibi gün / ay / yıl tekerlekli seçici.
// Sayfadaki her <input type="date"> görünmez hale gelir (değeri YYYY-AA-GG olarak formla gönderilmeye devam eder),
// yerine tarihi gösteren bir düğme çıkar; düğmeye basınca tekerlekler açılır. Klavyeyle de kullanılabilir:
// sütunlar arasında Tab, değer değiştirmek için yukarı/aşağı ok, Enter ile onay, Esc ile vazgeç.
window.DateWheel = (() => {
    const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    const ITEM = 40;
    const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
    const pad = n => String(n).padStart(2, '0');
    const daysIn = (y, m) => new Date(y, m, 0).getDate();
    const parse = v => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); return m ? { y: +m[1], m: +m[2], d: +m[3] } : null; };
    const iso = x => x.y + '-' + pad(x.m) + '-' + pad(x.d);
    const nativeValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');

    let dialog = null;
    function wheel(label) {
        const col = el('div', 'dw-col');
        col.tabIndex = 0;
        col.setAttribute('role', 'listbox');
        col.setAttribute('aria-label', label);
        return col;
    }
    function fill(col, items, index) {
        col.replaceChildren(el('div', 'dw-pad'));
        items.forEach((text, i) => { const o = el('div', 'dw-item', text); o.setAttribute('role', 'option'); o.dataset.i = i; col.append(o); });
        col.append(el('div', 'dw-pad'));
        mark(col, index);
        col.scrollTop = index * ITEM;
    }
    function mark(col, index) {
        [...col.querySelectorAll('.dw-item')].forEach((o, i) => { o.classList.toggle('on', i === index); o.setAttribute('aria-selected', String(i === index)); });
        col.dataset.index = index;
    }

    function open(input, button) {
        if (!dialog) { dialog = el('dialog', 'dw-dialog'); document.body.append(dialog); }
        const now = new Date();
        const thisYear = now.getFullYear();
        const minY = parse(input.min)?.y ?? thisYear - 3, maxY = parse(input.max)?.y ?? thisYear + 2;
        const start = parse(input.value) || { y: Math.min(maxY, Math.max(minY, thisYear)), m: now.getMonth() + 1, d: now.getDate() };
        const state = { ...start };
        const years = []; for (let y = minY; y <= maxY; y++) years.push(String(y));

        const title = (button.closest('label')?.firstChild?.textContent || 'Tarih seç').trim();
        const head = el('div', 'dw-head');
        head.append(el('strong', null, title), el('span', 'dw-preview'));
        const wrap = el('div', 'dw-wheels');
        const band = el('div', 'dw-band');
        const dayCol = wheel('Gün'), monCol = wheel('Ay'), yearCol = wheel('Yıl');
        dayCol.classList.add('dw-day'); yearCol.classList.add('dw-year');
        wrap.append(band, dayCol, monCol, yearCol);
        const actions = el('div', 'dw-actions');
        const clear = el('button', 'secondary', 'Temizle'); clear.type = 'button';
        const today = el('button', 'secondary', 'Bugün'); today.type = 'button';
        const ok = el('button', 'primary', 'Tamam'); ok.type = 'button';
        actions.append(clear, today, ok);
        dialog.replaceChildren(head, wrap, actions);
        dialog.setAttribute('aria-label', title);

        const preview = () => { head.querySelector('.dw-preview').textContent = state.d + ' ' + MONTHS[state.m - 1] + ' ' + state.y; };
        const days = () => Array.from({ length: daysIn(state.y, state.m) }, (_, i) => String(i + 1));
        const refreshDays = () => { state.d = Math.min(state.d, daysIn(state.y, state.m)); fill(dayCol, days(), state.d - 1); };
        fill(dayCol, days(), state.d - 1);
        fill(monCol, MONTHS, state.m - 1);
        fill(yearCol, years, years.indexOf(String(state.y)));
        preview();

        const apply = (col, i) => {
            if (col === dayCol) state.d = i + 1;
            else if (col === monCol) { state.m = i + 1; refreshDays(); }
            else { state.y = minY + i; refreshDays(); }
            preview();
        };
        for (const col of [dayCol, monCol, yearCol]) {
            let t = 0;
            col.addEventListener('scroll', () => {
                const i = Math.max(0, Math.min(col.querySelectorAll('.dw-item').length - 1, Math.round(col.scrollTop / ITEM)));
                if (String(i) !== col.dataset.index) mark(col, i);
                clearTimeout(t);
                t = setTimeout(() => { col.scrollTo({ top: i * ITEM, behavior: 'smooth' }); apply(col, i); }, 120);
            }, { passive: true });
            col.addEventListener('click', e => { const o = e.target.closest('.dw-item'); if (o) col.scrollTo({ top: +o.dataset.i * ITEM, behavior: 'smooth' }); });
            col.addEventListener('keydown', e => {
                const n = col.querySelectorAll('.dw-item').length, i = +col.dataset.index;
                const move = { ArrowDown: 1, ArrowUp: -1, PageDown: 5, PageUp: -5 }[e.key];
                if (move) { e.preventDefault(); const j = Math.max(0, Math.min(n - 1, i + move)); mark(col, j); apply(col, j); col.scrollTo({ top: j * ITEM, behavior: 'smooth' }); }
                else if (e.key === 'Enter') { e.preventDefault(); ok.click(); }
            });
        }
        const done = value => {
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            dialog.close();
            button.focus();
        };
        ok.onclick = () => done(iso(state));
        clear.onclick = () => done('');
        today.onclick = () => {
            state.y = Math.min(maxY, Math.max(minY, thisYear)); state.m = now.getMonth() + 1; state.d = now.getDate();
            fill(monCol, MONTHS, state.m - 1); fill(yearCol, years, years.indexOf(String(state.y))); refreshDays(); preview();
        };
        dialog.onclick = e => { if (e.target === dialog) dialog.close(); }; // dışına tıklayınca kapanır
        dialog.showModal();
        // Görünür olduktan sonra kaydırma konumu kesinleşir.
        requestAnimationFrame(() => { for (const col of [dayCol, monCol, yearCol]) col.scrollTop = (+col.dataset.index) * ITEM; dayCol.focus(); });
    }

    function enhance(input) {
        if (input.dataset.wheel) return;
        input.dataset.wheel = '1';
        input.type = 'text';
        input.hidden = true;
        const button = el('button', 'dw-field');
        button.type = 'button';
        if (input.getAttribute('aria-describedby')) button.setAttribute('aria-describedby', input.getAttribute('aria-describedby'));
        const text = el('span', 'dw-text');
        const clear = el('span', 'dw-clear', '×');
        clear.setAttribute('aria-hidden', 'true');
        button.append(el('span', 'dw-icon'), text, clear);
        input.before(button); // etiket (label) tıklaması düğmeyi açsın
        const render = () => {
            const x = parse(nativeValue.get.call(input));
            text.textContent = x ? x.d + ' ' + MONTHS[x.m - 1] + ' ' + x.y : 'Tarih seç';
            button.classList.toggle('empty', !x);
            button.setAttribute('aria-label', (button.closest('label')?.firstChild?.textContent || 'Tarih').trim() + ': ' + text.textContent);
            button.disabled = input.disabled;
        };
        // Değer kodla değiştirildiğinde (ilan düzenleme formu doldurulurken) düğme de güncellensin.
        Object.defineProperty(input, 'value', {
            configurable: true,
            get() { return nativeValue.get.call(this); },
            set(v) { nativeValue.set.call(this, v); render(); }
        });
        input.form?.addEventListener('reset', () => setTimeout(render));
        button.addEventListener('click', e => {
            if (e.target === clear && !button.classList.contains('empty')) { e.preventDefault(); input.value = ''; input.dispatchEvent(new Event('change', { bubbles: true })); return; }
            open(input, button);
        });
        render();
    }

    function scan(root = document) { root.querySelectorAll?.('input[type="date"]').forEach(enhance); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => scan()); else scan();
    new MutationObserver(list => { for (const m of list) for (const n of m.addedNodes) if (n.nodeType === 1) { if (n.matches('input[type="date"]')) enhance(n); else scan(n); } })
        .observe(document.documentElement, { childList: true, subtree: true });
    return { enhance, open };
})();
