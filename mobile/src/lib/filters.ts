import { useEffect, useState } from 'react';

// Pazar filtreleri: ana ekran ve filtre ekranı aynı durumu paylaşır.
export type Filters = Partial<Record<FilterKey, string>>;
export const FILTER_KEYS = ['q', 'kategori', 'islemTipi', 'meyveTuru', 'cesit', 'il', 'ilce', 'minFiyat', 'maxFiyat', 'minMiktar', 'maxMiktar', 'ambalaj', 'teslimat', 'imarDurumu', 'tapuDurumu', 'sort'] as const;
export type FilterKey = typeof FILTER_KEYS[number];

let current: Filters = {};
const listeners = new Set<(f: Filters) => void>();

export function setFilters(next: Filters) {
    const clean: Filters = {};
    for (const k of FILTER_KEYS) { const v = next[k]?.trim(); if (v) clean[k] = v.slice(0, 150); }
    current = clean;
    listeners.forEach(l => l(current));
}
export const getFilters = () => current;
export function useFilters(): [Filters, (f: Filters) => void] {
    const [f, setF] = useState(current);
    useEffect(() => { listeners.add(setF); return () => { listeners.delete(setF); }; }, []);
    return [f, setFilters];
}

// URLSearchParams React Native'de eksik olduğundan sorgu metni elle kurulur.
export function qs(params: Record<string, string | number | boolean | undefined | null>): string {
    return Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(String(v)))
        .join('&');
}

export function parseQs(query: string): Filters {
    const out: Filters = {};
    for (const part of query.replace(/^\?/, '').split('&')) {
        if (!part) continue;
        const [k, v = ''] = part.split('=');
        let key: string, value: string;
        try { key = decodeURIComponent(k!); value = decodeURIComponent(v.replace(/\+/g, ' ')); } catch { continue; }
        if ((FILTER_KEYS as readonly string[]).includes(key)) out[key as FilterKey] = value;
    }
    return out;
}

export const activeFilterCount = (f: Filters) => FILTER_KEYS.filter(k => k !== 'sort' && k !== 'q' && f[k]).length;
