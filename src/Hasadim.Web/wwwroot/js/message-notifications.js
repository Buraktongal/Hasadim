'use strict';
window.HasadimMessageNotifications = {
    create({ api, currentUser, onChange }) {
        let timer, running = false, busy = false, owner = null, latest = null, unreadLatest = null;
        const banner = document.querySelector('#messageAlert');
        const text = document.querySelector('#messageAlertText');
        const badges = document.querySelectorAll('[data-message-count]');
        document.querySelector('#dismissMessageAlert').onclick = () => { banner.hidden = true; };
        function paint(count) {
            for (const badge of badges) {
                badge.textContent = count > 99 ? '99+' : String(count);
                badge.hidden = count === 0;
                badge.setAttribute('aria-label', count + ' okunmamış mesaj');
            }
            if (!count) banner.hidden = true;
            text.textContent = count + ' okunmamış mesajın var';
        }
        async function refresh() {
            const user = currentUser();
            if (!user) { owner = latest = unreadLatest = null; paint(0); return; }
            if (busy) return;
            if (owner !== user.id) { owner = user.id; latest = unreadLatest = null; paint(0); }
            busy = true;
            try {
                const state = await api('/api/messages/notifications');
                if (currentUser()?.id !== user.id) return;
                const changed = latest !== state.latestMessageId;
                const newUnread = state.unreadCount > 0 && unreadLatest !== state.latestUnreadId;
                latest = state.latestMessageId; unreadLatest = state.latestUnreadId;
                paint(state.unreadCount);
                if (newUnread) banner.hidden = false;
                await onChange(changed);
            } catch { /* A temporary network error must not erase unread state or drafts. */ }
            finally { busy = false; }
        }
        async function tick() {
            clearTimeout(timer);
            await refresh();
            clearTimeout(timer);
            if (running) timer = setTimeout(tick, document.hidden ? 30000 : 10000);
        }
        function start() { if (running) return; running = true; void tick(); }
        function stop() { running = false; clearTimeout(timer); }
        document.addEventListener('visibilitychange', () => { if (running && !document.hidden) { clearTimeout(timer); void tick(); } });
        window.addEventListener?.('pagehide', stop);
        window.addEventListener?.('pageshow', () => { if (!running) start(); });
        return { start, stop, refresh };
    }
};
