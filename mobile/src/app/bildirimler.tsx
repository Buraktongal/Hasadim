import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { Button, Empty, ErrorBox, Header, IconButton, SignInRequired, Spinner, toast } from '../components/ui';
import { Icon } from '../components/Icon';
import { del, get, post } from '../lib/api';
import { useApp } from '../lib/app-state';
import { refreshCounts } from '../lib/counts';
import { timeAgo } from '../lib/format';
import { openAppLink } from '../lib/links';
import type { Notification } from '../lib/types';

const ICON: Record<string, string> = { message: '✉', 'offer-received': '₺', 'offer-accepted': '✓', 'offer-rejected': '×', 'offer-withdrawn': '↩', 'price-drop': '↓', 'saved-search': '☆', security: '!' };

// İngilizce arayüzde metin, bildirimdeki değerlerden yeniden yazılır (web ile aynı).
function englishBody(n: Notification): string | null {
    if (!n.data) return null;
    let d: Record<string, string | number>;
    try { d = JSON.parse(n.data); } catch { return null; }
    const price = (v: unknown, u: unknown) => '₺' + Number(v).toFixed(2) + (u === 'm2' ? '' : u === 'balya' ? '/bale' : '/kg');
    switch (n.kind) {
        case 'message': return `You have a new message about “${d.listing}”.`;
        case 'offer-received': return `New offer of ${price(d.amount, d.unit)} on “${d.listing}”.`;
        case 'offer-accepted': return `Your ${price(d.amount, d.unit)} offer on “${d.listing}” was accepted.`;
        case 'offer-rejected': return `Your ${price(d.amount, d.unit)} offer on “${d.listing}” was rejected.`;
        case 'offer-withdrawn': return `The ${price(d.amount, d.unit)} offer on “${d.listing}” was withdrawn.`;
        case 'price-drop': return `“${d.listing}” in your favorites dropped from ${price(d.oldPrice, d.unit)} to ${price(d.newPrice, d.unit)}.`;
        case 'saved-search': return `“${d.listing}” just went live and matches your saved search.`;
        default: return null;
    }
}

export default function Notifications() {
    const { colors: c, t, user, lang } = useApp();
    const [items, setItems] = useState<Notification[] | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async (p = 1) => {
        if (!user) return;
        setError(null);
        try {
            const r = await get<{ items: Notification[]; hasMore: boolean }>('/api/notifications?page=' + p);
            setItems(prev => (p === 1 ? r.items : [...(prev ?? []), ...r.items])); setHasMore(r.hasMore); setPage(p);
        } catch (e) { setError(e instanceof Error ? e.message : 'Bildirimler yüklenemedi.'); }
    }, [user]);
    useFocusEffect(useCallback(() => { void load(1); }, [load]));

    async function open(n: Notification) {
        if (!n.readAt) {
            setItems(all => all?.map(x => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)) ?? null);
            post('/api/notifications/' + n.id + '/read').then(refreshCounts).catch(() => undefined);
        }
        openAppLink(n.link);
    }

    if (!user) return <View style={{ flex: 1, backgroundColor: c.bg }}><Header title="Bildirimler" /><SignInRequired /></View>;
    return (
        <View style={{ flex: 1, backgroundColor: c.bg }}>
            <Header title="Bildirimler" right={items?.some(n => !n.readAt) ? <Button title="Tümünü okundu say" kind="plain" small full={false} onPress={async () => {
                try { await post('/api/notifications/read'); setItems(all => all?.map(x => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })) ?? null); void refreshCounts(); toast('Tüm bildirimler okundu.'); } catch (e) { toast(e instanceof Error ? e.message : 'İşlem tamamlanamadı.'); }
            }} /> : undefined} />
            {error ? <View style={{ padding: 12 }}><ErrorBox message={error} onRetry={() => load(1)} /></View> : null}
            {items === null ? <View style={{ padding: 40, alignItems: 'center' }}><Spinner size={46} /></View> : (
                <FlatList data={items} keyExtractor={n => n.id} contentContainerStyle={{ paddingBottom: 40 }}
                    onEndReached={() => { if (hasMore) void load(page + 1); }} onEndReachedThreshold={0.5}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(1); setRefreshing(false); }} tintColor={c.green2} colors={[c.green2]} />}
                    ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: c.line }} />}
                    ListEmptyComponent={<Empty title="Bildirimin yok" text="Teklif, mesaj, fiyat düşüşü ve kayıtlı arama bildirimleri burada görünür." />}
                    renderItem={({ item: n }) => (
                        <Pressable onPress={() => open(n)} style={({ pressed }) => ({ flexDirection: 'row', gap: 12, padding: 14, backgroundColor: pressed ? c.greenSoft : n.readAt ? c.bg : c.panel })}>
                            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: n.kind === 'security' ? c.dangerSoft : c.greenSoft, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ color: n.kind === 'security' ? c.danger : c.green2, fontSize: 17, fontWeight: '900' }}>{ICON[n.kind] ?? '•'}</Text>
                            </View>
                            <View style={{ flex: 1, gap: 2 }}>
                                <Text style={{ color: c.ink, fontWeight: n.readAt ? '700' : '900', fontSize: 15 }}>{t(n.title)}</Text>
                                <Text style={{ color: c.muted, fontSize: 13.5 }}>{(lang === 'en' && englishBody(n)) || n.body}</Text>
                                <Text style={{ color: c.muted, fontSize: 12 }}>{timeAgo(n.createdAt, lang)}</Text>
                            </View>
                            {!n.readAt ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: c.accent, marginTop: 6 }} /> : null}
                            <IconButton label="Bildirimi sil" size={34} onPress={async () => {
                                setItems(all => all?.filter(x => x.id !== n.id) ?? null);
                                try { await del('/api/notifications/' + n.id); void refreshCounts(); } catch { void load(1); }
                            }}><Icon name="trash" color={c.muted} size={17} /></IconButton>
                        </Pressable>
                    )} />
            )}
        </View>
    );
}
