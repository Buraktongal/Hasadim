import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { MiniMap, CITY_CENTERS, TURKEY } from '../components/MiniMap';
import { Photo } from '../components/Photo';
import { ProductIcon } from '../components/ProductIcon';
import { Button, Card, Chip, ErrorBox, Field, goBack, H2, Header, Loading, Notice, Segmented, Select, SignInRequired, SwitchRow, Tag, toast, Txt, useConfirm } from '../components/ui';
import { api, del, get, post } from '../lib/api';
import { useApp } from '../lib/app-state';
import { categories, category, cities, DELIVERY, DEED, districts, IRRIGATION, PACKAGING, varieties, ZONING } from '../lib/catalog';
import { money, number, unitLabel } from '../lib/format';
import { appendPhoto, type PickedPhoto, pickPhotos } from '../lib/photos';
import type { Listing } from '../lib/types';
import { radius } from '../lib/theme';

const MAX_PHOTOS = 10;
const STEPS = ['Kategori', 'İlan detayları', 'Fiyat ve konum', 'Fotoğraf ve yayın'];
const num = (v: string) => v.replace(/[^0-9.,]/g, '').replace(',', '.').slice(0, 15);

type Form = {
    kategori: string; meyveTuru: string; cesit: string; baslik: string; aciklama: string; hasatTarihi: string;
    birim: string; miktarKg: string; kilogramFiyati: string; minAlimKg: string; ambalaj: string; teslimat: string;
    islemTipi: string; imarDurumu: string; tapuDurumu: string; sulama: string; ada: string; parsel: string; elektrik: boolean; yolCephesi: boolean;
    il: string; ilce: string; enlem: number | null; boylam: number | null;
};
const empty: Form = {
    kategori: '', meyveTuru: '', cesit: '', baslik: '', aciklama: '', hasatTarihi: '', birim: 'kg', miktarKg: '', kilogramFiyati: '', minAlimKg: '',
    ambalaj: '', teslimat: '', islemTipi: 'Satilik', imarDurumu: '', tapuDurumu: '', sulama: '', ada: '', parsel: '', elektrik: false, yolCephesi: false,
    il: '', ilce: '', enlem: null, boylam: null
};

// GG.AA.YYYY ↔ YYYY-MM-DD
const toIso = (v: string) => { const m = v.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/); if (!m) return null; const d = new Date(Date.UTC(+m[3]!, +m[2]! - 1, +m[1]!)); return d.getUTCDate() === +m[1]! ? d.toISOString().slice(0, 10) : null; };
const fromIso = (v?: string | null) => (v ? v.slice(0, 10).split('-').reverse().join('.') : '');

export default function ListingEditor() {
    const { id } = useLocalSearchParams<{ id?: string }>();
    const editing = typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id);
    const { colors: c, t, user, dark } = useApp();
    const insets = useSafeAreaInsets();
    const [step, setStep] = useState(0);
    const [f, setF] = useState<Form>(empty);
    const [existing, setExisting] = useState<Listing | null>(null);
    const [photos, setPhotos] = useState<PickedPhoto[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(editing);
    const set = (patch: Partial<Form>) => setF(p => ({ ...p, ...patch }));
    const confirm = useConfirm();

    useEffect(() => {
        if (!editing || !user) return;
        get<Listing>('/api/meyve-ilanlari/' + id).then(x => {
            setExisting(x);
            setF({
                kategori: x.kategori, meyveTuru: x.meyveTuru, cesit: x.cesit ?? '', baslik: x.baslik, aciklama: x.aciklama ?? '', hasatTarihi: fromIso(x.hasatTarihi),
                birim: x.birim || 'kg', miktarKg: String(x.miktarKg), kilogramFiyati: String(x.kilogramFiyati), minAlimKg: x.minAlimKg ? String(x.minAlimKg) : '',
                ambalaj: x.ambalaj ?? '', teslimat: x.teslimat ?? '', islemTipi: x.islemTipi ?? 'Satilik', imarDurumu: x.imarDurumu ?? '', tapuDurumu: x.tapuDurumu ?? '',
                sulama: x.sulama ?? '', ada: x.ada ?? '', parsel: x.parsel ?? '', elektrik: Boolean(x.elektrik), yolCephesi: Boolean(x.yolCephesi),
                il: x.il, ilce: x.ilce, enlem: x.enlem ?? null, boylam: x.boylam ?? null
            });
            setStep(1);
        }).catch(e => setError(e instanceof Error ? e.message : 'İlan yüklenemedi.')).finally(() => setLoading(false));
    }, [editing, id, user]);

    const cat = f.kategori ? category(f.kategori) : null;
    const land = f.kategori === 'Arazi';
    const rent = land && f.islemTipi === 'Kiralik';
    const unit = land ? 'm2' : f.kategori === 'Yem' ? f.birim : 'kg';
    const varietyList = f.meyveTuru ? varieties(f.meyveTuru) : [];
    const photoCount = (existing?.photos?.length ?? 0) + photos.length;
    const mapCenter = useMemo(() => (f.enlem != null && f.boylam != null ? { lat: f.enlem, lon: f.boylam } : f.il && CITY_CENTERS[f.il] ? { lat: CITY_CENTERS[f.il]![0], lon: CITY_CENTERS[f.il]![1] } : TURKEY), [f.il, f.enlem, f.boylam]);

    // Her adımın kontrolü (sunucu da aynı kuralları uygular).
    function check(s: number): string | null {
        if (s === 0) {
            if (!f.kategori) return 'Önce bir kategori seç.';
            if (!f.meyveTuru) return 'Ürünü seç.';
            if (!land && varietyList.length && !f.cesit) return 'Çeşidini seç (bilinmiyorsa “Diğer / Belirtilmemiş”).';
        }
        if (s === 1) {
            if (f.baslik.trim().length < 5) return 'İlan başlığı en az 5 karakter olmalı.';
            if (f.hasatTarihi && !toIso(f.hasatTarihi)) return 'Hasat tarihini GG.AA.YYYY biçiminde yaz.';
        }
        if (s === 2) {
            const qty = Number(f.miktarKg), price = Number(f.kilogramFiyati);
            if (!(qty > 0)) return land ? 'Arazi alanını m² olarak gir.' : 'Toplam miktarı gir.';
            if (!(price > 0)) return 'Fiyatı gir.';
            if (!land && price > 1_000_000) return 'Birim fiyat en fazla 1.000.000 TL olabilir.';
            if (land && (qty > 100_000_000)) return 'Alan en fazla 100.000.000 m² olabilir.';
            if (f.minAlimKg && (!(Number(f.minAlimKg) > 0) || Number(f.minAlimKg) > qty)) return 'Minimum alım miktarı ürün miktarını aşamaz ve sıfırdan büyük olmalı.';
            if (land && (!f.imarDurumu || !f.tapuDurumu)) return 'İmar ve tapu durumunu seç.';
            if ((f.ada && !/^[0-9A-Za-z/ -]{1,20}$/.test(f.ada)) || (f.parsel && !/^[0-9A-Za-z/ -]{1,20}$/.test(f.parsel))) return 'Ada ve parsel yalnızca harf, rakam, / ve - içerebilir.';
            if (!f.il || !f.ilce) return 'İl ve ilçeyi seç.';
        }
        if (s === 3 && !editing && photos.length < 1) return 'En az 1 fotoğraf ekle.';
        return null;
    }
    function next() {
        const problem = check(step);
        setError(problem);
        if (!problem) setStep(s => Math.min(3, s + 1));
    }

    async function addPhotos(source: 'camera' | 'library') {
        const left = MAX_PHOTOS - photoCount;
        if (left <= 0) { toast('En fazla 10 fotoğraf yükleyebilirsin.'); return; }
        try {
            const r = await pickPhotos(source, left);
            if ('photos' in r) setPhotos(p => [...p, ...r.photos].slice(0, MAX_PHOTOS));
            else if ('denied' in r) {
                // İzin daha önce kalıcı reddedildiyse sistem tekrar sormaz; Ayarlar'a yönlendir.
                if (!r.canAskAgain && await confirm.ask('Kamera izni gerekli', t('Fotoğraf çekmek için Ayarlar’dan Hasadım’a kamera izni vermelisin. İstersen galeriden fotoğraf seçebilirsin.'), 'Ayarları aç'))
                    await Linking.openSettings();
                else if (r.canAskAgain) toast('Kamera izni verilmedi. Galeriden fotoğraf seçebilirsin.');
            } else toast(r.error);
        } catch { toast('Fotoğraf hazırlanamadı. Başka bir fotoğraf dene.'); }
    }

    function body() {
        return {
            baslik: f.baslik.trim(), kategori: f.kategori, meyveTuru: f.meyveTuru, cesit: land ? '' : f.cesit, il: f.il, ilce: f.ilce, aciklama: f.aciklama.trim(),
            ambalaj: land ? '' : f.ambalaj, teslimat: land ? '' : f.teslimat, birim: unit,
            miktarKg: Number(f.miktarKg), kilogramFiyati: Number(f.kilogramFiyati), minAlimKg: !land && f.minAlimKg ? Number(f.minAlimKg) : null,
            hasatTarihi: !land && f.hasatTarihi ? toIso(f.hasatTarihi) : null,
            islemTipi: land ? f.islemTipi : null, imarDurumu: land ? f.imarDurumu || null : null, tapuDurumu: land ? f.tapuDurumu || null : null,
            sulama: land ? f.sulama || null : null, ada: land ? f.ada.trim() || null : null, parsel: land ? f.parsel.trim() || null : null,
            elektrik: land ? f.elektrik : null, yolCephesi: land ? f.yolCephesi : null, enlem: f.enlem, boylam: f.boylam,
            version: existing?.version ?? null
        };
    }

    async function publish() {
        for (let s = 0; s <= 3; s++) { const p = check(s); if (p) { setError(p); setStep(s); return; } }
        setBusy(true); setError(null);
        try {
            if (!editing) {
                const form = new FormData();
                form.append('listing', JSON.stringify(body()));
                photos.forEach((p, i) => appendPhoto(form, 'files', p, i));
                const r = await api<{ id: string; mesaj: string }>('/api/meyve-ilanlari/with-photos', { method: 'POST', body: form });
                toast(r.mesaj || 'İlanın yayımlandı. 30 gün boyunca yayında kalacak.');
                router.replace({ pathname: '/ilan/[id]', params: { id: r.id } });
            } else {
                let version = existing!.version;
                if (photos.length) {
                    const form = new FormData();
                    photos.forEach((p, i) => appendPhoto(form, 'files', p, i));
                    await api('/api/meyve-ilanlari/' + id + '/photos', { method: 'POST', body: form });
                    version = (await get<Listing>('/api/meyve-ilanlari/' + id)).version;
                }
                await api('/api/meyve-ilanlari/' + id, { method: 'PUT', json: { ...body(), version } });
                toast('İlanın güncellendi. Mevcut yayın süresi korundu.');
                goBack();
            }
        } catch (e) { setError(e instanceof Error ? e.message : 'İlan kaydedilemedi.'); }
        finally { setBusy(false); }
    }

    if (!user) return <View style={{ flex: 1, backgroundColor: c.bg }}><Header title="İlan ver" /><SignInRequired /></View>;
    if (loading) return <View style={{ flex: 1, backgroundColor: c.bg }}><Header title="İlanı düzenle" /><Loading /></View>;

    const priceLabel = land ? (rent ? 'Yıllık kira bedeli (TL)' : 'Satış fiyatı (TL)') : 'Fiyat (TL/' + unitLabel(unit) + ')';
    const qtyLabel = land ? 'Alan (m²)' : 'Toplam miktar (' + unitLabel(unit) + ')';

    return (
        <View style={{ flex: 1, backgroundColor: c.bg }}>
            <Header title={editing ? 'İlanı düzenle' : 'Yeni ilan ver'} />
            {/* Adım göstergesi */}
            <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: c.panel }}>
                {STEPS.map((s, i) => (
                    <Pressable key={s} accessibilityRole="button" accessibilityLabel={t(s)} accessibilityState={{ selected: i === step }} onPress={() => { if (i < step || !check(step)) setStep(i); }} style={{ flex: 1, gap: 4 }}>
                        <View style={{ height: 4, borderRadius: 2, backgroundColor: i <= step ? c.accent : c.line }} />
                        <Text style={{ fontSize: 11, fontWeight: i === step ? '800' : '600', color: i === step ? c.ink : c.muted }} numberOfLines={1}>{i + 1 + ' · ' + t(s)}</Text>
                    </Pressable>
                ))}
            </View>

            <ScrollView contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
                {step === 0 ? <>
                    <Txt muted>Önce ana kategoriyi, sonra satacağın ürünü seç. Alıcılar ilanını bu kategoride ve ürün filtresinde bulur.</Txt>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                        {categories.map(x => (
                            <Pressable key={x.id} disabled={editing} onPress={() => set({ kategori: x.id, meyveTuru: '', cesit: '', birim: x.units[0] ?? 'kg' })} accessibilityRole="button" accessibilityState={{ selected: f.kategori === x.id }}
                                style={{ width: '31%', flexGrow: 1, alignItems: 'center', gap: 6, paddingVertical: 14, borderRadius: radius.l, borderWidth: 2, borderColor: f.kategori === x.id ? c.accent : c.line, backgroundColor: f.kategori === x.id ? (dark ? '#2a2018' : '#FFF4EA') : c.panel, opacity: editing && f.kategori !== x.id ? 0.4 : 1 }}>
                                <ProductIcon name={x.icon} size={34} />
                                <Text style={{ color: c.ink, fontWeight: '800', fontSize: 13, textAlign: 'center' }}>{t(x.short)}</Text>
                            </Pressable>
                        ))}
                    </View>
                    {cat ? <>
                        <H2>{land ? 'Arazi türü' : 'Ürün'}</H2>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {cat.products.map(p => <Chip key={p} raw label={p} active={f.meyveTuru === p} icon={<ProductIcon name={p} size={18} />} onPress={() => set({ meyveTuru: p, cesit: '' })} />)}
                        </View>
                    </> : null}
                    {!land && f.meyveTuru && varietyList.length ? <>
                        <H2>Çeşidini seç</H2>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {[...varietyList, 'Diğer / Belirtilmemiş'].map(v => <Chip key={v} raw={v !== 'Diğer / Belirtilmemiş'} label={v} active={f.cesit === v} onPress={() => set({ cesit: v })} />)}
                        </View>
                    </> : null}
                </> : null}

                {step === 1 ? <Card>
                    <Field label="İlan başlığı" value={f.baslik} onChangeText={v => set({ baslik: v })} maxLength={150}
                        placeholder={land ? 'Örn. Karapınar’da yola cepheli 12 dönüm sulu tarla' : 'Örn. Eğirdir Gala elma — 1. sınıf, kasalı'}
                        hint="Başlıkta çeşit, kalite sınıfı ve bölgeyi belirtmek alıcıların ilanını bulmasını kolaylaştırır." />
                    {!land ? <Field label="Hasat tarihi (isteğe bağlı)" value={f.hasatTarihi} onChangeText={v => set({ hasatTarihi: v.replace(/[^0-9.]/g, '').slice(0, 10) })} keyboardType="numbers-and-punctuation" placeholder="GG.AA.YYYY" hint="Ürünün hasat edildiği veya edileceği tarih." /> : null}
                    <Field label="Açıklama" value={f.aciklama} onChangeText={v => set({ aciklama: v })} maxLength={5000} multiline style={{ minHeight: 140 }}
                        placeholder={land ? 'Toprak yapısı, ulaşım, su kaynağı, ağaç sayısı, ödeme koşulları…' : 'Kalibre / boy, kalite sınıfı, renk, depolama durumu, ilaçlama bilgisi, ödeme ve yükleme koşulları…'} />
                </Card> : null}

                {step === 2 ? <>
                    <Card>
                        {land ? <Segmented value={f.islemTipi} onChange={v => set({ islemTipi: v })} options={[['Satilik', 'Satılık'], ['Kiralik', 'Kiralık']]} /> : null}
                        {f.kategori === 'Yem' ? <Segmented value={f.birim} onChange={v => set({ birim: v })} options={[['balya', 'Balya'], ['kg', 'Kilogram (kg)']]} /> : null}
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <View style={{ flex: 1 }}><Field label={qtyLabel} keyboardType="decimal-pad" value={f.miktarKg} onChangeText={v => set({ miktarKg: num(v) })} /></View>
                            <View style={{ flex: 1 }}><Field label={priceLabel} keyboardType="decimal-pad" value={f.kilogramFiyati} onChangeText={v => set({ kilogramFiyati: num(v) })} /></View>
                        </View>
                        {land && Number(f.miktarKg) > 0 ? <Notice message={number(Number(f.miktarKg) / 1000, 1) + ' ' + t('dönüm') + (Number(f.kilogramFiyati) > 0 ? ' · ' + (rent ? money(Number(f.kilogramFiyati) / Number(f.miktarKg) * 1000, 0) + ' / ' + t('dönüm · yıllık') : money(Number(f.kilogramFiyati) / Number(f.miktarKg)) + ' / m²') : '')} /> : null}
                        {!land ? <>
                            <Field label={'Minimum alım (' + unitLabel(unit) + ') — isteğe bağlı'} keyboardType="decimal-pad" value={f.minAlimKg} onChangeText={v => set({ minAlimKg: num(v) })} />
                            <Select label="Ambalaj" value={f.ambalaj} allowEmpty emptyLabel="Belirtilmedi" options={PACKAGING} raw={false} onChange={v => set({ ambalaj: v })} />
                            <Select label="Teslimat" value={f.teslimat} allowEmpty emptyLabel="Belirtilmedi" options={DELIVERY} raw={false} onChange={v => set({ teslimat: v })} />
                        </> : <>
                            <Select label="İmar durumu" value={f.imarDurumu} options={ZONING} raw={false} onChange={v => set({ imarDurumu: v })} />
                            <Select label="Tapu durumu" value={f.tapuDurumu} options={DEED} raw={false} onChange={v => set({ tapuDurumu: v })} />
                            <Select label="Sulama (isteğe bağlı)" value={f.sulama} allowEmpty emptyLabel="Belirtilmedi" options={IRRIGATION} raw={false} onChange={v => set({ sulama: v })} />
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <View style={{ flex: 1 }}><Field label="Ada" value={f.ada} onChangeText={v => set({ ada: v })} maxLength={20} placeholder="Örn. 112" /></View>
                                <View style={{ flex: 1 }}><Field label="Parsel" value={f.parsel} onChangeText={v => set({ parsel: v })} maxLength={20} placeholder="Örn. 7" /></View>
                            </View>
                            <SwitchRow label="Elektrik var" value={f.elektrik} onChange={v => set({ elektrik: v })} />
                            <SwitchRow label="Yola cephesi var" value={f.yolCephesi} onChange={v => set({ yolCephesi: v })} />
                        </>}
                    </Card>
                    <Card>
                        <Select label={land ? 'Arazinin bulunduğu il' : 'Ürünün bulunduğu il'} value={f.il} options={cities} onChange={v => set({ il: v, ilce: '', enlem: null, boylam: null })} />
                        <Select label="İlçe" value={f.ilce} options={f.il ? districts(f.il) : []} disabled={!f.il} placeholder={f.il ? 'Seç' : 'Önce il seç'} onChange={v => set({ ilce: v })} />
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Txt weight="800" style={{ flex: 1 }}>Haritada konum (isteğe bağlı)</Txt>
                            {f.enlem != null ? <Button title="Konumu kaldır" kind="plain" small full={false} onPress={() => set({ enlem: null, boylam: null })} /> : null}
                        </View>
                        <MiniMap center={mapCenter} zoom={f.enlem != null ? 13 : f.il ? 9 : 5} height={220}
                            pin={f.enlem != null && f.boylam != null ? { lat: f.enlem, lon: f.boylam } : undefined}
                            onTap={at => set({ enlem: Math.round(at.lat * 10000) / 10000, boylam: Math.round(at.lon * 10000) / 10000 })} />
                        <Txt muted size={12.5}>{f.enlem != null ? t('Konum işaretlendi. Değiştirmek için haritada başka bir yere dokun.') : t('Haritaya dokunarak ürünün veya arazinin yerini işaretle. İşaretlemezsen ilan, il merkezine yakın yaklaşık konumla gösterilir.')}</Txt>
                        <Txt muted size={12.5}>İletişim için profilindeki telefon kullanılır.</Txt>
                    </Card>
                </> : null}

                {step === 3 ? <>
                    <Txt muted>{land ? 'Araziyi farklı açılardan göster.' : 'Ürünü yakından ve ambalajında göster.'} {t('İlk fotoğraf ilanın vitrin fotoğrafı olur.')}</Txt>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <View style={{ flex: 1 }}><Button title="Kamera" kind="secondary" icon={<Icon name="camera" color={c.green2} size={19} />} onPress={() => addPhotos('camera')} /></View>
                        <View style={{ flex: 1 }}><Button title="Galeri" kind="secondary" icon={<Icon name="image" color={c.green2} size={19} />} onPress={() => addPhotos('library')} /></View>
                    </View>
                    <Txt muted size={12.5}>{t('En az 1, en fazla 10 fotoğraf.') + ' ' + photoCount + ' / ' + MAX_PHOTOS + '. ' + t('Fotoğraflardaki konum ve cihaz bilgileri yüklemeden önce silinir.') + ' ' + t('Galeriden seçerken uygulama yalnızca seçtiğin fotoğrafları görür.')}</Txt>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {existing?.photos?.map((p, i) => (
                            <View key={p.id}>
                                <Photo url={p.photoUrl ?? p.url} product={f.meyveTuru} style={{ width: 104, height: 104 }} />
                                {i === 0 ? <View style={{ position: 'absolute', left: 6, top: 6 }}><Tag label="Kapak" tone="accent" /></View> : null}
                                <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
                                    {i > 0 ? <Button title="Kapak" kind="secondary" small full={false} onPress={async () => {
                                        try { await post('/api/meyve-ilanlari/' + id + '/photos/' + p.id + '/cover'); setExisting(await get<Listing>('/api/meyve-ilanlari/' + id)); } catch (e) { toast(e instanceof Error ? e.message : 'İşlem tamamlanamadı.'); }
                                    }} /> : null}
                                    {(existing.photos?.length ?? 0) > 1 ? <Button title="Sil" kind="danger" small full={false} onPress={async () => {
                                        try { await del('/api/meyve-ilanlari/' + id + '/photos/' + p.id); setExisting(await get<Listing>('/api/meyve-ilanlari/' + id)); } catch (e) { toast(e instanceof Error ? e.message : 'Fotoğraf kaldırılamadı.'); }
                                    }} /> : null}
                                </View>
                            </View>
                        ))}
                        {photos.map((p, i) => (
                            <View key={p.uri}>
                                <Photo url={null} product={f.meyveTuru} style={{ width: 104, height: 104 }} />
                                <PickedImage uri={p.uri} />
                                {!existing && i === 0 ? <View style={{ position: 'absolute', left: 6, top: 6 }}><Tag label="Kapak" tone="accent" /></View> : null}
                                <Pressable accessibilityRole="button" accessibilityLabel={t('Kaldır')} onPress={() => setPhotos(all => all.filter(x => x.uri !== p.uri))}
                                    style={{ position: 'absolute', right: 4, top: 4, width: 28, height: 28, borderRadius: 14, backgroundColor: '#000a', alignItems: 'center', justifyContent: 'center' }}>
                                    <Icon name="close" color="#fff" size={15} />
                                </Pressable>
                            </View>
                        ))}
                    </View>
                    {/* Önizleme */}
                    <Card>
                        <Txt muted size={12.5} weight="800">ÖNİZLEME</Txt>
                        <Txt weight="800" size={16.5} raw>{f.baslik || '—'}</Txt>
                        <Txt raw muted>{[category(f.kategori).name, f.meyveTuru, f.cesit, f.il && f.il + ' / ' + f.ilce].filter(Boolean).join(' · ')}</Txt>
                        <Txt weight="900" size={20} color={c.accent}>{Number(f.kilogramFiyati) > 0 ? money(Number(f.kilogramFiyati), land ? 0 : 2) + (land ? (rent ? ' / yıl' : '') : ' / ' + unitLabel(unit)) : '—'}</Txt>
                        <Txt muted>{Number(f.miktarKg) > 0 ? number(Number(f.miktarKg)) + ' ' + unitLabel(unit) : ''}</Txt>
                    </Card>
                </> : null}

                {error ? <ErrorBox message={error} /> : null}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, padding: 12, paddingBottom: 12 + insets.bottom, backgroundColor: c.panel, borderTopWidth: 1, borderColor: c.line }}>
                {step > 0 ? <View style={{ flex: 1 }}><Button title="Geri" kind="secondary" onPress={() => { setError(null); setStep(s => s - 1); }} /></View> : null}
                <View style={{ flex: 2 }}>
                    {step < 3 ? <Button title="Devam et" onPress={next} /> : <Button title={editing ? 'Değişiklikleri kaydet' : 'Yayınla'} kind="accent" busy={busy} onPress={publish} />}
                </View>
            </View>
            {confirm.node}
        </View>
    );
}

function PickedImage({ uri }: { uri: string }) {
    // Yerel dosya: seçilen ve EXIF'i temizlenmiş fotoğraf.
    return <Image source={{ uri }} style={{ position: 'absolute', left: 0, top: 0, width: 104, height: 104, borderRadius: 12 }} contentFit="cover" />;
}
