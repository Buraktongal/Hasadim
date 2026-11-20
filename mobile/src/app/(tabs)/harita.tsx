import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, type ScrollViewInstance, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { MiniMap, TURKEY, approximate } from '../../components/MiniMap';
import { ProductIcon } from '../../components/ProductIcon';
import { Button, Card, Chip, ErrorBox, H2, Segmented, Spinner, Txt } from '../../components/ui';
import provinces from '../../data/provinces.json';
import { get } from '../../lib/api';
import { useApp } from '../../lib/app-state';
import { categories } from '../../lib/catalog';
import { qs, setFilters } from '../../lib/filters';
import { compact, number, priceText } from '../../lib/format';
import type { MapData } from '../../lib/types';

const geo = provinces as unknown as { width: number; height: number; iller: [string, string, number, number, number][] };
const MAP_WIDTH = 760;

export default function MapScreen() {
    const { colors: c, t } = useApp();
    const [view, setView] = useState<'il' | 'sokak'>('il');
    const [kategori, setKategori] = useState('');
    const [data, setData] = useState<MapData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState('');
    const [popup, setPopup] = useState<MapData['noktalar'][number] | null>(null);
    const scroll = useRef<ScrollViewInstance>(null);

    useEffect(() => {
        let alive = true;
        setError(null);
        get<MapData>('/api/meyve-ilanlari/harita?' + qs({ kategori })).then(d => { if (alive) setData(d); }).catch(e => alive && setError(e instanceof Error ? e.message : 'Harita yüklenemedi.'));
        return () => { alive = false; };
    }, [kategori]);

    const counts = useMemo(() => new Map((data?.iller ?? []).map(x => [x.il, x.count])), [data]);
    const max = Math.max(1, ...counts.values());
    const level = (n: number) => (n ? Math.min(5, 1 + Math.floor(Math.sqrt(n / max) * 4.999)) : 0);
    const scale = MAP_WIDTH / geo.width;
    const products = useMemo(() => {
        const m = new Map<string, number>();
        for (const p of data?.noktalar ?? []) if (p.il === selected) m.set(p.meyveTuru, (m.get(p.meyveTuru) ?? 0) + 1);
        return [...m].sort((a, b) => b[1] - a[1]).slice(0, 4);
    }, [data, selected]);
    const points = useMemo(() => (data?.noktalar ?? []).map(p => {
        const exact = p.enlem != null && p.boylam != null;
        const at = exact ? { lat: Number(p.enlem), lon: Number(p.boylam) } : approximate(p.id, p.il);
        return at ? { ...p, ...at, exact } : null;
    }).filter(Boolean) as (MapData['noktalar'][number] & { lat: number; lon: number; exact: boolean })[], [data]);
    const total = (data?.iller ?? []).reduce((a, x) => a + x.count, 0);
    const selectedCount = counts.get(selected) ?? 0;

    return (
        <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
            <ScrollView contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 30 }}>
                <View>
                    <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 22, fontWeight: '800' }}>{t('Haritada ilanlar')}</Text>
                    <Txt muted size={13.5}>{data ? t(number(total) + ' ilan · ' + data.iller.length + ' il') : 'Yükleniyor…'}</Txt>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    <Chip label="Tümü" active={!kategori} onPress={() => setKategori('')} />
                    {categories.map(x => <Chip key={x.id} label={x.short} active={kategori === x.id} icon={<ProductIcon name={x.icon} size={18} />} onPress={() => setKategori(x.id)} />)}
                </ScrollView>
                <Segmented value={view} onChange={v => setView(v as 'il' | 'sokak')} options={[['il', 'İl haritası'], ['sokak', 'Sokak haritası']]} />
                {error ? <ErrorBox message={error} /> : null}
                {!data && !error ? <View style={{ padding: 40, alignItems: 'center' }}><Spinner size={46} /></View> : null}

                {data && view === 'il' ? <>
                    <View style={{ borderRadius: 14, backgroundColor: c.mapSea, overflow: 'hidden' }}>
                        <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} onLayout={e => scroll.current?.scrollTo({ x: (MAP_WIDTH - e.nativeEvent.layout.width) / 2, animated: false })}>
                            <Svg width={MAP_WIDTH} height={geo.height * scale + 8} viewBox={`0 -4 ${geo.width} ${geo.height + 8}`} accessibilityLabel={t('Türkiye il haritası')}>
                                {geo.iller.map(([il, d]) => (
                                    <Path key={il} d={d} fillRule="evenodd" fill={c.map[level(counts.get(il) ?? 0)]} stroke={il === selected ? c.accent : c.mapBorder} strokeWidth={il === selected ? 2.4 : 0.9}
                                        onPress={() => setSelected(il)} />
                                ))}
                                {selected ? (() => { const s = geo.iller.find(x => x[0] === selected); return s ? <Path d={s[1]} fill="none" stroke={c.accent} strokeWidth={2.4} /> : null; })() : null}
                                {geo.iller.filter(([il]) => counts.get(il)).map(([il, , lx, ly]) => {
                                    const n = counts.get(il)!; const strong = level(n) >= 3; const w = String(n).length > 2 ? 26 : String(n).length > 1 ? 20 : 16;
                                    return (
                                        <G key={'l' + il} transform={`translate(${lx} ${ly})`}>
                                            <SvgText y={-4} fontSize={10} fontWeight="800" textAnchor="middle" fill={strong ? '#10301f' : '#ffffff'} stroke={strong ? '#10301f' : '#ffffff'} strokeWidth={2.4} opacity={0.8}>{il}</SvgText>
                                            <SvgText y={-4} fontSize={10} fontWeight="800" textAnchor="middle" fill={strong ? '#fff' : c.ink}>{il}</SvgText>
                                            <Rect x={-w / 2} y={2} width={w} height={14} rx={7} fill={c.panel} />
                                            <SvgText y={12.5} fontSize={9.5} fontWeight="900" textAnchor="middle" fill={c.green2}>{n > 999 ? '999+' : String(n)}</SvgText>
                                        </G>
                                    );
                                })}
                            </Svg>
                        </ScrollView>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Txt muted size={12}>Az</Txt>
                        {c.map.slice(1).map(col => <View key={col} style={{ width: 22, height: 10, borderRadius: 3, backgroundColor: col }} />)}
                        <Txt muted size={12}>Çok</Txt>
                        <View style={{ flex: 1 }} />
                        <Txt muted size={11}>© OpenStreetMap</Txt>
                    </View>
                    <Card style={{ backgroundColor: c.greenSoft }}>
                        {!selected ? <Txt muted>Haritada bir ile dokun; o ildeki ilan sayısını ve ürünleri burada gör.</Txt> : <>
                            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                                <Txt size={19} weight="800" raw style={{ flex: 1 }}>{selected}</Txt>
                                <Txt weight="800" color={selectedCount ? c.green2 : c.muted}>{selectedCount ? number(selectedCount) + ' ilan' : 'İlan yok'}</Txt>
                            </View>
                            {products.map(([name, n]) => (
                                <View key={name} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <ProductIcon name={name} size={20} /><Txt weight="700" raw style={{ flex: 1 }}>{name}</Txt><Txt muted weight="700" raw>{String(n)}</Txt>
                                </View>
                            ))}
                            {selectedCount ? <Button title={t(selected + ' ilanlarını gör →')} raw onPress={() => { setFilters({ il: selected, kategori: kategori || undefined }); router.navigate('/'); }} /> : null}
                        </>}
                    </Card>
                    <Card>
                        <H2>En çok ilan olan iller</H2>
                        {data.iller.slice(0, 10).map((x, i) => (
                            <Pressable key={x.il} onPress={() => setSelected(x.il)} style={{ flexDirection: 'row', gap: 8 }}>
                                <Txt muted raw>{i + 1 + '.'}</Txt><Txt weight="800" raw style={{ flex: 1 }}>{x.il}</Txt><Txt muted>{number(x.count) + ' ilan'}</Txt>
                            </Pressable>
                        ))}
                    </Card>
                </> : null}

                {data && view === 'sokak' ? <>
                    <MiniMap center={TURKEY} zoom={5} height={420} pins={points.map(p => ({
                        id: p.id, lat: p.lat, lon: p.lon, onPress: () => setPopup(p),
                        render: () => (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: c.panel, borderRadius: 999, borderWidth: 2, borderColor: p.exact ? c.accent : c.green2, paddingLeft: 3, paddingRight: 7, paddingVertical: 2 }}>
                                <ProductIcon name={p.meyveTuru} size={16} />
                                <Text style={{ color: c.ink, fontSize: 11.5, fontWeight: '800' }}>{compact(p.kilogramFiyati)} ₺</Text>
                            </View>
                        )
                    }))} />
                    <Txt muted size={12.5}>{t(number(points.length) + ' ilan gösteriliyor') + '. ' + t('Konumu işaretlenmemiş ilanlar il merkezine yakın gösterilir.')}</Txt>
                    {popup ? (
                        <Card>
                            <Txt weight="800" raw>{popup.baslik}</Txt>
                            <Txt muted size={13} raw>{popup.meyveTuru + ' · ' + popup.il + ' / ' + popup.ilce}</Txt>
                            <Txt weight="900" color={c.accent}>{priceText({ kategori: popup.kategori, birim: popup.birim, kilogramFiyati: popup.kilogramFiyati, islemTipi: null })}</Txt>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <View style={{ flex: 1 }}><Button title="Kapat" kind="secondary" small onPress={() => setPopup(null)} /></View>
                                <View style={{ flex: 1 }}><Button title="İlanı incele →" small onPress={() => router.push({ pathname: '/ilan/[id]', params: { id: popup.id } })} /></View>
                            </View>
                        </Card>
                    ) : null}
                </> : null}
            </ScrollView>
        </SafeAreaView>
    );
}
