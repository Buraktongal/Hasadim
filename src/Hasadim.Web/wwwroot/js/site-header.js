'use strict';

// Pazar yeri dışındaki sayfalarda (Profilim, Satıcı, Hesap güvenliği) ortak üst
// menüyü çalıştırır: hesap menüsü, arama, İlan ver, kategori çubuğu ve
// okunmamış mesaj sayısı. Pazar yerinde bu işleri app.js yapar.
(async () => {
    try { await window.layoutReady; } catch { return; }
    const $ = s => document.querySelector(s);
    const login = target => '/html/giris.html?returnUrl=' + encodeURIComponent(target);
    let user = null, csrf = '';

    async function api(path, method = 'GET') {
        const headers = {};
        if (method !== 'GET') {
            if (!csrf) csrf = (await (await fetch('/api/csrf')).json()).token;
            headers['X-CSRF-TOKEN'] = csrf;
        }
        const r = await fetch(path, { method, headers });
        const text = await r.text();
        if (!r.ok) throw Error('İşlem tamamlanamadı.');
        return text ? JSON.parse(text) : null;
    }

    // Kategori çubuğu her sayfada aynı.
    window.MarketCatalog?.highlight({});

    const menu = $('#accountMenu');
    const closeMenu = () => { if (menu) menu.open = false; };
    document.addEventListener('click', e => { if (menu?.open && e.target.isConnected && (!menu.contains(e.target) || e.target.closest('.account-menu-panel a:not([data-menu-settings])'))) closeMenu(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu?.open) { closeMenu(); menu.querySelector('summary')?.focus(); } });

    // Menüdeki görünüm düğmeleri pazar yerinin ilgili sekmesini açar.
    for (const item of document.querySelectorAll('[data-view]')) {
        item.onclick = () => { location.href = item.dataset.view === 'all' ? '/' : '/?view=' + encodeURIComponent(item.dataset.view); };
    }
    const search = $('#globalQuery')?.closest('form');
    if (search) search.onsubmit = e => {
        e.preventDefault();
        const q = $('#globalQuery').value.trim().slice(0, 150);
        location.href = '/' + (q ? '?q=' + encodeURIComponent(q) : '');
    };
    const newListing = () => { location.href = user ? '/?action=new-listing' : login('/?action=new-listing'); };
    if ($('#newBtn')) $('#newBtn').onclick = newListing;
    for (const b of document.querySelectorAll('[data-account-action="create-listing"]')) b.onclick = newListing;
    if ($('#accountBtn')) $('#accountBtn').onclick = () => { location.href = user ? '/html/profilim.html' : login(location.pathname + location.search); };
    if ($('#logoutBtn')) $('#logoutBtn').onclick = async () => {
        closeMenu();
        const message = 'Hesabından çıkış yapmak istediğine emin misin?';
        const ok = window.HasadimConfirm ? await window.HasadimConfirm(message, { title: 'Çıkış yap', okText: 'Çıkış yap' }) : confirm(message);
        if (!ok) return;
        try { await api('/api/account/logout', 'POST'); } finally { location.href = '/'; }
    };
    if ($('#dismissMessageAlert')) $('#dismissMessageAlert').onclick = () => { $('#messageAlert').hidden = true; };

    try { user = await api('/api/account/me'); } catch { user = null; }
    if ($('#accountMenuName')) $('#accountMenuName').textContent = user?.displayName || 'Hesabım';
    if ($('#accountBtn')) $('#accountBtn').textContent = user ? 'Profilim' : 'Giriş yap';
    if ($('#logoutBtn')) $('#logoutBtn').hidden = !user;
    if ($('#securityLink')) $('#securityLink').hidden = !user;
    if ($('#adminNav')) $('#adminNav').hidden = !user?.isAdmin;
    for (const item of document.querySelectorAll('[data-auth-menu]')) item.hidden = !user;
    void window.NotificationBell?.refresh(user);
    window.dispatchEvent(new CustomEvent('hasadim:user', { detail: user }));

    if (!user) return;
    try {
        const state = await api('/api/messages/notifications');
        for (const badge of document.querySelectorAll('[data-message-count]')) {
            badge.textContent = state.unreadCount > 99 ? '99+' : String(state.unreadCount);
            badge.hidden = !state.unreadCount;
        }
    } catch { /* Bildirim sayısı isteğe bağlıdır. */ }
})();
