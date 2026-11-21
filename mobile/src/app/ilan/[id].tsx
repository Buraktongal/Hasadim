import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, Share, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../components/Icon';
import { MiniMap, approximate } from '../../components/MiniMap';
import { Photo } from '../../components/Photo';
import { Button, Card, ErrorBox, Eyebrow, Field, goBack, H1, Header, IconButton, Loading, Sheet, Tag, toast, Txt, useConfirm } from '../../components/ui';
import { API_BASE } from '../../lib/config';
import { del, get, post } from '../../lib/api';
import { useApp } from '../../lib/app-state';
import { ACTIVITY, category } from '../../lib/catalog';
import { date, discount, initials, isLand, isRent, money, number, priceText, qtyText, unitLabel, unitPriceText } from '../../lib/format';
import { toggleFavorite } from '../../lib/listings';
import type { Listing, PublicProfile } from '../../lib/types';

const viewed = new Set<string>();
const cleanNumber = (v: string) => v.replace(/[^0-9.,]/g, '').replace(',', '.').slice(0, 14);

export default function ListingDetail() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors: c, t, user, lang } = useApp();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const [x, setX] = useState<Listing | null>(null);
    const [seller, setSeller] = useState<PublicProfile | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [index, setIndex] = useState(0);
    const [sheet, setSheet] = useState<'offer' | 'report' | 'more' | null>(null);
    const confirm = useConfirm();
    const valid = typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id);

    const load = useCallback(async () => {
        if (!valid) { setError('Aranan kayıt bulunamadı.'); return; }
        setError(null);
        try {
            const item = await get<Listing>('/api/meyve-ilanlari/' + id);
            setX(item);
            get<PublicProfile>('/api/profiles/' + item.ownerId).then(setSeller).catch(() => undefined);
            // Görüntülenme bir oturumda bir kez sayılır; kendi ilanı ve yayında olmayan ilan sayılmaz.
            if (!item.isMine && item.status === 4 && item.active && !viewed.has(item.id)) {
                viewed.add(item.id);
                post<{ viewCount: number }>('/api/meyve-ilanlari/' + item.id + '/view').then(r => setX(v => (v ? { ...v, viewCount: r.viewCount } : v))).catch(() => viewed.delete(item.id));
            }
        } catch (e) { setError(e instanceof Error ? e.message : 'İlan yüklenemedi.'); }
    }, [id, valid]);
    useEffect(() => { void load(); }, [load]);

    if (error) return <View style={{ flex: 1, backgroundColor: c.bg }}><Header title="İlan" /><View style={{ padding: 16 }}><ErrorBox message={error} onRetry={valid ? load : undefined} /></View></View>;
    if (!x) return <View style={{ flex: 1, backgroundColor: c.bg }}><Header title="İlan" /><Loading /></View>;

    const land = isLand(x);
    const photos = x.photos?.length ? x.photos.map(p => p.photoUrl ?? p.url) : [x.photoUrl];
    const off = discount(x);
    const exact = x.enlem != null && x.boylam != null;
    const point = exact ? { lat: Number(x.enlem), lon: Number(x.boylam) } : approximate(x.id, x.il);
    const signedIn = Boolean(user);
    const needLogin = (fn: () => void) => () => (signedIn ? fn() : router.push('/giris'));
    const facts: [string, string | null | undefined][] = land ? [
        ['İşlem tipi', isRent(x) ? 'Kiralık' : 'Satılık'], ['Alan', qtyText(x)], ['İmar durumu', x.imarDurumu], ['Tapu durumu', x.tapuDurumu],
        ['Sulama', x.sulama], ['Ada / parsel', x.ada || x.parsel ? `${x.ada ?? '–'} / ${x.parsel ?? '–'}` : null],
        ['Elektrik', x.elektrik == null ? null : x.elektrik ? 'Var' : 'Yok'], ['Yol cephesi', x.yolCephesi == null ? null : x.yolCephesi ? 'Var' : 'Yok']
    ] : [
        ['Ürün', x.meyveTuru], ['Çeşit', x.cesit || null], ['Miktar', qtyText(x)], ['Hasat tarihi', date(x.hasatTarihi, lang)],
        ['Minimum alım', x.minAlimKg ? number(x.minAlimKg) + ' ' + unitLabel(x.birim) : null], ['Ambalaj', x.ambalaj], ['Teslimat', x.teslimat]
    ];

    async function share() {
        const url = API_BASE.startsWith('https://') ? API_BASE + '/html/ilan.html?id=' + x!.id : undefined;
        await Share.share({ message: x!.baslik + ' — ' + t(priceText(x!)) + (url ? '\n' + url : ''), url });
    }
    async function block() {
        setSheet(null);
        if (!await confirm.ask('Satıcıyı engelle', t('Engellediğin kişi sana mesaj ve teklif gönderemez, ilanlarını görmezsin.'), 'Engelle', true)) return;
        try { await post('/api/blocks/' + x!.ownerId); toast('Kullanıcı engellendi.'); goBack(); } catch (e) { toast(e instanceof Error ? e.message : 'İşlem tamamlanamadı.'); }
    }
    async function remove() {
        if (!await confirm.ask('İlanı sil', t('İlan kalıcı olarak silinecek. Bu işlem geri alınamaz.'), 'Sil', true)) return;
        try { await del('/api/meyve-ilanlari/' + x!.id); toast('İlan silindi.'); goBack(); } catch (e) { toast(e instanceof Error ? e.message : 'İlan silinemedi.'); }
    }
    async function sold() {
        if (!await confirm.ask('Satıldı olarak işaretle', t('İlan yayından kalkacak ve geçmiş ilanlarına taşınacak.'), 'Satıldı')) return;
        try { await post('/api/meyve-ilanlari/' + x!.id + '/sold', { version: x!.version }); toast('İlan satıldı olarak işaretlendi.'); void load(); } catch (e) { toast(e instanceof Error ? e.message : 'İşlem tamamlanamadı.'); }
    }

    return (
        <View style={{ flex: 1, backgroundColor: c.bg }}>
            <Header title={x.baslik} raw right={<>
                <IconButton label="Paylaş" onPress={share}><Icon name="share" color={c.green2} /></IconButton>
                {!x.isMine ? <IconButton label="Diğer işlemler" onPress={() => setSheet('more')}><Text style={{ color: c.green2, fontSize: 22, fontWeight: '900', marginTop: -8 }}>…</Text></IconButton> : null}
            </>} />
            <ScrollView contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}>
                <View>
                    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={e => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}>
                        {photos.map((url, i) => <Photo key={i} url={url} product={x.meyveTuru} radius={0} style={{ width, height: Math.round(width * 0.72) }} />)}
                    </ScrollView>
                    {photos.length > 1 ? <View style={{ position: 'absolute', bottom: 10, alignSelf: 'center', flexDirection: 'row', gap: 6, backgroundColor: '#0006', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 12 }}>
                        {photos.map((_, i) => <View key={i} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: i === index ? '#fff' : '#fff8' }} />)}
                    </View> : null}
                    <Pressable accessibilityRole="button" accessibilityLabel={t(x.favorite ? 'Favorilerden çıkar' : 'Favorilere ekle')}
                        onPress={() => toggleFavorite(x, signedIn, fav => setX(v => (v ? { ...v, favorite: fav, favoriteCount: (v.favoriteCount ?? 0) + (fav ? 1 : -1) } : v))).catch(e => toast(e.message))}
                        style={{ position: 'absolute', top: 12, right: 12, width: 44, height: 44, borderRadius: 22, backgroundColor: c.panel, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="heart" color={x.favorite ? c.accent : c.muted} />
                    </Pressable>
                </View>

                <View style={{ padding: 16, gap: 14 }}>
                    <View style={{ gap: 6 }}>
                        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                            <Tag label={category(x.kategori).name} />
                            {land ? <Tag tone="accent" label={isRent(x) ? 'Kiralık' : 'Satılık'} /> : null}
                            {x.isMine && x.statusText ? <Tag tone={x.status === 4 ? 'green' : 'accent'} label={x.statusText} /> : null}
                        </View>
                        <H1 raw selectable>{x.baslik}</H1>
                        <Txt muted size={13}>{t('İlan No') + ': ' + x.listingNumber + ' · ' + number(x.viewCount ?? 0) + ' ' + t('görüntülenme') + ' · ' + number(x.favoriteCount ?? 0) + ' ' + t('favori')}</Txt>
                    </View>

                    <Card>
                        <Txt size={26} weight="900" color={c.accent}>{priceText(x)}</Txt>
                        {unitPriceText(x) ? <Txt muted weight="700">{unitPriceText(x)!}</Txt> : null}
                        {off && x.oncekiKilogramFiyati ? <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                            <Txt muted raw style={{ textDecorationLine: 'line-through' }}>{money(x.oncekiKilogramFiyati, land ? 0 : 2)}</Txt>
                            <Tag raw label={'↓ %' + String(off).replace('.', ',') + ' ' + t('indirim')} />
                        </View> : null}
                        {x.reviewNote && x.isMine ? <ErrorBox message={t('Düzeltme notu') + ': ' + x.reviewNote} /> : null}
                    </Card>

                    <Card>
                        {facts.filter(([, v]) => v).map(([label, value]) => (
                            <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                                <Txt muted>{label}</Txt>
                                <Txt weight="700" style={{ flex: 1, textAlign: 'right' }}>{value!}</Txt>
                            </View>
                        ))}
                    </Card>

                    {x.aciklama ? <Card><Eyebrow>Açıklama</Eyebrow><Txt raw selectable>{x.aciklama}</Txt></Card> : null}

                    <Card>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.greenSoft, alignItems: 'center', justifyContent: 'center' }}><Icon name="pin" color={c.accent} size={20} /></View>
                            <View style={{ flex: 1 }}><Eyebrow>Konum</Eyebrow><Txt weight="800" size={17} raw>{x.ilce + ', ' + x.il}</Txt></View>
                        </View>
                        <Txt muted size={13} color={exact ? c.green2 : c.muted} weight={exact ? '700' : undefined}>{exact ? 'Satıcının haritada işaretlediği konum' : 'Yaklaşık konum · tam yeri satıcıya sor'}</Txt>
                        {point ? <>
                            <MiniMap center={point} zoom={exact ? 13 : 9} pin={point} height={190} />
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <View style={{ flex: 1 }}><Button kind="secondary" small title="Haritada aç" onPress={() => void Linking.openURL(`https://www.openstreetmap.org/?mlat=${point.lat}&mlon=${point.lon}#map=${exact ? 15 : 10}/${point.lat}/${point.lon}`)} /></View>
                                {exact ? <View style={{ flex: 1 }}><Button kind="secondary" small title="Yol tarifi" onPress={() => void Linking.openURL(`https://www.openstreetmap.org/directions?route=%3B${point.lat}%2C${point.lon}`)} /></View> : null}
                            </View>
                        </> : null}
                    </Card>

                    <Card>
                        <Eyebrow>Hasadım satıcı profili</Eyebrow>
                        <Pressable onPress={() => router.push({ pathname: '/satici/[id]', params: { id: x.ownerId } })} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.greenSoft, alignItems: 'center', justifyContent: 'center' }}><Txt weight="900" size={18} color={c.green2} raw>{initials(seller?.displayName ?? x.ownerName)}</Txt></View>
                            <View style={{ flex: 1 }}>
                                <Txt weight="800" size={16.5} raw>{seller?.displayName ?? x.ownerName}</Txt>
                                {seller ? <Txt muted size={13} raw>{[seller.businessName, seller.city, seller.district].filter(Boolean).join(' · ')}</Txt> : null}
                            </View>
                            <Icon name="user" color={c.green2} />
                        </Pressable>
                        {seller ? <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                            {seller.activity ? <Tag tone="muted" label={ACTIVITY[seller.activity] ?? 'Diğer'} /> : null}
                            <Tag tone="muted" label={seller.accountType === 'Business' ? 'Kurumsal · Kullanıcı beyanı' : 'Bireysel hesap'} />
                            <Tag tone={seller.emailVerified ? 'green' : 'muted'} label={seller.emailVerified ? 'E-posta doğrulandı' : 'E-posta doğrulanmadı'} />
                            <Tag tone="muted" raw label={number(seller.activeListingCount) + ' ' + t('yayında ilan')} />
                        </View> : null}
                    </Card>
                </View>
            </ScrollView>

            {/* Alt eylem çubuğu */}
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 8, padding: 12, paddingBottom: 12 + insets.bottom, backgroundColor: c.panel, borderTopWidth: 1, borderColor: c.line }}>
                {x.isMine ? <>
                    <View style={{ flex: 1 }}><Button title="Düzenle" kind="secondary" onPress={() => router.push({ pathname: '/ilan-ver', params: { id: x.id } })} /></View>
                    {x.status === 4 ? <View style={{ flex: 1 }}><Button title="Satıldı" kind="secondary" onPress={sold} /></View> : null}
                    <View style={{ flex: 1 }}><Button title="Sil" kind="danger" onPress={remove} /></View>
                </> : <>
                    {x.showPhone !== false && x.telefon ? <IconButton label="Satıcıyı ara" size={48} onPress={() => void Linking.openURL('tel:' + x.telefon!.replace(/[^0-9+]/g, ''))}><Icon name="phone" color={c.green2} /></IconButton> : null}
                    <View style={{ flex: 1 }}><Button title="Mesaj gönder" kind="secondary" onPress={needLogin(() => router.push({ pathname: '/sohbet', params: { listingId: x.id, userId: x.ownerId, name: x.ownerName, title: x.baslik } }))} /></View>
                    <View style={{ flex: 1 }}><Button title="Teklif ver" kind="accent" onPress={needLogin(() => setSheet('offer'))} /></View>
                </>}
            </View>

            <OfferSheet listing={x} visible={sheet === 'offer'} onClose={() => setSheet(null)} />
            <ReportSheet listing={x} visible={sheet === 'report'} onClose={() => setSheet(null)} />
            <Sheet visible={sheet === 'more'} onClose={() => setSheet(null)} title="Diğer işlemler">
                <Button title="İlanı bildir" kind="secondary" icon={<Icon name="flag" color={c.green2} size={18} />} onPress={needLogin(() => setSheet('report'))} />
                <Button title="Satıcıyı engelle" kind="danger" icon={<Icon name="ban" color={c.danger} size={18} />} onPress={needLogin(block)} />
            </Sheet>
            {confirm.node}
        </View>
    );
}

function OfferSheet({ listing: x, visible, onClose }: { listing: Listing; visible: boolean; onClose: () => void }) {
    const { t } = useApp();
    const [amount, setAmount] = useState('');
    const [qty, setQty] = useState('');
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const land = isLand(x);
    const first = useRef(true);
    useEffect(() => { if (visible && first.current) { first.current = false; setAmount(String(x.kilogramFiyati)); } }, [visible, x.kilogramFiyati]);
    const total = !land && Number(amount) > 0 && Number(qty) > 0 ? Number(amount) * Number(qty) : null;
    async function send() {
        setError(null);
        const value = Number(amount);
        if (!(value > 0)) { setError('Geçerli bir teklif tutarı gir.'); return; }
        setBusy(true);
        try {
            await post('/api/offers', { listingId: x.id, amount: value, quantity: !land && Number(qty) > 0 ? Number(qty) : null, note: note.trim() || null });
            toast('Teklifin satıcıya iletildi.'); onClose();
        } catch (e) { setError(e instanceof Error ? e.message : 'Teklif gönderilemedi.'); }
        finally { setBusy(false); }
    }
    return (
        <Sheet visible={visible} onClose={onClose} title="Teklif ver">
            <Txt muted>{t('İlan fiyatı') + ': ' + t(priceText(x))}</Txt>
            <Field label={land ? (isRent(x) ? 'Teklifin (TL / yıl)' : 'Teklifin (TL)') : 'Teklifin (TL / ' + unitLabel(x.birim) + ')'} keyboardType="decimal-pad" value={amount} onChangeText={v => setAmount(cleanNumber(v))} />
            {!land ? <Field label={'Almak istediğin miktar (' + unitLabel(x.birim) + ')'} hint="İsteğe bağlı" keyboardType="decimal-pad" value={qty} onChangeText={v => setQty(cleanNumber(v))} /> : null}
            {total ? <Txt weight="800" color={undefined}>{t('Toplam') + ': ' + money(total)}</Txt> : null}
            <Field label="Not" hint="İsteğe bağlı · ödeme, teslimat…" value={note} onChangeText={setNote} maxLength={500} multiline numberOfLines={3} style={{ minHeight: 80 }} />
            {error ? <ErrorBox message={error} /> : null}
            <Button title="Teklifi gönder" kind="accent" busy={busy} onPress={send} />
        </Sheet>
    );
}

function ReportSheet({ listing: x, visible, onClose }: { listing: Listing; visible: boolean; onClose: () => void }) {
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    async function send() {
        if (reason.trim().length < 5) { setError('Şikâyet nedenini kısaca yaz.'); return; }
        setBusy(true); setError(null);
        try { await post('/api/meyve-ilanlari/' + x.id + '/report', { reason: reason.trim() }); toast('Bildiriminiz alındı.'); setReason(''); onClose(); }
        catch (e) { setError(e instanceof Error ? e.message : 'Bildirim gönderilemedi.'); }
        finally { setBusy(false); }
    }
    return (
        <Sheet visible={visible} onClose={onClose} title="İlanı bildir">
            <Field label="Şikâyet nedeni" value={reason} onChangeText={setReason} maxLength={1000} multiline style={{ minHeight: 100 }} />
            {error ? <ErrorBox message={error} /> : null}
            <Button title="Bildirimi gönder" busy={busy} onPress={send} />
        </Sheet>
    );
}

