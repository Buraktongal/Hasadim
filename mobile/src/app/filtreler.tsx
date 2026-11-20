import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Field, H2, Header, Screen, Segmented, Select } from '../components/ui';
import { useApp } from '../lib/app-state';
import { categories, category, cities, DEED, DELIVERY, districts, PACKAGING, SORTS, varieties, ZONING } from '../lib/catalog';
import { type Filters, useFilters } from '../lib/filters';

const num = (v: string) => v.replace(/[^0-9.,]/g, '').replace(',', '.').slice(0, 14);

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
                    <Button title="Sonuçları göster" onPress={() => { apply(f); router.back(); }} />
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
                    <H2>{t(land ? 'Fiyat (TL)' : 'Fiyat (TL / birim)')}</H2>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <View style={{ flex: 1 }}><Field label="En az" keyboardType="decimal-pad" value={f.minFiyat ?? ''} onChangeText={v => set({ minFiyat: num(v) })} /></View>
                        <View style={{ flex: 1 }}><Field label="En çok" keyboardType="decimal-pad" value={f.maxFiyat ?? ''} onChangeText={v => set({ maxFiyat: num(v) })} /></View>
                    </View>
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
