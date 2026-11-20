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
    const season = dark ? '#8f6a24' : '#F1DFA6';
    const peak = dark ? '#4fd17f' : '#3B8350';

    const cells = (s: [number[], number[]]) => Array.from({ length: 12 }, (_, i) => {
        const m = i + 1; const isPeak = s[1].includes(m); const isSeason = s[0].includes(m);
        return <View key={m} style={{ flex: 1, height: 18, marginHorizontal: 0.5, borderRadius: 4, backgroundColor: isPeak ? peak : isSeason ? season : 'transparent', borderWidth: m === now ? 1.5 : 0, borderColor: c.accent }} />;
    });

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
                        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><View style={{ width: 14, height: 12, borderRadius: 3, borderWidth: 1.5, borderColor: c.accent }} /><Txt muted size={12.5}>Bu ay</Txt></View>
                    </View>
                </View>
                {/* Ay başlıkları kaydırırken üstte sabit kalır. */}
                <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: c.panel, borderBottomWidth: 1, borderTopWidth: 1, borderColor: c.line }}>
                    <View style={{ width: 120 }} />
                    {months.map((m, i) => (
                        <Text key={m} style={{ flex: 1, textAlign: 'center', fontSize: 11.5, fontWeight: i + 1 === now ? '900' : '700', color: i + 1 === now ? c.accent : c.muted, borderLeftWidth: i ? 0.5 : 0, borderColor: c.line }}>{m}</Text>
                    ))}
                </View>
                {groups.map(g => (
                    <View key={g.cat.id}>
                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: c.greenSoft }}>
                            <ProductIcon name={g.cat.icon} size={18} /><Text style={{ color: c.green2, fontWeight: '800' }}>{t(g.cat.name)}</Text>
                        </View>
                        {g.rows.map(r => (
                            <Pressable key={r.name} onPress={() => { setFilters({ kategori: g.cat.id, meyveTuru: r.product, cesit: r.name !== r.product ? r.name : undefined }); router.navigate('/'); }}
                                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, backgroundColor: pressed ? c.greenSoft : c.panel, borderBottomWidth: 0.5, borderColor: c.line })}>
                                <View style={{ width: 120, flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 4 }}>
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
