'use strict';

// Sol üstteki menüde "Ayarlar": ayrı sayfaya gitmeden menünün içinde sola kayarak açılır.
// Ayarlar → Görünüm / Dil / Bildirimler alt ekranları da aynı şekilde açılır; küçük geri
// düğmesi bir önceki ekrana kayarak döner. Değişiklikler hemen uygulanır.
(() => {
    const node = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
    let panel, stack = [], user, settings = null, saving = Promise.resolve();

    const theme = () => window.HasadimTheme?.get() || 'system';
    const language = () => window.HasadimTheme?.language() || 'tr';

    async function loadUser() {
        if (user !== undefined) return user;
        try { const r = await fetch('/api/account/me'); user = r.ok ? await r.json() : null; } catch { user = null; }
        return user;
    }

    async function loadSettings() {
        if (settings || !await loadUser()) return settings;
        try { const r = await fetch('/api/me/settings'); if (r.ok) settings = await r.json(); } catch { }
        return settings;
    }

    // Tercihler cihazda hemen uygulanır; giriş yapılmışsa sunucuya da kaydedilir.
    function save(patch) {
        settings = { language: language(), theme: theme(), notifyMessages: true, notifyOffers: true, notifySavedSearches: true, notifyPriceDrops: true, ...(settings || {}), ...patch };
        if (patch.theme) window.HasadimTheme?.set(patch.theme);
        if (patch.language && patch.language !== language()) {
            window.HasadimTheme?.setLanguage(patch.language);
            window.HasadimI18n?.setLanguage(patch.language);
        }
        if (!user || !window.HasadimApi) return;
        saving = saving.then(() => window.HasadimApi('/api/me/settings', 'PUT', settings).catch(() => { }));
    }

    function row({ icon, title, sub, onClick, href, danger }) {
        const el = node(href ? 'a' : 'button', undefined, 'menu-sub-row' + (danger ? ' is-danger' : ''));
        if (href) el.href = href; else { el.type = 'button'; el.onclick = onClick; }
        const ic = node('span', icon, 'menu-sub-icon'); ic.setAttribute('aria-hidden', 'true');
        const text = node('span', undefined, 'menu-sub-text');
        text.append(node('strong', title));
        if (sub) text.append(node('small', sub));
        const arrow = node('span', '›', 'menu-sub-arrow'); arrow.setAttribute('aria-hidden', 'true');
        el.append(ic, text, arrow);
        return el;
    }

    function option(name, value, title, sub, checked, onChange, disabled) {
        const label = node('label', undefined, 'menu-option' + (disabled ? ' is-disabled' : ''));
        const input = node('input');
        input.type = 'radio'; input.name = name; input.value = value; input.checked = checked; input.disabled = Boolean(disabled);
        input.onchange = () => onChange(value);
        const text = node('span', undefined, 'menu-sub-text');
        text.append(node('strong', title));
        if (sub) text.append(node('small', sub));
        label.append(input, text);
        return label;
    }

    function toggle(title, sub, checked, onChange) {
        const label = node('label', undefined, 'menu-switch');
        const text = node('span', undefined, 'menu-sub-text');
        text.append(node('strong', title));
        if (sub) text.append(node('small', sub));
        const input = node('input');
        input.type = 'checkbox'; input.checked = checked; input.setAttribute('role', 'switch');
        input.onchange = () => onChange(input.checked);
        label.append(text, input);
        return label;
    }

    // ---- Ekranlar ----
    const screens = {
        async root() {
            const u = await loadUser();
            const list = node('div', undefined, 'menu-sub-list');
            const t = theme();
            list.append(
                row({ icon: '🎨', title: 'Görünüm', sub: t === 'system' ? 'Cihaza göre' : t === 'dark' ? 'Koyu mod' : 'Açık mod', onClick: () => open('appearance') }),
                row({ icon: '🌐', title: 'Dil / Language', sub: language() === 'en' ? 'English' : 'Türkçe', onClick: () => open('language') }));
            if (u) {
                list.append(
                    row({ icon: '🔔', title: 'Bildirim tercihleri', sub: 'Hangi bildirimleri alacağını seç', onClick: () => open('notifications') }),
                    row({ icon: '👤', title: 'Profil bilgilerim', sub: 'Ad, telefon ve görünürlük', href: '/html/profilim.html' }),
                    row({ icon: '🚫', title: 'Engellenen üyeler', sub: 'Engellediğin üyeleri yönet', href: '/html/engellenenler.html' }),
                    row({ icon: '🔒', title: 'Hesap güvenliği', sub: 'Şifre ve oturumlar', href: '/html/hesabim.html' }),
                    row({ icon: '🗑️', title: 'Hesabı sil', sub: 'Hesabını ve ilanlarını kalıcı olarak sil', href: '/html/ayarlar.html#hesap-sil', danger: true }));
            }
            return ['Ayarlar', list];
        },
        appearance() {
            const box = node('div', undefined, 'menu-sub-list');
            const render = () => {
                const t = theme();
                const follow = t === 'system';
                const shown = follow ? (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light') : t;
                box.replaceChildren(
                    toggle('Cihaza göre', 'Telefonun veya bilgisayarın ayarını izler', follow, on => { save({ theme: on ? 'system' : shown }); render(); }),
                    option('menuTheme', 'light', 'Açık mod', 'Gündüz kullanımı için', shown === 'light', v => { save({ theme: v }); render(); }, follow),
                    option('menuTheme', 'dark', 'Koyu mod', 'Karanlık ortamlar için', shown === 'dark', v => { save({ theme: v }); render(); }, follow));
            };
            render();
            return ['Görünüm', box];
        },
        language() {
            const box = node('div', undefined, 'menu-sub-list');
            const render = () => box.replaceChildren(
                option('menuLanguage', 'tr', 'Türkçe', 'Varsayılan dil', language() === 'tr', v => { save({ language: v }); render(); }),
                option('menuLanguage', 'en', 'English', 'Menus and pages in English', language() === 'en', v => { save({ language: v }); render(); }));
            render();
            return ['Dil / Language', box];
        },
        async notifications() {
            const s = await loadSettings() || {};
            const box = node('div', undefined, 'menu-sub-list');
            for (const [key, title, sub] of [
                ['notifyMessages', 'Mesajlar', 'Yeni mesaj geldiğinde'],
                ['notifyOffers', 'Teklifler', 'Teklif geldiğinde veya yanıtlandığında'],
                ['notifySavedSearches', 'Kayıtlı aramalar', 'Uyan yeni ilan yayına girdiğinde'],
                ['notifyPriceDrops', 'Fiyat düşüşleri', 'Favorindeki ilanın fiyatı düştüğünde']
            ]) box.append(toggle(title, sub, s[key] !== false, on => save({ [key]: on })));
            return ['Bildirim tercihleri', box];
        }
    };

    // Ekranı sağdan kaydırarak açar; geri dönüşte sola doğru kapanır.
    async function open(name) {
        const [title, body] = await screens[name]();
        const screen = node('section', undefined, 'menu-sub');
        screen.setAttribute('aria-label', title);
        const head = node('div', undefined, 'menu-sub-head');
        const back = node('button', '‹ Geri', 'menu-sub-back');
        back.type = 'button';
        back.onclick = event => { event.stopPropagation(); close(); };
        head.append(back, node('strong', title, 'menu-sub-title'));
        screen.append(head, body);
        const previous = stack.at(-1);
        stack.push(screen);
        panel.append(screen);
        panel.classList.add('has-sub');
        void screen.offsetWidth;
        screen.classList.add('is-in');
        previous?.classList.add('is-behind');
        panel.scrollTop = 0;
        back.focus({ preventScroll: true });
    }

    function close() {
        const screen = stack.pop();
        if (!screen) return;
        screen.classList.remove('is-in');
        const previous = stack.at(-1);
        if (previous) {
            previous.classList.remove('is-behind');
            // Üst ekrandaki özet (ör. "Koyu mod") güncel kalsın.
            if (!stack.slice(0, -1).length) refreshRoot(previous);
        } else panel.classList.remove('has-sub');
        setTimeout(() => screen.remove(), 260);
        (previous?.querySelector('.menu-sub-back') || panel.querySelector('[data-menu-settings]'))?.focus({ preventScroll: true });
    }

    async function refreshRoot(screen) {
        const [, body] = await screens.root();
        screen.querySelector('.menu-sub-list')?.replaceWith(body);
    }

    function reset() {
        for (const s of stack) s.remove();
        stack = [];
        panel?.classList.remove('has-sub');
    }

    async function init() {
        try { await window.layoutReady; } catch { return; }
        const menu = document.querySelector('#accountMenu');
        panel = menu?.querySelector('.account-menu-panel');
        const link = panel?.querySelector('a[href="/html/ayarlar.html"]');
        if (!panel || !link) return;
        link.dataset.menuSettings = '';
        link.classList.add('menu-settings-link');
        link.setAttribute('aria-haspopup', 'true');
        link.addEventListener('click', event => {
            event.preventDefault();
            void open('root');
        });
        menu.addEventListener('toggle', () => { if (!menu.open) setTimeout(reset, 200); });
        panel.addEventListener('keydown', event => {
            if (event.key === 'Escape' && stack.length) { event.preventDefault(); event.stopPropagation(); close(); }
        });
        // Oturum değişince (giriş / çıkış) bir sonraki açılışta tekrar sorulur.
        window.addEventListener('hasadim:user', event => { user = event.detail || null; settings = null; });
    }

    void init();
})();
