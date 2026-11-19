'use strict';

// Üst menüdeki zil: okunmamış bildirim ve yanıt bekleyen teklif sayısı.
// app.js ve site-header.js oturum bilgisini aldıktan sonra refresh(user) çağırır.
window.NotificationBell = (() => {
    let timer = null;
    let lastUser = null;

    function paint(selector, count) {
        for (const badge of document.querySelectorAll(selector)) {
            badge.textContent = count > 99 ? '99+' : String(count);
            badge.hidden = !count;
        }
    }

    async function refresh(user = lastUser) {
        lastUser = user;
        const bell = document.querySelector('#notificationBell');
        if (bell) bell.hidden = !user;
        if (!user) { paint('[data-notification-count]', 0); paint('[data-offer-count]', 0); return; }
        void window.HasadimTheme?.syncFromServer();
        try {
            const r = await fetch('/api/notifications/count');
            if (!r.ok) return;
            const data = await r.json();
            paint('[data-notification-count]', data.unread || 0);
            paint('[data-offer-count]', data.pendingOffers || 0);
            if (bell) bell.setAttribute('aria-label', data.unread ? 'Bildirimler — ' + data.unread + ' okunmamış' : 'Bildirimler');
        } catch { /* Sayılar isteğe bağlıdır. */ }
        // Sekme açıkken dakikada bir güncellenir.
        clearTimeout(timer);
        timer = setTimeout(() => { if (!document.hidden) void refresh(); else timer = setTimeout(() => refresh(), 60000); }, 60000);
    }

    return { refresh };
})();
