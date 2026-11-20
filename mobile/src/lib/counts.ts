import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { get } from './api';

// Okunmamış mesaj ve bildirim sayıları. Uygulama öndeyken 30 saniyede bir yenilenir.
type Counts = { messages: number; notifications: number; offers: number };
let state: Counts = { messages: 0, notifications: 0, offers: 0 };
const listeners = new Set<(c: Counts) => void>();
const emit = () => listeners.forEach(l => l(state));

export async function refreshCounts() {
    try {
        const [m, n] = await Promise.all([
            get<{ unreadCount: number }>('/api/messages/notifications'),
            get<{ unread: number; pendingOffers: number }>('/api/notifications/count')
        ]);
        state = { messages: m.unreadCount ?? 0, notifications: n.unread ?? 0, offers: n.pendingOffers ?? 0 };
        emit();
    } catch { /* sayılar isteğe bağlıdır */ }
}

export function resetCounts() { state = { messages: 0, notifications: 0, offers: 0 }; emit(); }

export function useCounts(active: boolean) {
    const [counts, setCounts] = useState(state);
    useEffect(() => {
        listeners.add(setCounts);
        return () => { listeners.delete(setCounts); };
    }, []);
    useEffect(() => {
        if (!active) { resetCounts(); return; }
        void refreshCounts();
        let timer = setInterval(() => void refreshCounts(), 30_000);
        const sub = AppState.addEventListener('change', s => {
            clearInterval(timer);
            if (s === 'active') { void refreshCounts(); timer = setInterval(() => void refreshCounts(), 30_000); }
        });
        return () => { clearInterval(timer); sub.remove(); };
    }, [active]);
    return counts;
}
