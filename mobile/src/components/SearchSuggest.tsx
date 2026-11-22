import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Keyboard, Pressable, Text, View } from 'react-native';
import { get } from '../lib/api';
import { useApp } from '../lib/app-state';
import { ACTIVITY, categories } from '../lib/catalog';
import { radius } from '../lib/theme';
import { Icon } from './Icon';
import { Photo } from './Photo';
import { ProductIcon } from './ProductIcon';

// Arama kutusu önerileri: eşleşen ürünler (pazar yerini o ürünle süzer) ve satıcılar (profilini açar).
export type SellerHit = { id: string; name: string; personName?: string | null; city: string; district: string; activity: string; photoUrl?: string | null; activeListingCount: number; emailVerified: boolean };

const fold = (s: string) => s.toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');
const cache = new Map<string, SellerHit[]>();

export function SearchSuggest({ q, onProduct, onSearch }: { q: string; onProduct: (kategori: string, product: string) => void; onSearch: () => void }) {
    const { colors: c, t } = useApp();
    const term = q.trim();
    const [sellers, setSellers] = useState<SellerHit[]>([]);
    const products = useMemo(() => {
        if (term.length < 2) return [];
        const n = fold(term), out: { p: string; cat: string; name: string; rank: number }[] = [];
        for (const cat of categories) for (const p of cat.products) { const f = fold(p); if (f.includes(n)) out.push({ p, cat: cat.id, name: cat.name, rank: f.startsWith(n) ? 0 : 1 }); }
        return out.sort((a, b) => a.rank - b.rank || a.p.localeCompare(b.p, 'tr')).slice(0, 4);
    }, [term]);

    useEffect(() => {
        if (term.length < 2) { setSellers([]); return; }
        const key = fold(term);
        if (cache.has(key)) { setSellers(cache.get(key)!); return; }
        let live = true;
        const timer = setTimeout(() => {
            get<SellerHit[]>('/api/profiles/search?q=' + encodeURIComponent(term))
                .then(list => { cache.set(key, list); if (live) setSellers(list); })
                .catch(() => { if (live) setSellers([]); });
        }, 220);
        return () => { live = false; clearTimeout(timer); };
    }, [term]);

    if (term.length < 2) return null;
    const row = (key: string, icon: React.ReactNode, title: string, sub: string | null, onPress: () => void, raw = true) => (
        <Pressable key={key} onPress={() => { Keyboard.dismiss(); onPress(); }} accessibilityRole="button"
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: pressed ? c.greenSoft : 'transparent' })}>
            {icon}
            <View style={{ flex: 1 }}>
                <Text style={{ color: c.ink, fontWeight: '800', fontSize: 15 }} numberOfLines={1}>{raw ? title : t(title)}</Text>
                {sub ? <Text style={{ color: c.muted, fontSize: 12.5 }} numberOfLines={1}>{sub}</Text> : null}
            </View>
        </Pressable>
    );
    const head = (label: string) => <Text style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 2, color: c.muted, fontSize: 11.5, fontWeight: '800', letterSpacing: 0.6 }}>{t(label).toLocaleUpperCase('tr')}</Text>;
    const bubble = (child: React.ReactNode) => <View style={{ width: 36, height: 36, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: c.greenSoft }}>{child}</View>;

    return (
        <View style={{ borderRadius: radius.m, borderWidth: 1, borderColor: c.line, backgroundColor: c.panel, overflow: 'hidden', paddingBottom: 4 }}>
            {products.length ? head('Ürünler') : null}
            {products.map(x => row('p' + x.p, bubble(<ProductIcon name={x.p} size={24} />), x.p, t(x.name), () => onProduct(x.cat, x.p)))}
            {sellers.length ? head('Satıcılar') : null}
            {sellers.map(s => row('s' + s.id,
                bubble(s.photoUrl ? <Photo url={s.photoUrl} product="" style={{ width: 36, height: 36, borderRadius: 18 }} /> : <Text style={{ color: c.green2, fontWeight: '900', fontSize: 16 }}>{s.name.trim().slice(0, 1).toLocaleUpperCase('tr')}</Text>),
                s.name + (s.emailVerified ? ' ✓' : ''),
                [s.personName, t(ACTIVITY[s.activity] ?? 'Satıcı'), [s.district, s.city].filter(Boolean).join(', '), s.activeListingCount + ' ' + t('ilan')].filter(Boolean).join(' · '),
                () => router.push({ pathname: '/satici/[id]', params: { id: s.id } })))}
            {row('all', bubble(<Icon name="search" color={c.green2} size={18} />), t('İlanlarda ara') + ': “' + term + '”', null, onSearch)}
        </View>
    );
}
