import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Card, Chip, Field, goBack, H2, Header, Screen, Segmented, Select, Txt } from '../components/ui';
import { useApp } from '../lib/app-state';
import { categories, category, cities, DEED, DELIVERY, districts, PACKAGING, SORTS, varieties, ZONING } from '../lib/catalog';
import { type Filters, useFilters } from '../lib/filters';

const num = (v: string) => v.replace(/[^0-9.,]/g, '').replace(',', '.').slice(0, 14);

// Hızlı fiyat aralıkları (TL / birim). Arazi için toplam fiyat aralıkları.
const PRICE_PRESETS: [string, string, string][] = [['', '10', '10 ₺ altı'], ['10', '25', '10–25 ₺'], ['25', '50', '25–50 ₺'], ['50', '100', '50–100 ₺'], ['100', '', '100 ₺ üstü']];
const LAND_PRESETS: [string, string, string][] = [['', '500000', '500 bin ₺ altı'], ['500000', '2000000', '500 bin – 2 milyon ₺'], ['2000000', '10000000', '2–10 milyon ₺'], ['10000000', '', '10 milyon ₺ üstü']];

// En az > en çok yazıldıysa ikisi yer değiştirir.
function ordered(f: Filters, lo: 'minFiyat' | 'minMiktar', hi: 'maxFiyat' | 'maxMiktar'): Filters {
    const a = Number(f[lo]), b = Number(f[hi]);
    return f[lo] && f[hi] && a > b ? { ...f, [lo]: f[hi], [hi]: f[lo] } : f;
}

export default function FiltersScreen() {
    const { t, colors: c } = useApp();
    const [saved, apply] = useFilters();
    const [f, setF] = useState<Filters>(saved);
    const set = (patch: Filters) => setF(prev => ({ ...prev, ...patch }));
    const land = f.kategori === 'Arazi';
    const unit = land ? 'm²' : f.kategori === 'Yem' ? 'balya' : 'kg';

    return (
        <View style={{ flex: 1, backgroundColor: c.bg }}>
            <Header title="Filtreler" right={<Button title="Temizle" kind="plain" small full={false} onPress={() => setF({ q: f.q })} />} />
            <Screen edges={['bottom']} footer={
                <View style={{ padding: 12, borderTopWidth: 1, borderColor: c.line, backgroundColor: c.panel }}>
                    <Button title="Sonuçları göster" onPress={() => { apply(ordered(ordered(f, 'minFiyat', 'maxFiyat'), 'minMiktar', 'maxMiktar')); goBack(); }} />
                </View>}>
                <Card>
                    <H2>Ürün</H2>
                    <Select label="Kategori" value={f.kategori ?? ''} allowEmpty emptyLabel="Tüm kategoriler" raw={false}
                        options={categories.map(x => [x.id, x.name] as [string, string])}
                        onChange={v => set({ kategori: v, meyveTuru: '', cesit: '', islemTipi: '', imarDurumu: '', tapuDurumu: '', ambalaj: v === 'Arazi' ? '' : f.ambalaj, teslimat: v === 'Arazi' ? '' : f.teslimat })} />
                    <Select label="Ürün" value={f.meyveTuru ?? ''} allowEmpty emptyLabel="Tüm ürünler" disabled={!f.kategori} placeholder={f.kategori ? 'Tüm ürünler' : 'Önce kategori seç'}
                        options={f.kategori ? category(f.kategori).products : []} onChange={v => set({ meyveTuru: v, cesit: '' })} />
                    {!land ? <Select label="Çeşit" value={f.cesit ?? ''} allowEmpty emptyLabel="Tüm çeşitler" disabled={!f.meyveTuru || !varieties(f.meyveTuru).length}
                        placeholder="Tüm çeşitler" options={f.meyveTuru ? varieties(f.meyveTuru) : []} onChange={v => set({ cesit: v })} /> : null}
                </Card>

                <Card>
                    <H2>{t(land ? 'Fiyat aralığı (TL)' : 'Fiyat aralığı (TL / birim)')}</H2>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                        {(land ? LAND_PRESETS : PRICE_PRESETS).map(([lo, hi, label]) => {
                            const on = (f.minFiyat ?? '') === lo && (f.maxFiyat ?? '') === hi;
                            return <Chip key={label} label={label} active={on} onPress={() => set(on ? { minFiyat: '', maxFiyat: '' } : { minFiyat: lo, maxFiyat: hi })} />;
                        })}
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
                        <View style={{ flex: 1 }}><Field label="En az (₺)" placeholder="0" keyboardType="decimal-pad" value={f.minFiyat ?? ''} onChangeText={v => set({ minFiyat: num(v) })} /></View>
                        <Txt muted style={{ paddingBottom: 13 }}>–</Txt>
                        <View style={{ flex: 1 }}><Field label="En çok (₺)" placeholder="Sınırsız" keyboardType="decimal-pad" value={f.maxFiyat ?? ''} onChangeText={v => set({ maxFiyat: num(v) })} /></View>
                    </View>
                    {f.minFiyat || f.maxFiyat ? <Button title="Fiyat aralığını kaldır" kind="plain" small full={false} onPress={() => set({ minFiyat: '', maxFiyat: '' })} /> : null}
                </Card>

                {land ? (
                    <Card>
                        <H2>Arazi bilgileri</H2>
                        <Segmented value={f.islemTipi ?? ''} onChange={v => set({ islemTipi: v })} options={[['', 'Hepsi'], ['Satilik', 'Satılık'], ['Kiralik', 'Kiralık']]} />
                        <Select label="İmar durumu" value={f.imarDurumu ?? ''} allowEmpty emptyLabel="Fark etmez" options={ZONING} onChange={v => set({ imarDurumu: v })} raw={false} />
                        <Select label="Tapu durumu" value={f.tapuDurumu ?? ''} allowEmpty emptyLabel="Fark etmez" options={DEED} onChange={v => set({ tapuDurumu: v })} raw={false} />
                    </Card>
                ) : null}

                <Card>
                    <H2>Adres</H2>
                    <Select label="İl" value={f.il ?? ''} allowEmpty emptyLabel="Tüm iller" options={cities} onChange={v => set({ il: v, ilce: '' })} />
                    <Select label="İlçe" value={f.ilce ?? ''} allowEmpty emptyLabel="Tüm ilçeler" disabled={!f.il} placeholder={f.il ? 'Tüm ilçeler' : 'Önce il seç'} options={f.il ? districts(f.il) : []} onChange={v => set({ ilce: v })} />
                </Card>

                <Card>
                    <H2>{t('Miktar') + ' (' + unit + ')'}</H2>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <View style={{ flex: 1 }}><Field label="En az" keyboardType="decimal-pad" value={f.minMiktar ?? ''} onChangeText={v => set({ minMiktar: num(v) })} /></View>
                        <View style={{ flex: 1 }}><Field label="En çok" keyboardType="decimal-pad" value={f.maxMiktar ?? ''} onChangeText={v => set({ maxMiktar: num(v) })} /></View>
                    </View>
                </Card>

                {!land ? (
                    <Card>
                        <H2>Ticaret koşulları</H2>
                        <Select label="Ambalaj" value={f.ambalaj ?? ''} allowEmpty emptyLabel="Fark etmez" options={PACKAGING} onChange={v => set({ ambalaj: v })} raw={false} />
                        <Select label="Teslimat" value={f.teslimat ?? ''} allowEmpty emptyLabel="Fark etmez" options={DELIVERY} onChange={v => set({ teslimat: v })} raw={false} />
                    </Card>
                ) : null}

                <Card>
                    <Select label="Sıralama" value={f.sort ?? 'new'} options={SORTS} onChange={v => set({ sort: v === 'new' ? '' : v })} raw={false} />
                </Card>
            </Screen>
        </View>
    );
}
