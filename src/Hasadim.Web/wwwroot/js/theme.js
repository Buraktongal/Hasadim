'use strict';

// Tema ve dil tercihi. Sayfa çizilmeden önce (head içinde, defer olmadan)
// yüklenir; böylece koyu modda beyaz ekran yanıp sönmez.
(() => {
    const THEME = 'hasadim-theme', LANG = 'hasadim-lang';
    const read = (key, fallback) => { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } };
    const write = (key, value) => { try { localStorage.setItem(key, value); } catch { } };
    const media = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
    const root = document.documentElement;

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

    window.HasadimTheme = {
        get: () => read(THEME, 'system'),
        set(choice) { write(THEME, choice); apply(choice); },
        language: () => (read(LANG, 'tr') === 'en' ? 'en' : 'tr'),
        setLanguage(lang) { write(LANG, lang); root.lang = lang; },
        syncFromServer,
        apply
    };
})();
