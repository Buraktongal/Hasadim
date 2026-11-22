import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, Image, Keyboard, type NativeScrollEvent, type NativeSyntheticEvent, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../components/Icon';
import { ListingCard } from '../../components/ListingCard';
import { ProductIcon } from '../../components/ProductIcon';
import { SearchSuggest } from '../../components/SearchSuggest';
import { Button, Chip, Empty, ErrorBox, IconButton, Spinner, toast } from '../../components/ui';
import { get, post } from '../../lib/api';
import { useApp } from '../../lib/app-state';
import { categories, category } from '../../lib/catalog';
import { useCounts } from '../../lib/counts';
import { activeFilterCount, filterTags, qs, useFilters } from '../../lib/filters';
import { number } from '../../lib/format';
import { toggleFavorite, useListingPages } from '../../lib/listings';
import type { CategoryCount } from '../../lib/types';
import { radius } from '../../lib/theme';

export default function Market() {
    const { colors: c, t, user, dark } = useApp();
    const [filters, setFilters] = useFilters();
    const [text, setText] = useState(filters.q ?? '');
    const [counts, setCounts] = useState<Record<string, number>>({});
    const badges = useCounts(Boolean(user));
    const list = useListingPages(filters);
    // Liste aşağı kaydırılınca üstteki logo çubuğu yerini arama + harita + ürün takvimi kısayollarına bırakır.
    const [compact, setCompact] = useState(false);
    const [focused, setFocused] = useState<'top' | 'list' | null>(null);
    const fade = useRef(new Animated.Value(0)).current;
    useEffect(() => { Animated.spring(fade, { toValue: compact ? 1 : 0, useNativeDriver: true, speed: 18, bounciness: compact ? 6 : 0 }).start(); }, [compact, fade]);
    const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const y = e.nativeEvent.contentOffset.y;
        setCompact(prev => (prev ? y > 90 : y > 140)); // iki eşik: sınırda titremesin
    }, []);
    const submit = () => { Keyboard.dismiss(); setFocused(null); setFilters({ ...filters, q: text }); };
    const pickProduct = (kategori: string, meyveTuru: string) => { setText(''); setFocused(null); setFilters({ sort: filters.sort, kategori, meyveTuru }); };

    useEffect(() => { setText(filters.q ?? ''); }, [filters.q]);
    const loadCounts = useCallback(() => {
        get<CategoryCount[]>('/api/meyve-ilanlari/kategoriler').then(rows => {
            const map: Record<string, number> = {};
            for (const r of rows) map[r.kategori] = (map[r.kategori] ?? 0) + r.count;
            setCounts(map);
        }).catch(() => undefined);
    }, []);
    useEffect(loadCounts, [loadCounts]);
    // İlan verip geri dönünce liste tazelenir.
    useFocusEffect(useCallback(() => { if (list.items.length) void list.refresh(); }, [])); // eslint-disable-line react-hooks/exhaustive-deps

    const totalAll = useMemo(() => Object.values(counts).reduce((a, b) => a + b, 0), [counts]);
    const filterCount = activeFilterCount(filters);
    const title = filters.kategori ? category(filters.kategori).name + (filters.meyveTuru ? ' · ' + filters.meyveTuru : '') : 'Tüm ilanlar';

    async function saveSearch() {
        if (!user) { router.push('/giris'); return; }
        const name = [filters.meyveTuru ?? (filters.kategori ? category(filters.kategori).short : ''), filters.il, filters.q].filter(Boolean).join(' · ') || t('Tüm ilanlar');
        try {
            await post('/api/saved-searches', { name: name.slice(0, 80), query: qs(filters), notify: true });
            toast('Arama kaydedildi. Yeni ilan gelince bildirim alacaksın.');
        } catch (e) { toast(e instanceof Error ? e.message : 'Arama kaydedilemedi.'); }
    }

    const header = (
        <View style={{ gap: 12, paddingBottom: 6 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: c.green, borderRadius: radius.m, backgroundColor: c.input, paddingLeft: 10 }}>
                    <Icon name="search" color={c.muted} size={19} />
                    <TextInput value={text} onChangeText={setText} returnKeyType="search" maxLength={150}
                        onSubmitEditing={submit} onFocus={() => setFocused('list')} onBlur={() => setTimeout(() => setFocused(f => (f === 'list' ? null : f)), 150)}
                        placeholder={t('Ürün, satıcı veya ilan ara')} placeholderTextColor={c.muted}
                        accessibilityLabel={t('Ürün, çeşit veya ilan ara')}
                        style={{ flex: 1, height: 44, paddingHorizontal: 8, color: c.ink, fontSize: 15.5 }} />
                    {text ? <IconButton label="Temizle" size={34} onPress={() => { setText(''); setFilters({ ...filters, q: '' }); }}><Icon name="close" color={c.muted} size={16} /></IconButton> : null}
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={t('Filtreler')} onPress={() => router.push('/filtreler')}
                    style={{ width: 48, borderRadius: radius.m, backgroundColor: filterCount ? c.green : c.panel, borderWidth: 1, borderColor: filterCount ? c.green : c.line, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="filter" color={filterCount ? c.onGreen : c.green2} size={21} />
                    {filterCount ? <View style={{ position: 'absolute', top: -5, right: -5, backgroundColor: c.accent, borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>{filterCount}</Text></View> : null}
                </Pressable>
            </View>

            {focused === 'list' ? <SearchSuggest q={text} onProduct={pickProduct} onSearch={submit} /> : null}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                <Chip label={t('Tümü') + (totalAll ? ' · ' + number(totalAll) : '')} raw active={!filters.kategori} onPress={() => setFilters({ q: filters.q, sort: filters.sort })} />
                {categories.map(cat => (
                    <Chip key={cat.id} raw label={t(cat.short) + (counts[cat.id] ? ' · ' + number(counts[cat.id]!) : '')} active={filters.kategori === cat.id}
                        icon={<ProductIcon name={cat.icon} size={18} />} onPress={() => setFilters({ q: filters.q, sort: filters.sort, kategori: cat.id })} />
                ))}
            </ScrollView>

            {/* Etkin filtreler: her biri × ile tek tek kaldırılır; fiyat aralığı yoksa hızlıca eklemek için kısayol. */}
            {filters.kategori || filterCount ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {filterTags(filters, filters.kategori === 'Arazi' ? 'm²' : filters.kategori === 'Yem' ? 'balya' : 'kg').map(tag => (
                        <Chip key={tag.key} label={tag.label} active onRemove={() => setFilters({ ...filters, ...tag.clear })} />
                    ))}
                    {!filters.minFiyat && !filters.maxFiyat ? <Chip label="+ Fiyat aralığı" onPress={() => router.push('/filtreler')} /> : null}
                    {filterTags(filters).length > 1 ? <Chip label="Tümünü temizle" onPress={() => setFilters({ q: filters.q, sort: filters.sort, kategori: filters.kategori })} /> : null}
                </ScrollView>
            ) : null}

            {!filters.kategori && !filters.q ? (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    {([['map', 'Harita', 'İllere göre ilanlar', '/harita'], ['calendar', 'Ürün takvimi', 'Hangi ay ne hasat edilir', '/urun-takvimi']] as const).map(([icon, label, sub, href]) => (
                        <Pressable key={href} onPress={() => router.push(href)} accessibilityRole="button"
                            style={({ pressed }) => ({ flex: 1, flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12, borderRadius: radius.m, backgroundColor: pressed ? c.greenSoft : c.panel, borderWidth: 1, borderColor: c.line })}>
                            <Icon name={icon} color={c.green2} size={22} />
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: c.ink, fontWeight: '800' }}>{t(label)}</Text>
                                <Text style={{ color: c.muted, fontSize: 12 }} numberOfLines={1}>{t(sub)}</Text>
                            </View>
                        </Pressable>
                    ))}
                </View>
            ) : null}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: c.ink, fontSize: 19, fontWeight: '800' }} numberOfLines={1}>{t(title)}</Text>
                    <Text style={{ color: c.muted, fontSize: 13 }}>{list.loading && !list.items.length ? t('Yükleniyor…') : t(number(list.total) + ' ilan bulundu')}</Text>
                </View>
                {filterCount || filters.q ? <Button title="☆ Kaydet" kind="secondary" small full={false} onPress={saveSearch} /> : null}
            </View>
            {list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> : null}
        </View>
    );

    return (
        <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
            <View style={{ flex: 1 }}>
            <View style={{ height: 56, zIndex: 2 }}>
                {/* Kaydırınca beliren çubuk zemini (en üstteyken logo doğrudan sayfa zemininde durur). */}
                <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: c.panel, borderBottomWidth: 1, borderColor: c.line, opacity: fade.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }), shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: compact ? 3 : 0 }} />
                <Animated.View pointerEvents={compact ? 'none' : 'auto'} accessibilityElementsHidden={compact} importantForAccessibility={compact ? 'no-hide-descendants' : 'auto'} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, opacity: fade.interpolate({ inputRange: [0, 1], outputRange: [1, 0], extrapolate: 'clamp' }), transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) }, { scale: fade.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] }) }] }}>
                    <Image source={dark ? require('../../../assets/logo-yazi-koyu.png') : require('../../../assets/logo-yazi.png')} style={{ width: 132, height: 34 }} resizeMode="contain" accessibilityLabel="Hasadım" />
                    <View style={{ flex: 1 }} />
                    <IconButton label="Bildirimler" badge={badges.notifications} onPress={() => router.push(user ? '/bildirimler' : '/giris')}><Icon name="bell" color={c.green2} /></IconButton>
                </Animated.View>
                {(
                    <Animated.View pointerEvents={compact ? 'auto' : 'none'} accessibilityElementsHidden={!compact} importantForAccessibility={compact ? 'auto' : 'no-hide-descendants'} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, opacity: fade.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }), transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [-22, 0] }) }] }}>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', height: 40, borderWidth: 1.5, borderColor: c.green, borderRadius: radius.m, backgroundColor: c.input, paddingLeft: 9 }}>
                            <Icon name="search" color={c.muted} size={17} />
                            <TextInput value={text} onChangeText={setText} returnKeyType="search" maxLength={150} onSubmitEditing={submit}
                                onFocus={() => setFocused('top')} onBlur={() => setTimeout(() => setFocused(f => (f === 'top' ? null : f)), 150)}
                                placeholder={t('Ürün, satıcı veya ilan ara')} placeholderTextColor={c.muted} accessibilityLabel={t('Ürün, çeşit veya ilan ara')}
                                style={{ flex: 1, height: 38, paddingHorizontal: 7, color: c.ink, fontSize: 15 }} />
                        </View>
                        {([['map', 'Harita', '/harita'], ['calendar', 'Ürün takvimi', '/urun-takvimi']] as const).map(([icon, label, href]) => (
                            <IconButton key={href} label={label} size={40} onPress={() => router.push(href)}><Icon name={icon} color={c.green2} size={21} /></IconButton>
                        ))}
                        <IconButton label="Filtreler" size={40} badge={filterCount || undefined} onPress={() => router.push('/filtreler')}><Icon name="filter" color={c.green2} size={20} /></IconButton>
                    </Animated.View>
                )}
            </View>
            {compact && focused === 'top' ? (
                <View style={{ position: 'absolute', left: 10, right: 10, top: 60, zIndex: 5, elevation: 6 }}>
                    <SearchSuggest q={text} onProduct={pickProduct} onSearch={submit} />
                </View>
            ) : null}
            <FlatList
                data={list.items}
                keyExtractor={x => x.id}
                ListHeaderComponent={header}
                onScroll={onScroll}
                scrollEventThrottle={32}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 30 }}
                renderItem={({ item }) => <ListingCard item={item} onFavorite={x => toggleFavorite(x, Boolean(user), fav => list.setItems(all => all.map(i => (i.id === x.id ? { ...i, favorite: fav } : i)))).catch(e => toast(e.message))} />}
                onEndReached={list.more}
                onEndReachedThreshold={0.6}
                refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={() => { void list.refresh(); loadCounts(); }} tintColor={c.green2} colors={[c.green2]} />}
                ListEmptyComponent={list.loading ? <View style={{ padding: 40, alignItems: 'center' }}><Spinner size={48} /></View>
                    : list.error ? undefined : <Empty title="Bu aramaya uygun ilan bulunamadı." text="Filtreleri değiştirerek tekrar dene." action={<View style={{ width: 220 }}><Button title="Filtreleri temizle" kind="secondary" onPress={() => setFilters({})} /></View>} />}
                ListFooterComponent={list.items.length && list.hasMore ? <View style={{ padding: 16, alignItems: 'center' }}><Spinner size={30} /></View> : undefined}
            />
            </View>
        </SafeAreaView>
    );
}
