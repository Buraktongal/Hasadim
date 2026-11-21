import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { ProductIcon } from '../components/ProductIcon';
import { Chip, Header, Txt } from '../components/ui';
import { useApp } from '../lib/app-state';
import { categories, seasons, varietySeasons } from '../lib/catalog';
import { setFilters } from '../lib/filters';
import { monthNames } from '../lib/format';

// Ürün takvimi: hangi ürün hangi ay piyasada (açık renk) ve yoğun hasatta (koyu renk).
export default function CropCalendar() {
    const { colors: c, t, lang, dark } = useApp();
    const [cat, setCat] = useState('');
    const now = new Date().getMonth() + 1;
    const months = Array.from({ length: 12 }, (_, i) => String(i + 1));
    const groups = useMemo(() => categories.filter(x => !x.land && (!cat || x.id === cat)).map(x => ({
        cat: x,
        rows: x.products.flatMap(p => {
            const own = seasons[p] ? [{ name: p, product: p, s: seasons[p]! }] : [];
            const vs = Object.entries(varietySeasons[p] ?? {}).map(([v, s]) => ({ name: v, product: p, s }));
            return [...own, ...vs];
        })
    })).filter(g => g.rows.length), [cat]);
    const season = dark ? '#5E5128' : '#F1DFA6';
    const peak = dark ? '#3FAE6A' : '#3B8350';
    const track = dark ? '#ffffff14' : '#0000000f';
    const nowTint = dark ? '#E2762F24' : '#D9661F17';
    const initials = monthNames(lang).map(m => m.slice(0, 1).toLocaleUpperCase(lang === 'en' ? 'en' : 'tr'));

    // Yıl boyunca tek bir ince ray; hasat dönemi ve yoğun hasat bu rayın üstünde kesintisiz bir şerit olarak görünür
    // (şeridin yalnızca başı ve sonu yuvarlak). İçinde bulunulan ay tüm satırlarda hafif turuncu bir sütundur.
    const cells = (s: [number[], number[]]) => {
        const state = (m: number) => (m < 1 || m > 12 ? 0 : s[1].includes(m) ? 2 : s[0].includes(m) ? 1 : 0);
        return Array.from({ length: 12 }, (_, i) => {
            const m = i + 1, st = state(m);
            const on = st > 0, left = on ? !state(m - 1) : m === 1, right = on ? !state(m + 1) : m === 12;
            return (
                <View key={m} style={{ flex: 1, height: 34, justifyContent: 'center', backgroundColor: m === now ? nowTint : 'transparent' }}>
                    <View style={{
                        height: on ? 16 : 6, backgroundColor: st === 2 ? peak : st === 1 ? season : track,
                        borderTopLeftRadius: left ? 8 : 0, borderBottomLeftRadius: left ? 8 : 0, borderTopRightRadius: right ? 8 : 0, borderBottomRightRadius: right ? 8 : 0
                    }} />
                </View>
            );
        });
    };

    return (
        <View style={{ flex: 1, backgroundColor: c.bg }}>
            <Header title="Ürün takvimi" />
            <ScrollView stickyHeaderIndices={[1]} contentContainerStyle={{ paddingBottom: 40 }}>
                <View style={{ padding: 12, gap: 10 }}>
                    <Txt muted size={13.5}>Türkiye geneli yaklaşık hasat dönemleri. Bir ürüne dokununca o ürünün ilanları açılır.</Txt>
                    <Txt size={13.5} weight="700">{t('Bu ay') + ': ' + monthNames(lang)[now - 1] + ' (' + now + ')'}</Txt>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                        <Chip label="Tümü" active={!cat} onPress={() => setCat('')} />
                        {categories.filter(x => !x.land).map(x => <Chip key={x.id} label={x.short} active={cat === x.id} icon={<ProductIcon name={x.icon} size={18} />} onPress={() => setCat(x.id)} />)}
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><View style={{ width: 18, height: 12, borderRadius: 3, backgroundColor: season }} /><Txt muted size={12.5}>Hasat dönemi</Txt></View>
                        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><View style={{ width: 18, height: 12, borderRadius: 3, backgroundColor: peak }} /><Txt muted size={12.5}>Yoğun hasat</Txt></View>
                        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><View style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: nowTint, borderWidth: 1, borderColor: c.accent }} /><Txt muted size={12.5}>Bu ay</Txt></View>
                    </View>
                </View>
                {/* Ay başlıkları kaydırırken üstte sabit kalır. */}
                <View style={{ flexDirection: 'row', paddingHorizontal: 12, backgroundColor: c.panel, borderBottomWidth: 1, borderTopWidth: 1, borderColor: c.line }}>
                    <View style={{ width: 112 }} />
                    {months.map((m, i) => (
                        <View key={m} style={{ flex: 1, alignItems: 'center', paddingVertical: 7, backgroundColor: i + 1 === now ? nowTint : 'transparent' }}>
                            <Text accessibilityLabel={monthNames(lang)[i]} style={{ fontSize: 12, fontWeight: i + 1 === now ? '900' : '700', color: i + 1 === now ? c.accent : c.muted }}>{initials[i]}</Text>
                        </View>
                    ))}
                </View>
                {groups.map(g => (
                    <View key={g.cat.id}>
                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: c.greenSoft }}>
                            <ProductIcon name={g.cat.icon} size={18} /><Text style={{ color: c.green2, fontWeight: '800' }}>{t(g.cat.name)}</Text>
                        </View>
                        {g.rows.map(r => (
                            <Pressable key={r.name} onPress={() => { setFilters({ kategori: g.cat.id, meyveTuru: r.product, cesit: r.name !== r.product ? r.name : undefined }); router.navigate('/'); }}
                                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, backgroundColor: pressed ? c.greenSoft : c.panel, borderBottomWidth: 0.5, borderColor: c.line })}>
                                <View style={{ width: 112, flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 6 }}>
                                    <ProductIcon name={r.product} size={18} />
                                    <Text style={{ color: c.ink, fontSize: 13, fontWeight: '600', flex: 1 }} numberOfLines={1}>{r.name}</Text>
                                </View>
                                {cells(r.s)}
                            </Pressable>
                        ))}
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}
