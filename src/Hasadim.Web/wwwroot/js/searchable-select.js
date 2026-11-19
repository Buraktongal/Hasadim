'use strict';

// Aranabilir seçim kutusu (select2 benzeri, kütüphanesiz).
// Asıl <select> formda kalır ve değerin kaynağıdır; üstüne arama yapılabilen
// bir açılır liste çizilir. Seçenekler veya değer koddan değişse de görünüm
// kendini günceller. Kullanım: <select data-searchable> veya
// window.SearchableSelect.enhance(select).
window.SearchableSelect = (() => {
    const supported = typeof MutationObserver === 'function' && typeof HTMLSelectElement === 'function';
    const valueDescriptor = supported ? Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value') : null;
    const indexDescriptor = supported ? Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'selectedIndex') : null;
    let counter = 0;

    // Türkçe harfleri sadeleştirir: "cilek" yazınca "Çilek" de bulunur.
    const fold = text => String(text || '').toLocaleLowerCase('tr-TR')
        .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/i̇/g, 'i')
        .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u').trim();

    function enhance(select) {
        if (!supported || !select || select.dataset.enhanced === 'true') return;
        select.dataset.enhanced = 'true';
        const id = 'ss' + (++counter);
        const wrap = document.createElement('div');
        wrap.className = 'ss';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'ss-button';
        button.setAttribute('aria-haspopup', 'listbox');
        button.setAttribute('aria-expanded', 'false');
        const labelText = select.closest('label')?.childNodes[0]?.textContent?.trim() || select.getAttribute('aria-label') || 'Seçim';
        button.setAttribute('aria-label', labelText);
        const current = document.createElement('span'); current.className = 'ss-value';
        const caret = document.createElement('span'); caret.className = 'ss-caret'; caret.setAttribute('aria-hidden', 'true');
        button.append(current, caret);

        const panel = document.createElement('div');
        panel.className = 'ss-panel';
        panel.hidden = true;
        const search = document.createElement('input');
        search.type = 'search';
        search.className = 'ss-search';
        search.placeholder = 'Ara…';
        search.autocomplete = 'off';
        search.setAttribute('role', 'combobox');
        search.setAttribute('aria-controls', id + '-list');
        search.setAttribute('aria-expanded', 'true');
        search.setAttribute('aria-label', labelText + ' içinde ara');
        const list = document.createElement('ul');
        list.className = 'ss-list';
        list.id = id + '-list';
        list.setAttribute('role', 'listbox');
        const empty = document.createElement('p');
        empty.className = 'ss-empty';
        empty.textContent = 'Sonuç bulunamadı';
        empty.hidden = true;
        panel.append(search, list, empty);

        select.parentNode.insertBefore(wrap, select);
        wrap.append(select, button, panel);
        select.classList.add('ss-native');
        select.tabIndex = -1;
        select.setAttribute('aria-hidden', 'true');

        let items = [], active = -1;

        function options() { return Array.from(select.options); }

        function paint() {
            const selected = select.options[select.selectedIndex];
            const placeholder = !selected || selected.value === '';
            current.textContent = selected ? selected.textContent : '';
            current.classList.toggle('is-placeholder', placeholder);
            button.disabled = select.disabled;
            wrap.classList.toggle('is-disabled', select.disabled);
        }

        function render() {
            const query = fold(search.value);
            list.replaceChildren();
            items = [];
            for (const option of options()) {
                if (option.hidden) continue;
                if (query && !fold(option.textContent).includes(query)) continue;
                const li = document.createElement('li');
                li.className = 'ss-option' + (option.value === '' ? ' is-placeholder' : '');
                li.id = id + '-o' + items.length;
                li.setAttribute('role', 'option');
                li.setAttribute('aria-selected', String(option.selected));
                // Arama terimini vurgula.
                const text = option.textContent;
                const at = query ? fold(text).indexOf(query) : -1;
                if (at >= 0 && fold(text).length === text.length) {
                    li.append(document.createTextNode(text.slice(0, at)));
                    const mark = document.createElement('mark'); mark.textContent = text.slice(at, at + query.length);
                    li.append(mark, document.createTextNode(text.slice(at + query.length)));
                } else li.textContent = text;
                li.addEventListener('mousedown', e => e.preventDefault());
                li.addEventListener('click', () => choose(option));
                list.append(li);
                items.push({ li, option });
            }
            empty.hidden = items.length > 0;
            setActive(Math.max(0, items.findIndex(x => x.option.selected)));
        }

        function setActive(index) {
            if (!items.length) { active = -1; search.removeAttribute('aria-activedescendant'); return; }
            active = (index + items.length) % items.length;
            items.forEach((x, i) => x.li.classList.toggle('is-active', i === active));
            const li = items[active].li;
            search.setAttribute('aria-activedescendant', li.id);
            li.scrollIntoView?.({ block: 'nearest' });
        }

        function open() {
            if (select.disabled || !panel.hidden) return;
            closeOthers(wrap);
            // Altta yer yoksa liste yukarı doğru açılır.
            const rect = button.getBoundingClientRect();
            const scroller = button.closest('dialog') || document.documentElement;
            const bottom = scroller === document.documentElement ? window.innerHeight : scroller.getBoundingClientRect().bottom;
            const top = scroller === document.documentElement ? 0 : scroller.getBoundingClientRect().top;
            wrap.classList.toggle('ss-up', bottom - rect.bottom < 320 && rect.top - top > bottom - rect.bottom);
            panel.hidden = false;
            wrap.classList.add('is-open');
            button.setAttribute('aria-expanded', 'true');
            search.value = '';
            // Az seçenekli listelerde arama kutusu gerekmez.
            search.hidden = options().length < 8;
            render();
            (search.hidden ? list : search).focus?.();
            if (search.hidden) { list.tabIndex = -1; }
        }

        function close(focusButton = true) {
            if (panel.hidden) return;
            panel.hidden = true;
            wrap.classList.remove('is-open');
            button.setAttribute('aria-expanded', 'false');
            if (focusButton) button.focus();
        }

        function choose(option) {
            const changed = select.value !== option.value;
            valueDescriptor.set.call(select, option.value);
            paint();
            close();
            if (changed) {
                select.dispatchEvent(new Event('input', { bubbles: true }));
                select.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }

        button.addEventListener('click', () => panel.hidden ? open() : close());
        button.addEventListener('keydown', e => {
            if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); open(); }
            else if (e.key.length === 1 && /\S/.test(e.key)) { open(); search.value = e.key; render(); }
        });
        const keys = e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
            else if (e.key === 'Enter') { e.preventDefault(); if (items[active]) choose(items[active].option); }
            else if (e.key === 'Escape') { e.preventDefault(); close(); }
            else if (e.key === 'Tab') close(false);
        };
        search.addEventListener('keydown', keys);
        list.addEventListener('keydown', keys);
        search.addEventListener('input', render);
        document.addEventListener('click', e => { if (!wrap.contains(e.target)) close(false); });

        // Koddan yapılan değişiklikleri izle: seçenekler, devre dışı durumu ve değer.
        new MutationObserver(() => { paint(); if (!panel.hidden) render(); })
            .observe(select, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
        Object.defineProperty(select, 'value', {
            configurable: true,
            get() { return valueDescriptor.get.call(this); },
            set(v) { valueDescriptor.set.call(this, v); paint(); }
        });
        Object.defineProperty(select, 'selectedIndex', {
            configurable: true,
            get() { return indexDescriptor.get.call(this); },
            set(v) { indexDescriptor.set.call(this, v); paint(); }
        });
        // disabled özelliği koddan değişince de görünümü güncelle.
        const disabledDescriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'disabled');
        Object.defineProperty(select, 'disabled', {
            configurable: true,
            get() { return disabledDescriptor.get.call(this); },
            set(v) { disabledDescriptor.set.call(this, v); paint(); }
        });
        select.addEventListener('change', paint);
        select.form?.addEventListener('reset', () => setTimeout(paint));
        // Tarayıcı doğrulaması gizli select'i işaretlerse görünür düğmeye odaklan.
        select.addEventListener('invalid', () => { wrap.classList.add('is-invalid'); button.focus(); });
        select.addEventListener('change', () => wrap.classList.remove('is-invalid'));
        paint();
    }

    function closeOthers(except) {
        for (const other of document.querySelectorAll('.ss.is-open')) {
            if (other === except) continue;
            other.classList.remove('is-open');
            other.querySelector('.ss-panel').hidden = true;
            other.querySelector('.ss-button').setAttribute('aria-expanded', 'false');
        }
    }

    function enhanceAll(root = document) {
        if (!supported) return;
        for (const select of root.querySelectorAll('select[data-searchable]')) enhance(select);
    }

    if (supported) {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => enhanceAll());
        else enhanceAll();
    }
    return { enhance, enhanceAll, fold };
})();
