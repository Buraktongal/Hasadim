import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Linking, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../components/Icon';
import { Photo } from '../../components/Photo';
import { FramedImage, PhotoViewer } from '../../components/ProfileMedia';
import { ProductIcon } from '../../components/ProductIcon';
import { useShare } from '../../components/ShareSheet';
import { Chevron, Chip, Empty, ErrorBox, goBack, Spinner, toast } from '../../components/ui';
import { get } from '../../lib/api';
import { useApp } from '../../lib/app-state';
import { ACTIVITY, category, seasons } from '../../lib/catalog';
import { date, monthNames, number, priceText, qtyText, timeAgo, unitLabel } from '../../lib/format';
import { radius } from '../../lib/theme';
import type { Listing, PublicProfile } from '../../lib/types';

// Herkese açık satıcı profili: kapak, fotoğraf, rozetler, iletişim; hazır stok, hasat takvimi,
// hakkında ve ürüne göre süzülebilen ilanlar (web'deki satıcı sayfasıyla aynı düzen).
type Page = { items: Listing[]; total: number; pageSize: number };
const month = new Date().getMonth() + 1;
const inSeason = (product: string) => Boolean(seasons[product]?.[0].includes(month));

export default function Seller() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors: c, t, lang, user, dark } = useApp();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const valid = /^[0-9a-f-]{36}$/i.test(id ?? '');
    const [p, setP] = useState<PublicProfile | null>(null);
    const [items, setItems] = useState<Listing[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState('');
    const [phoneShown, setPhoneShown] = useState(false);
    const [viewing, setViewing] = useState<string | null>(null);
    const sharer = useShare();
    const [now] = useState(() => Date.now());
    const [solid, setSolid] = useState(false); // kapak geçilince üstte adın yazdığı düz çubuk çıkar

    useEffect(() => {
        if (!valid) { setError('Satıcı bağlantısı geçersiz.'); return; }
        let live = true;
        (async () => {
            try {
                const profile = await get<PublicProfile>('/api/profiles/' + id);
                if (live) setP(profile);
                const all: Listing[] = [];
                for (let page = 1; page <= 4; page++) {
                    const r = await get<Page>(`/api/meyve-ilanlari?ownerId=${id}&pageSize=100&page=${page}`);
                    all.push(...r.items);
                    if (page * r.pageSize >= r.total) break;
                }
                if (live) setItems(all);
            } catch (e) { if (live) setError(e instanceof Error ? e.message : 'Satıcı yüklenemedi.'); }
        })();
        return () => { live = false; };
    }, [id, valid]);

    const list = useMemo(() => items ?? [], [items]);
    const products = useMemo(() => {
        const m = new Map<string, number>();
        for (const x of list) m.set(x.meyveTuru, (m.get(x.meyveTuru) ?? 0) + 1);
        return [...m.entries()].sort((a, b) => b[1] - a[1]);
    }, [list]);
    const stock = useMemo(() => {
        const g = new Map<string, { product: string; unit: string; qty: number; min: number; max: number }>();
        for (const x of list) {
            if (x.kategori === 'Arazi') continue;
            const k = x.meyveTuru + '|' + x.birim;
            const v = g.get(k) ?? { product: x.meyveTuru, unit: x.birim, qty: 0, min: Infinity, max: 0 };
            v.qty += Number(x.miktarKg) || 0; v.min = Math.min(v.min, x.kilogramFiyati); v.max = Math.max(v.max, x.kilogramFiyati);
            g.set(k, v);
        }
        return [...g.values()].sort((a, b) => b.qty - a.qty).slice(0, 6);
    }, [list]);
    const shown = filter ? list.filter(x => x.meyveTuru === filter) : list;
    const name = p ? p.businessName || p.displayName : '';
    const place = p ? [p.district, p.city].filter(Boolean).join(', ') : '';
    const isNew = p?.memberSince ? now - new Date(p.memberSince).getTime() < 30 * 864e5 : false;
    const colW = (width - 12 * 2 - 10) / 2;

    const share = () => p && sharer.open({ title: name + ' — Hasadım', text: name + ' · ' + t('Hasadım satıcı profili'), path: '/html/satici.html?id=' + p.id });
    const phone = () => {
        if (!p) return;
        if (!p.phone) { if (!user) router.push('/giris'); else toast('Satıcı numarasını paylaşmıyor.'); return; }
        if (!phoneShown) { setPhoneShown(true); return; }
        void Linking.openURL('tel:' + p.phone.replace(/[^0-9+]/g, ''));
    };
    const message = () => {
        if (!user) { router.push('/giris'); return; }
        if (p?.isMine || p?.id === user.id) { toast('Kendine mesaj gönderemezsin.'); return; }
        if (!list.length) { toast('Mesaj göndermek için satıcının yayında bir ilanı olmalı.'); return; }
        // Doğrudan mesaj ekranına gidilir: bu kişiyle önceki tüm yazışmalar orada görünür; yeni mesaj en yeni ilan üzerinden gider.
        openChat(list[0]!);
    };
    const openChat = (x: Listing) => { router.push({ pathname: '/sohbet', params: { listingId: x.id, userId: x.ownerId, name: x.ownerName, title: x.baslik } }); };

    const header = p ? (
        <View style={{ gap: 12, marginBottom: 6 }}>
            {/* Kapak ve fotoğraf */}
            <View style={{ marginHorizontal: -12, marginTop: -12 }}>
                <Pressable disabled={!p.coverUrl} onPress={() => setViewing(p.coverUrl ?? null)} style={{ height: 170 + insets.top, backgroundColor: dark ? '#1f4a2f' : '#2f7a4a', overflow: 'hidden' }}>
                    <View style={{ position: 'absolute', right: -50, top: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: '#ffffff1c' }} />
                    <View style={{ position: 'absolute', left: -40, bottom: -100, width: 200, height: 200, borderRadius: 100, backgroundColor: '#ffffff14' }} />
                    <FramedImage url={p.coverUrl} frame={p.coverFrame} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
                    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: insets.top + 60, backgroundColor: '#00000033' }} />
                    {place ? <View style={{ position: 'absolute', right: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#0007', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
                        <Icon name="pin" color="#fff" size={13} /><Text style={{ color: '#fff', fontSize: 12.5, fontWeight: '700' }}>{place}</Text>
                    </View> : null}
                </Pressable>
                {/* Fotoğraf kapağın üstüne taşar; dokunma alanı satırın içinde kalsın diye satır yukarı kaydırılır (Android). */}
                <View pointerEvents="box-none" style={{ paddingHorizontal: 16, flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: -48 }}>
                    <Pressable disabled={!p.photoUrl} onPress={() => setViewing(p.photoUrl ?? null)} accessibilityRole="imagebutton" accessibilityLabel={t('Profil fotoğrafını büyüt')}
                        style={{ width: 96, height: 96, borderRadius: 26, borderWidth: 4, borderColor: c.bg, backgroundColor: c.greenSoft, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 }}>
                        {p.photoUrl ? <FramedImage url={p.photoUrl} frame={p.photoFrame} style={{ width: '100%', height: '100%' }} /> : <Text style={{ fontSize: 40, fontWeight: '900', color: c.green2 }}>{name.trim().slice(0, 1).toLocaleUpperCase('tr')}</Text>}
                    </Pressable>
                </View>
            </View>
            <View style={{ gap: 4 }}>
                <Text style={{ color: c.ink, fontSize: 24, fontWeight: '900' }}>{name}</Text>
                <Text style={{ color: c.muted, fontSize: 13.5 }}>{[p.businessName ? p.displayName : null, p.memberSince ? t('Üyelik') + ': ' + date(p.memberSince, lang) : null].filter(Boolean).join(' · ')}</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                <Badge label={t(ACTIVITY[p.activity] ?? 'Satıcı')} tone="green" />
                {p.accountType === 'Business' ? <Badge label={t('Kurumsal (beyan)')} /> : null}
                {isNew ? <Badge label={t('Yeni üye')} tone="new" /> : null}
                {p.emailVerified ? <Badge label={'✓ ' + t('E-posta doğrulandı')} tone="blue" /> : null}
                <Badge label={number(p.activeListingCount) + ' ' + t('ilan yayında')} />
                {list.some(x => x.kategori !== 'Arazi' && inSeason(x.meyveTuru)) ? <Badge label={'🌱 ' + t('Şu an hasatta ürünü var')} tone="season" /> : null}
            </View>
            {/* İletişim: düğmeler eşit genişlikte, yazılar ortalı. Numara ilk dokunuşta açılır, ikincide arar. */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
                {/* Kendi profiline bakan kişi kendine mesaj gönderemez; yerine profil düzenleme çıkar. */}
                {p.isMine || p.id === user?.id ? <Action label="Profilimi düzenle" icon="edit" primary onPress={() => router.push('/profil')} /> : <>
                    <Action label="Mesaj" icon="chat" primary onPress={message} />
                    {p.hasPhone || p.phone ? <Action label={phoneShown && p.phone ? p.phone : t('Numara')} icon="phone" onPress={phone} active={phoneShown} /> : null}
                </>}
                <Action label="Paylaş" icon="share" onPress={share} />
            </View>
            {/* Özet */}
            <View style={{ flexDirection: 'row', backgroundColor: c.panel, borderRadius: radius.l, borderWidth: 1, borderColor: c.line, paddingVertical: 12 }}>
                {([[number(p.activeListingCount), 'aktif ilan'], [number(products.length), 'ürün çeşidi'], memberText(p.memberSince, now, t)] as [string, string][]).map(([v, l], i) => (
                    <View key={l} style={{ flex: 1, alignItems: 'center', borderLeftWidth: i ? 1 : 0, borderColor: c.line }}>
                        <Text style={{ color: c.green2, fontSize: 22, fontWeight: '900' }}>{v}</Text>
                        <Text style={{ color: c.muted, fontSize: 12 }}>{t(l)}</Text>
                    </View>
                ))}
            </View>
            {/* Hazır stok: yatay kaydırılan kartlar */}
            {stock.length ? <>
                <Section title="Hazır stok" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {stock.map(s => (
                        <Pressable key={s.product + s.unit} onPress={() => setFilter(s.product)} style={{ width: 150, padding: 10, gap: 4, borderRadius: radius.m, backgroundColor: c.panel, borderWidth: 1, borderColor: c.line }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><ProductIcon name={s.product} size={22} /><Text style={{ color: c.ink, fontWeight: '800', flex: 1 }} numberOfLines={1}>{s.product}</Text></View>
                            <Text style={{ color: c.green2, fontWeight: '900', fontSize: 17 }}>{amount(s.qty, s.unit)}</Text>
                            <Text style={{ color: c.muted, fontSize: 11.5 }} numberOfLines={1}>{priceRange(s.min, s.max, s.unit)}</Text>
                        </Pressable>
                    ))}
                </ScrollView>
            </> : null}
            {/* Hasat takvimi: ay harfleri yan yana, her ürün bir satır */}
            {products.some(([x]) => seasons[x]) ? <>
                <Section title="Ne zaman ne bulunur?" />
                <View style={{ padding: 12, gap: 6, borderRadius: radius.l, backgroundColor: c.panel, borderWidth: 1, borderColor: c.line }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ width: 92 }} />
                        <View style={{ flex: 1, flexDirection: 'row' }}>
                            {monthNames(lang).map((m, i) => <Text key={m} style={{ flex: 1, textAlign: 'center', fontSize: 10.5, fontWeight: i + 1 === month ? '900' : '600', color: i + 1 === month ? c.accent : c.muted }}>{m.slice(0, 1).toLocaleUpperCase('tr')}</Text>)}
                        </View>
                    </View>
                    {products.filter(([x]) => seasons[x]).slice(0, 8).map(([x]) => {
                        const [season, peak] = seasons[x]!;
                        return (
                            <View key={x} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={{ width: 92, flexDirection: 'row', alignItems: 'center', gap: 4 }}><ProductIcon name={x} size={16} /><Text style={{ color: c.ink, fontSize: 12, fontWeight: '700', flex: 1 }} numberOfLines={1}>{x}</Text></View>
                                <View style={{ flex: 1, flexDirection: 'row', gap: 2 }}>
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                        <View key={m} style={{ flex: 1, height: 12, borderRadius: 3, backgroundColor: peak.includes(m) ? (dark ? '#7cc466' : '#2f7a4a') : season.includes(m) ? (dark ? '#3f6e31' : '#a8d08d') : (dark ? '#ffffff14' : '#edf1ea'), borderWidth: m === month ? 1.5 : 0, borderColor: c.accent }} />
                                    ))}
                                </View>
                            </View>
                        );
                    })}
                    <Text style={{ color: c.muted, fontSize: 11.5 }}>{t('Koyu yeşil: yoğun hasat. Turuncu çerçeve: bu ay.')}</Text>
                </View>
            </> : null}
            {p.about ? <>
                <Section title="Hakkında" />
                <View style={{ padding: 12, borderRadius: radius.l, backgroundColor: c.panel, borderWidth: 1, borderColor: c.line, gap: 6 }}>
                    <Text style={{ color: c.ink, fontSize: 14.5, lineHeight: 21 }}>{p.about}</Text>
                    <Text style={{ color: c.muted, fontSize: 11.5 }}>{t('E-posta doğrulaması, ürün kalitesi veya ticari kimlik onayı değildir.')}</Text>
                </View>
            </> : null}
            {/* İlanlar ve ürüne göre süzme */}
            <Section title={t('İlanlar') + (items ? ' (' + number(list.length) + ')' : '')} raw />
            {products.length > 1 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    <Chip label={t('Tümü')} raw active={!filter} onPress={() => setFilter('')} />
                    {products.map(([x, n]) => <Chip key={x} raw label={x + ' (' + n + ')'} active={filter === x} icon={<ProductIcon name={x} size={16} />} onPress={() => setFilter(filter === x ? '' : x)} />)}
                </ScrollView>
            ) : null}
        </View>
    ) : null;

    return (
        <View style={{ flex: 1, backgroundColor: c.bg }}>
            <FlatList data={shown} keyExtractor={x => x.id} numColumns={2} scrollEventThrottle={32}
                onScroll={e => { const y = e.nativeEvent.contentOffset.y; setSolid(prev => (prev ? y > 150 : y > 190)); }} columnWrapperStyle={{ gap: 10 }}
                contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 40 + insets.bottom }}
                ListHeaderComponent={<>{error ? <View style={{ paddingTop: insets.top + 50 }}><ErrorBox message={error} /></View> : null}{header}</>}
                renderItem={({ item }) => <GridCard x={item} width={colW} />}
                ListEmptyComponent={(!items && !error ? <View style={{ padding: 40, alignItems: 'center', marginTop: p ? 0 : insets.top + 80 }}><Spinner /></View> : items ? <Empty title="Yayında ilan yok" /> : undefined) as React.ReactElement | undefined} />
            {solid ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: insets.top + 52, backgroundColor: c.panel, borderBottomWidth: 1, borderColor: c.line, justifyContent: 'flex-end', paddingBottom: 14, paddingHorizontal: 64 }}>
                <Text style={{ color: c.ink, fontSize: 16.5, fontWeight: '800', textAlign: 'center' }} numberOfLines={1}>{name}</Text>
            </View> : null}
            {/* Kapak üstünde yüzen geri ve paylaş düğmeleri */}
            <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: insets.top + 6, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12 }}>
                <Round label="Geri" solid={solid} onPress={goBack}><Chevron dir="left" color={solid ? c.green2 : '#fff'} size={24} /></Round>
                {p ? <Round label="Paylaş" solid={solid} onPress={share}><Icon name="share" color={solid ? c.green2 : '#fff'} size={19} /></Round> : null}
            </View>
            <PhotoViewer url={viewing} onClose={() => setViewing(null)} />
            {sharer.node}
        </View>
    );
}

function memberText(since: string | null | undefined, now: number, t: (s: string) => string): [string, string] {
    if (!since) return ['—', 'üyelik'];
    const months = Math.max(0, Math.round((now - new Date(since).getTime()) / (30.4 * 864e5)));
    if (months < 1) return [t('Yeni'), 'üye'];
    if (months < 12) return [String(months), 'aydır üye'];
    return [String(Math.floor(months / 12)), 'yıldır üye'];
}
function amount(qty: number, unit: string) {
    if (unit === 'kg' && qty >= 1000) return number(Math.round(qty / 100) / 10) + ' ton';
    return number(qty) + ' ' + unitLabel(unit);
}
function priceRange(min: number, max: number, unit: string) {
    const tl = (v: number) => '₺' + number(v);
    return (min === max ? tl(min) : tl(min) + ' – ' + tl(max)) + ' / ' + unitLabel(unit);
}

function Section({ title, raw }: { title: string; raw?: boolean }) {
    const { colors: c, t } = useApp();
    return <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 17, fontWeight: '900', marginTop: 4 }}>{raw ? title : t(title)}</Text>;
}
function Badge({ label, tone }: { label: string; tone?: 'green' | 'blue' | 'new' | 'season' }) {
    const { colors: c, dark } = useApp();
    const [bg, fg] = tone === 'green' ? [c.greenSoft, c.green2] : tone === 'blue' ? [dark ? '#16324a' : '#e8f4fd', dark ? '#8cc8f0' : '#155a8a'] : tone === 'new' ? [dark ? '#3a2e12' : '#fff4dc', dark ? '#f0c96a' : '#8a5a00'] : tone === 'season' ? [dark ? '#1f3a17' : '#effae6', dark ? '#a6dd8a' : '#2f6b12'] : [c.panel, c.ink];
    return <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: c.line }}><Text style={{ color: fg, fontSize: 12, fontWeight: '700' }}>{label}</Text></View>;
}
function Action({ label, icon, onPress, primary, active }: { label: string; icon: 'chat' | 'phone' | 'share' | 'edit'; onPress: () => void; primary?: boolean; active?: boolean }) {
    const { colors: c, t } = useApp();
    const fg = primary ? c.onGreen : c.green2;
    return (
        <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={t(label)}
            style={({ pressed }) => ({ flex: primary ? 1.25 : 1, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: radius.m, paddingHorizontal: 8, backgroundColor: primary ? c.green : pressed ? c.greenSoft : c.panel, borderWidth: 1, borderColor: primary ? c.green : active ? c.green2 : c.line, opacity: pressed ? 0.85 : 1 })}>
            <Icon name={icon} color={fg} size={18} />
            <Text style={{ color: fg, fontWeight: '800', fontSize: 14 }} numberOfLines={1} adjustsFontSizeToFit>{t(label)}</Text>
        </Pressable>
    );
}
function Round({ label, onPress, children, solid }: { label: string; onPress: () => void; children: React.ReactNode; solid?: boolean }) {
    const { t, colors: c } = useApp();
    return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={t(label)} hitSlop={6} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: solid ? c.greenSoft : '#0006', alignItems: 'center', justifyContent: 'center' }}>{children}</Pressable>;
}
function GridCard({ x, width }: { x: Listing; width: number }) {
    const { colors: c, t, lang } = useApp();
    return (
        <Pressable onPress={() => router.push({ pathname: '/ilan/[id]', params: { id: x.id } })} accessibilityRole="button" accessibilityLabel={x.baslik}
            style={({ pressed }) => ({ width, borderRadius: radius.l, backgroundColor: c.panel, borderWidth: 1, borderColor: c.line, overflow: 'hidden', opacity: pressed ? 0.9 : 1 })}>
            <View>
                <Photo url={x.photoUrl} product={x.meyveTuru} radius={0} style={{ width, height: Math.round(width * 0.75) }} />
                <View style={{ position: 'absolute', left: 8, top: 8, backgroundColor: '#ffffffe6', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}><Text style={{ color: '#1f5c36', fontSize: 11, fontWeight: '800' }}>{t(category(x.kategori).short)}</Text></View>
                {x.kategori !== 'Arazi' && inSeason(x.meyveTuru) ? <View style={{ position: 'absolute', right: 8, bottom: 8, backgroundColor: '#2f7a4ae6', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}><Text style={{ color: '#fff', fontSize: 10.5, fontWeight: '800' }}>{t('Hasatta')}</Text></View> : null}
            </View>
            <View style={{ padding: 9, gap: 3 }}>
                <Text style={{ color: '#6b8a4f', fontSize: 10.5, fontWeight: '800' }} numberOfLines={1}>{(x.meyveTuru + (x.cesit ? ' · ' + x.cesit : '')).toLocaleUpperCase('tr')}</Text>
                <Text style={{ color: c.ink, fontSize: 13.5, fontWeight: '800', lineHeight: 18 }} numberOfLines={2}>{x.baslik}</Text>
                <Text style={{ color: c.muted, fontSize: 11 }} numberOfLines={1}>{x.ilce + ', ' + x.il + ' · ' + timeAgo(x.publishedAt || x.olusturulmaTarihi, lang)}</Text>
                <Text style={{ color: c.accent, fontSize: 15.5, fontWeight: '900', marginTop: 2 }} numberOfLines={1}>{t(priceText(x))}</Text>
                {x.kategori !== 'Arazi' ? <Text style={{ color: c.muted, fontSize: 11.5, fontWeight: '700' }}>{qtyText(x)}</Text> : null}
            </View>
        </Pressable>
    );
}
