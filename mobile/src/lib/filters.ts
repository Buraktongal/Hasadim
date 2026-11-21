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

// Fiyat ve miktar aralıkları (en az + en çok) tek filtre sayılır.
export const activeFilterCount = (f: Filters) =>
    FILTER_KEYS.filter(k => !['sort', 'q', 'maxFiyat', 'maxMiktar', 'minFiyat', 'minMiktar'].includes(k) && f[k]).length
    + (f.minFiyat || f.maxFiyat ? 1 : 0) + (f.minMiktar || f.maxMiktar ? 1 : 0);

// Ana ekranda × ile tek tek kaldırılabilen etkin filtre etiketleri.
export type FilterTag = { key: string; label: string; clear: Filters };
const money = (v: string) => Number(v).toLocaleString('tr-TR', { maximumFractionDigits: 2 }) + ' ₺';
function range(lo: string | undefined, hi: string | undefined, fmt: (v: string) => string): string {
    if (lo && hi) return fmt(lo) + ' – ' + fmt(hi);
    return lo ? fmt(lo) + ' ve üstü' : '≤ ' + fmt(hi!);
}
export function filterTags(f: Filters, unit = ''): FilterTag[] {
    const out: FilterTag[] = [];
    const simple: [FilterKey, Filters][] = [
        ['meyveTuru', { meyveTuru: '', cesit: '' }], ['cesit', { cesit: '' }], ['il', { il: '', ilce: '' }], ['ilce', { ilce: '' }],
        ['ambalaj', { ambalaj: '' }], ['teslimat', { teslimat: '' }], ['imarDurumu', { imarDurumu: '' }], ['tapuDurumu', { tapuDurumu: '' }]
    ];
    for (const [k, clear] of simple) if (f[k]) out.push({ key: k, label: f[k]!, clear });
    if (f.islemTipi) out.push({ key: 'islemTipi', label: f.islemTipi === 'Kiralik' ? 'Kiralık' : 'Satılık', clear: { islemTipi: '' } });
    if (f.minFiyat || f.maxFiyat) out.push({ key: 'fiyat', label: 'Fiyat: ' + range(f.minFiyat, f.maxFiyat, money), clear: { minFiyat: '', maxFiyat: '' } });
    if (f.minMiktar || f.maxMiktar) out.push({ key: 'miktar', label: 'Miktar: ' + range(f.minMiktar, f.maxMiktar, v => Number(v).toLocaleString('tr-TR') + (unit ? ' ' + unit : '')), clear: { minMiktar: '', maxMiktar: '' } });
    return out;
}
