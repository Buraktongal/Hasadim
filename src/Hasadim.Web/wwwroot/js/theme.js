'use strict';

// Tema ve dil tercihi. Sayfa çizilmeden önce (head içinde, defer olmadan)
// yüklenir; böylece koyu modda beyaz ekran yanıp sönmez.
(() => {
    const THEME = 'hasadim-theme', LANG = 'hasadim-lang';
    const read = (key, fallback) => { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } };
    const write = (key, value) => { try { localStorage.setItem(key, value); } catch { } };
    const media = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
    const root = document.documentElement;

    // Sayfalar arası geçiş animasyonu (CSS @view-transition) atlanırsa tarayıcı yakalanmamış hata yazar
    // ("Transition was aborted because of invalid state"). Atlanması zararsızdır; sessizce yut.
    // Sayfa açılır açılmaz pencere açılacaksa (ör. ?action=new-listing) animasyonu baştan atla.
    const quiet = vt => { for (const p of [vt?.ready, vt?.finished, vt?.updateCallbackDone]) p?.catch?.(() => { }); };
    addEventListener('pageswap', e => quiet(e.viewTransition));
    addEventListener('pagereveal', e => {
        if (!e.viewTransition) return;
        quiet(e.viewTransition);
        if (new URLSearchParams(location.search).has('action')) e.viewTransition.skipTransition();
    });

    function apply(choice = read(THEME, 'system')) {
        const dark = choice === 'dark' || (choice === 'system' && Boolean(media?.matches));
        root.dataset.theme = dark ? 'dark' : 'light';
        root.dataset.themeChoice = choice;
        root.style.colorScheme = dark ? 'dark' : 'light';
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', dark ? '#121a15' : '#1d4a33');
    }

    apply();
    media?.addEventListener?.('change', () => apply());
    root.lang = read(LANG, 'tr') === 'en' ? 'en' : 'tr';

    // Giriş yapan kullanıcının sunucudaki tercihleri oturum başına bir kez alınır
    // (başka cihazda yapılan değişiklik bu cihaza da gelir).
    async function syncFromServer() {
        try {
            if (sessionStorage.getItem('hasadim-settings-synced')) return;
            const r = await fetch('/api/me/settings');
            if (!r.ok) return;
            const s = await r.json();
            sessionStorage.setItem('hasadim-settings-synced', '1');
            const langChanged = (s.language || 'tr') !== read(LANG, 'tr');
            write(THEME, s.theme || 'system');
            write(LANG, s.language || 'tr');
            apply();
            if (langChanged) window.HasadimI18n?.setLanguage(s.language || 'tr');
        } catch { }
    }

    // Görünüm değişiminde içeriğin kısa bir kayma ile gelmesi (hareket azaltma tercihine uyar).
    window.HasadimMotion = {
        enter(target) {
            const el = typeof target === 'string' ? document.querySelector(target) : target;
            if (!el || matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
            el.classList.remove('view-enter');
            void el.offsetWidth;
            el.classList.add('view-enter');
        }
    };
    // Hesap ve araç sayfalarında içerik açılışta yumuşakça gelir.
    document.addEventListener('DOMContentLoaded', () => {
        const main = document.querySelector('main.account-page, main.tool-page, main.auth-main');
        if (main) window.HasadimMotion.enter(main);
    });

    window.HasadimTheme = {
        get: () => read(THEME, 'system'),
        set(choice) { write(THEME, choice); apply(choice); },
        language: () => (read(LANG, 'tr') === 'en' ? 'en' : 'tr'),
        setLanguage(lang) { write(LANG, lang); root.lang = lang; },
        syncFromServer,
        apply
    };
})();

// Tarih alanları: yalnızca küçük takvim simgesine değil, alanın herhangi bir yerine
// tıklanınca da takvim açılır (Chrome, Edge, Safari 16+, Firefox 101+).
document.addEventListener('click', event => {
    const input = event.target instanceof Element ? event.target.closest('input[type="date"], input[type="month"], input[type="time"], input[type="datetime-local"]') : null;
    if (!input || input.disabled || input.readOnly || typeof input.showPicker !== 'function') return;
    if (Date.now() - (Number(input.dataset.pickerAt) || 0) < 400) return;
    input.dataset.pickerAt = String(Date.now());
    try { input.showPicker(); } catch { /* bazı tarayıcılar yalnızca simgeden açar */ }
});
