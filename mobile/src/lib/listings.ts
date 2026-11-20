import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, del, get, post } from './api';
import { qs } from './filters';
import type { Listing, Paged } from './types';

export const PAGE_SIZE = 25;

// Sayfalı ilan listesi (sonsuz kaydırma). Yeni istek gelince eski yanıt yok sayılır.
export function useListingPages(query: Record<string, string | undefined>, enabled = true) {
    const [items, setItems] = useState<Listing[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const request = useRef(0);
    const key = qs(query);

    const load = useCallback(async (next: number, mode: 'reset' | 'more' | 'refresh') => {
        const id = ++request.current;
        if (mode === 'refresh') setRefreshing(true); else setLoading(true);
        setError(null);
        try {
            const r = await get<Paged<Listing>>('/api/meyve-ilanlari?' + (key ? key + '&' : '') + qs({ page: next, pageSize: PAGE_SIZE }));
            if (id !== request.current) return;
            setItems(prev => (mode === 'more' ? [...prev, ...r.items.filter(x => !prev.some(p => p.id === x.id))] : r.items));
            setTotal(r.total); setPage(next);
        } catch (e) {
            if (id === request.current) setError(e instanceof Error ? e.message : 'İlanlar yüklenemedi.');
        } finally {
            if (id === request.current) { setLoading(false); setRefreshing(false); }
        }
    }, [key]);

    useEffect(() => { if (enabled) void load(1, 'reset'); }, [load, enabled]);

    return {
        items, setItems, total, loading, refreshing, error,
        hasMore: items.length < total,
        more: () => { if (!loading && items.length < total) void load(page + 1, 'more'); },
        refresh: () => load(1, 'refresh'),
        reload: () => load(1, 'reset')
    };
}

// Favori ekle / çıkar; giriş yoksa giriş ekranı açılır. Hata olursa değişiklik geri alınır.
export async function toggleFavorite(x: Listing, signedIn: boolean, apply: (fav: boolean) => void) {
    if (!signedIn) { router.push('/giris'); return; }
    const next = !x.favorite;
    apply(next);
    try {
        if (next) await post('/api/meyve-ilanlari/' + x.id + '/favorite'); else await del('/api/meyve-ilanlari/' + x.id + '/favorite');
    } catch (e) {
        apply(!next);
        throw e instanceof ApiError ? e : new Error('Favori güncellenemedi.');
    }
}
