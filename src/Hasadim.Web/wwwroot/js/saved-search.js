'use strict';

// Pazar yerinde "Bu aramayı kaydet" düğmesi. Kayıtlı aramalar Hesabım →
// Kayıtlı aramalar sayfasında listelenir; yeni ilan gelince bildirim gönderilir.
window.SavedSearch = (() => {
    let form = null;
    let options = {};

    // Kısa ve anlaşılır bir arama adı önerir: "Elma · Isparta · en çok 30 TL".
    function suggestName(f) {
        const v = name => f.elements.namedItem(name)?.value?.trim() || '';
        const category = v('kategori') ? window.HasadimCatalog?.category(v('kategori'))?.name : '';
        const parts = [v('meyveTuru') || category, v('cesit'), v('ilce') ? v('il') + ' / ' + v('ilce') : v('il')].filter(Boolean);
        if (v('q')) parts.unshift('“' + v('q') + '”');
        if (v('maxFiyat')) parts.push('en çok ' + v('maxFiyat') + ' TL');
        return (parts.join(' · ') || 'Tüm ilanlar').slice(0, 80);
    }

    function sync(f, enabled) {
        form = f;
        const b = document.querySelector('#saveSearch');
        if (!b) return;
        const query = window.MarketCatalog?.queryString(f) || '';
        b.hidden = !enabled || !query.replace(/(^|&)sort=[^&]*/g, '');
    }

    async function save() {
        const { api, toast, requireLogin } = options;
        if (!form || !requireLogin?.()) return;
        const ask = window.HasadimPrompt || ((m, o) => Promise.resolve(window.prompt ? window.prompt(m, o.value) : o.value));
        const name = await ask('Bu aramaya bir ad ver. Uyan yeni ilan yayına girince haber vereceğiz.', { title: 'Aramayı kaydet', value: suggestName(form), okText: 'Kaydet' });
        if (name === null) return;
        const trimmed = String(name || '').trim();
        if (trimmed.length < 2) { toast?.('Arama adı en az 2 karakter olmalı.'); return; }
        try {
            await api('/api/saved-searches', 'POST', { name: trimmed.slice(0, 80), query: window.MarketCatalog.queryString(form), notify: true });
            toast?.('Arama kaydedildi. Yeni ilanlar için bildirim alacaksın.');
        } catch (e) { toast?.(e.message); }
    }

    function bind(opts) {
        options = opts;
        const b = document.querySelector('#saveSearch');
        if (b) b.onclick = save;
    }

    return { sync, bind, suggestName };
})();
