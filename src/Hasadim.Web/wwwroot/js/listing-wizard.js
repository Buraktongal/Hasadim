'use strict';

// İlan formunu adımlara böler: Kategori → Detaylar → Fiyat ve teslimat →
// Fotoğraf ve yayın. Gönderim, önizleme ve kayıt listing-workflow.js'te kalır;
// sihirbaz yalnızca hangi bölümün görüneceğini ve adım kontrolünü yönetir.
window.ListingWizard = (() => {
    const total = 4;
    let current = 1;
    let reached = 1;
    let bound = false;

    const $ = selector => document.querySelector(selector);
    const form = () => $('#editorForm');
    const steps = () => Array.from(form()?.querySelectorAll('.wizard-step') || []);
    const stepOf = field => Number(field?.closest?.('.wizard-step')?.dataset?.step || 0);

    function fieldsOf(step) {
        const root = steps().find(s => Number(s.dataset.step) === step);
        if (!root) return [];
        return Array.from(root.querySelectorAll('input, select, textarea'))
            .filter(f => f.type !== 'hidden' && !f.disabled);
    }

    // Geçerli adımın zorunlu alanlarını kontrol eder.
    function validStep(step) {
        for (const field of fieldsOf(step)) {
            if (typeof field.checkValidity === 'function' && !field.checkValidity()) {
                field.reportValidity?.();
                return false;
            }
        }
        // Kategori ve ürün seçilmeden ilerlenemez.
        if (step === 1) {
            if (!form().elements.namedItem('kategori')?.value) {
                setError('Devam etmek için bir kategori seç.');
                return false;
            }
            const f = form().elements.namedItem('meyveTuru');
            if (f && !f.value) {
                setError(window.HasadimCatalog?.isLand(form().elements.namedItem('kategori').value) ? 'Devam etmek için arazi türünü seç.' : 'Devam etmek için bir ürün seç.');
                return false;
            }
        }
        setError('');
        return true;
    }

    function setError(text) {
        const error = form()?.querySelector('.form-error');
        if (error) error.textContent = text;
    }

    function render() {
        for (const s of steps()) {
            const active = Number(s.dataset.step) === current;
            s.classList.toggle('is-active', active);
            if (active) s.removeAttribute?.('aria-hidden');
            else s.setAttribute('aria-hidden', 'true');
        }
        for (const link of document.querySelectorAll('[data-step-target]')) {
            const step = Number(link.dataset.stepTarget);
            link.classList.toggle('is-current', step === current);
            link.classList.toggle('is-done', step < current);
            link.disabled = step > reached;
            if (step === current) link.setAttribute('aria-current', 'step');
            else link.removeAttribute?.('aria-current');
        }
        const root = form();
        if (!root) return;
        const back = root.querySelector('.wizard-back');
        const next = root.querySelector('.wizard-next');
        const submit = root.querySelector('[type="submit"]');
        if (back) back.hidden = current === 1;
        if (next) next.hidden = current === total;
        if (submit) submit.hidden = current !== total;
        root.dataset.step = String(current);
        // Harita, görünür olduğunda boyutunu doğru ölçebilsin diye 3. adımda açılır.
        if (current === 3) window.LocationPicker?.show(root);
    }

    function go(step, { check = true } = {}) {
        step = Math.max(1, Math.min(total, step));
        if (check && step > current) {
            for (let s = current; s < step; s++) {
                if (!validStep(s)) { current = s; render(); return false; }
            }
        }
        current = step;
        reached = Math.max(reached, step);
        render();
        const dialog = $('#editorDialog');
        if (dialog) dialog.scrollTop = 0;
        return true;
    }

    // Ana kategori kutucukları (Meyve, Tahıl, Yem/balya, Bal, Kuruyemiş, Arazi).
    function renderMainTiles() {
        const root = $('#mainCategoryTiles');
        const catalog = window.HasadimCatalog;
        if (!root || !catalog) return;
        const selected = form()?.elements.namedItem('kategori')?.value || '';
        root.replaceChildren();
        for (const c of catalog.categories) {
            const tile = document.createElement('button');
            tile.type = 'button';
            tile.className = 'main-category-tile' + (c.id === selected ? ' selected' : '');
            tile.dataset.category = c.id;
            tile.setAttribute('aria-pressed', String(c.id === selected));
            const icon = window.FruitIcons ? window.FruitIcons.node(c.icon, 34, 'tile-icon') : document.createElement('span');
            const name = document.createElement('strong');
            name.textContent = c.name;
            const count = document.createElement('small');
            count.textContent = c.land ? 'Tarla, bahçe, bağ…' : c.products.slice(0, 3).join(', ') + '…';
            tile.append(icon, name, count);
            tile.onclick = () => pickCategory(c.id, tile);
            root.append(tile);
        }
    }

    function pickCategory(id, tile) {
        const root = form();
        const before = root.elements.namedItem('kategori').value;
        if (before !== id) window.ListingCategory?.apply(root, id);
        renderMainTiles();
        refreshTiles();
        setError('');
        const tiles = $('#categoryTiles');
        if (tiles && before !== id) {
            tiles.classList.remove('is-entering');
            void tiles.offsetWidth;
            tiles.classList.add('is-entering');
            setTimeout(() => tiles.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' }), 120);
        }
        void tile;
    }

    // Ürün kutucukları seçili kategorinin ürünleriyle dolar.
    function refreshTiles() {
        renderMainTiles();
        const root = $('#categoryTiles');
        const select = form()?.elements.namedItem('meyveTuru');
        if (!root || !select) return;
        root.replaceChildren();
        root.hidden = !form().elements.namedItem('kategori')?.value;
        const options = Array.from(select.options || select.children || []).filter(o => o.value);
        for (const o of options) {
            const tile = document.createElement('button');
            tile.type = 'button';
            tile.className = 'category-tile';
            tile.dataset.fruit = o.value;
            let icon;
            if (window.FruitIcons) icon = window.FruitIcons.node(o.value, 40, 'tile-icon');
            else { icon = document.createElement('span'); icon.className = 'tile-icon'; icon.textContent = window.MarketCatalog?.icon(o.value) || '🌱'; }
            const name = document.createElement('span');
            name.textContent = o.value;
            const check = document.createElement('span');
            check.className = 'tile-check'; check.setAttribute('aria-hidden', 'true');
            tile.append(icon, name, check);
            tile.onclick = () => pickFruit(o.value, tile);
            root.append(tile);
        }
        syncTiles(false);
    }

    function pickFruit(value, tile) {
        const select = form().elements.namedItem('meyveTuru');
        const changed = select.value !== value;
        select.value = value;
        // Çeşit listesi select'in change olayıyla yenilenir (fruit-varieties.js).
        if (changed && typeof select.dispatchEvent === 'function') select.dispatchEvent(new Event('change'));
        else { if (changed) select.onchange?.(); syncTiles(true); }
        setError('');
        // Seçim animasyonu: kutucuk "pop", ardından çeşit paneli kayarak açılır.
        tile?.classList.remove('just-picked');
        void tile?.offsetWidth;
        tile?.classList.add('just-picked');
        const panel = $('#varietyPanel');
        if (panel && !panel.hidden) setTimeout(() => panel.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' }), 180);
        // Çeşit seçilecek bir şey yoksa (arazi veya çeşidi tanımlı olmayan ürün) 1. adım tamamdır: sonraki adıma geç.
        const land = window.HasadimCatalog?.isLand(form().elements.namedItem('kategori')?.value);
        if (land || !(window.HasadimCatalog?.varieties(value) || []).length) autoNext(1);
    }

    // Bir adımın son seçimi yapılınca seçimin işaretlendiği kısa an görünsün, sonra sonraki adıma geçilsin.
    let advanceTimer = 0;
    function autoNext(from) {
        clearTimeout(advanceTimer);
        advanceTimer = setTimeout(() => {
            // Sessiz kontrol: eksik alan varsa uyarı balonu çıkarmadan bu adımda kalınır.
            const ok = fieldsOf(from).every(f => typeof f.checkValidity !== 'function' || f.checkValidity());
            if (current === from && ok) go(from + 1);
        }, 420);
    }

    // Seçili kutucuğu işaretler ve çeşit çiplerini çizer.
    function syncTiles(animate) {
        const select = form()?.elements.namedItem('meyveTuru');
        if (!select) return;
        for (const tile of document.querySelectorAll('#categoryTiles .category-tile')) {
            const on = tile.dataset.fruit === select.value;
            tile.classList.toggle('selected', on);
            tile.setAttribute('aria-pressed', String(on));
        }
        renderVarieties(animate);
    }

    function renderVarieties(animate) {
        const panel = $('#varietyPanel');
        const fruit = form()?.elements.namedItem('meyveTuru')?.value;
        const variety = form()?.elements.namedItem('cesit');
        if (!panel || !variety) return;
        const land = window.HasadimCatalog?.isLand(form()?.elements.namedItem('kategori')?.value);
        panel.hidden = !fruit || land || !(window.HasadimCatalog?.varieties(fruit) || []).length;
        if (panel.hidden) return;
        const title = panel.querySelector('.variety-title');
        if (title) title.textContent = fruit + ' çeşidini seç';
        const chips = panel.querySelector('.variety-chips');
        chips.replaceChildren();
        Array.from(variety.options || []).filter(o => o.value).forEach((o, i) => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'variety-chip' + (o.value === variety.value ? ' selected' : '');
            chip.textContent = o.value;
            chip.dataset.value = o.value;
            chip.setAttribute('aria-pressed', String(o.value === variety.value));
            chip.style?.setProperty?.('--i', String(i));
            chip.onclick = () => {
                variety.value = o.value;
                if (typeof variety.dispatchEvent === 'function') variety.dispatchEvent(new Event('change'));
                for (const c of chips.children) {
                    const on = c === chip;
                    c.classList.toggle('selected', on);
                    c.setAttribute('aria-pressed', String(on));
                }
                setError('');
                autoNext(1);
            };
            chips.append(chip);
        });
        if (animate) {
            panel.classList.remove('is-entering');
            void panel.offsetWidth;
            panel.classList.add('is-entering');
        }
    }

    function bind() {
        if (bound) return;
        const root = form();
        if (!root) return;
        bound = true;
        root.querySelector('.wizard-next')?.addEventListener('click', () => go(current + 1));
        root.querySelector('.wizard-back')?.addEventListener('click', () => go(current - 1, { check: false }));
        for (const link of document.querySelectorAll('[data-step-target]')) {
            link.addEventListener('click', () => go(Number(link.dataset.stepTarget)));
        }
        // Tarayıcı gizli bir adımda hatalı alan bulursa o adımı aç.
        root.addEventListener('invalid', event => {
            const step = stepOf(event.target);
            if (step && step !== current) { current = step; render(); }
        }, true);
        // Çeşit listesi önce yenilensin diye çizim bir sonraki adıma bırakılır.
        root.elements.namedItem('meyveTuru')?.addEventListener('change', () => setTimeout(() => syncTiles(true)));
        // Çeşit listeden seçilirse çipler de güncellenir.
        root.elements.namedItem('cesit')?.addEventListener('change', () => {
            const value = root.elements.namedItem('cesit').value;
            for (const c of document.querySelectorAll('#varietyPanel .variety-chip')) {
                const on = c.dataset.value === value;
                c.classList.toggle('selected', on);
                c.setAttribute('aria-pressed', String(on));
            }
        });
        // Enter tuşu ara adımlarda formu göndermek yerine ilerletir.
        root.addEventListener('keydown', event => {
            if (event.key !== 'Enter' || current === total) return;
            if (event.target?.tagName?.toLowerCase() === 'textarea') return;
            event.preventDefault();
            go(current + 1);
        });
    }

    // Yeni ilanda 1. adımdan başlar; düzenlemede tüm adımlar açıktır.
    function reset(editing = false) {
        bind();
        current = 1;
        reached = editing ? total : 1;
        setError('');
        render();
    }

    return { reset, go, refreshTiles, pickCategory, current: () => current };
})();
