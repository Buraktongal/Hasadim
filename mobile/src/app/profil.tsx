import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { FrameEditor, FramedImage, PhotoViewer } from '../components/ProfileMedia';
import { afterModal, Button, Card, ErrorBox, Field, H2, Loading, Notice, Page, Row, Segmented, Select, Sheet, SignInRequired, SwitchRow, Tag, toast, Txt, useConfirm } from '../components/ui';
import { api, get, post, put } from '../lib/api';
import { useApp } from '../lib/app-state';
import { cities, districts } from '../lib/catalog';
import { appendPhoto, pickPhotos } from '../lib/photos';
import { radius } from '../lib/theme';
import type { MyProfile, PhotoFrame } from '../lib/types';

const ACTIVITIES: [string, string][] = [['Producer', 'Üretici'], ['Buyer', 'Alıcı'], ['Trader', 'Tüccar'], ['Cooperative', 'Kooperatif'], ['Other', 'Diğer']];

export default function Profile() {
    const { user, reloadUser, t, colors: c, dark } = useApp();
    const [p, setP] = useState<MyProfile | null>(null);
    const [f, setF] = useState<Record<string, string | boolean>>({});
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [phoneChallenge, setPhoneChallenge] = useState<string | null>(null);
    const [phoneInfo, setPhoneInfo] = useState<string | null>(null);
    const [code, setCode] = useState('');
    // Fotoğraflar: hangi fotoğrafın seçenekleri açık, kadraj düzenleyicide ne var, büyütülen fotoğraf.
    const [menu, setMenu] = useState<'photo' | 'cover' | null>(null);
    const [framing, setFraming] = useState<{ target: 'photo' | 'cover'; url: string; local: boolean } | null>(null);
    const [viewing, setViewing] = useState<string | null>(null);
    const confirm = useConfirm();

    const load = useCallback(async () => {
        try {
            const r = await get<MyProfile>('/api/profiles/me');
            setP(r);
            setF({ displayName: r.displayName, accountType: r.accountType || 'Individual', activity: r.activity || 'Producer', businessName: r.businessName ?? '', city: r.city ?? '', district: r.district ?? '', about: r.about ?? '', phone: r.phone ?? '', showPhone: r.showPhone });
        } catch (e) { setError(e instanceof Error ? e.message : 'Profil yüklenemedi.'); }
    }, []);
    useEffect(() => { if (user) void load(); }, [user, load]);

    if (!user) return <Page title="Profilim"><SignInRequired /></Page>;
    if (!p) return <Page title="Profilim">{error ? <ErrorBox message={error} onRetry={load} /> : <Loading />}</Page>;
    const set = (k: string) => (v: string | boolean) => setF(prev => ({ ...prev, [k]: v }));
    const s = (k: string) => String(f[k] ?? '');

    async function save() {
        setBusy(true); setError(null);
        try {
            const r = await put<MyProfile>('/api/profiles/me', { ...f, phone: s('phone').trim() || null, version: p!.version });
            setP(r); toast('Profilin kaydedildi.'); void reloadUser();
        } catch (e) { setError(e instanceof Error ? e.message : 'Profil kaydedilemedi.'); void load(); }
        finally { setBusy(false); }
    }
    // Seçenek penceresi tamamen kapandıktan sonra fotoğraf seçici açılır; seçici kapandıktan sonra da kadraj ekranı.
    function pick(target: 'photo' | 'cover', source: 'camera' | 'library') {
        setMenu(null);
        afterModal(() => void pickNow(target, source));
    }
    async function pickNow(target: 'photo' | 'cover', source: 'camera' | 'library') {
        try {
            const r = await pickPhotos(source, 1);
            if ('photos' in r) { const photo = r.photos[0]; if (photo) afterModal(() => setFraming({ target, url: photo.uri, local: true })); }
            else if ('denied' in r) {
                if (!r.canAskAgain && await confirm.ask('Kamera izni gerekli', t('Fotoğraf çekmek için Ayarlar’dan Hasadım’a kamera izni vermelisin.'), 'Ayarları aç')) await Linking.openSettings();
            } else toast(r.error);
        } catch { toast('Fotoğraf hazırlanamadı. Başka bir fotoğraf dene.'); }
    }
    async function saveFrame(frame: PhotoFrame) {
        if (!framing) return;
        try {
            if (framing.local) {
                const form = new FormData();
                appendPhoto(form, 'file', { uri: framing.url, width: 0, height: 0 }, 0);
                await api('/api/profiles/me/' + (framing.target === 'cover' ? 'cover' : 'photo'), { method: 'POST', body: form });
            }
            const r = await put<MyProfile>('/api/profiles/me/frame', { target: framing.target, ...frame });
            setP(r); setFraming(null); void reloadUser();
            toast(framing.target === 'cover' ? 'Kapak fotoğrafı kaydedildi.' : 'Profil fotoğrafı kaydedildi.');
        } catch (e) { toast(e instanceof Error ? e.message : 'Fotoğraf kaydedilemedi.'); }
    }
    function removePhoto(target: 'photo' | 'cover') {
        setMenu(null);
        afterModal(() => void removeNow(target));
    }
    async function removeNow(target: 'photo' | 'cover') {
        if (!await confirm.ask(target === 'cover' ? 'Kapak fotoğrafını kaldır' : 'Profil fotoğrafını kaldır', t('Fotoğraf profilinden kaldırılacak.'), 'Kaldır', true)) return;
        try { setP(await del2('/api/profiles/me/' + (target === 'cover' ? 'cover' : 'photo'))); toast('Fotoğraf kaldırıldı.'); void reloadUser(); }
        catch (e) { toast(e instanceof Error ? e.message : 'Fotoğraf kaldırılamadı.'); }
    }
    const del2 = (path: string) => api<MyProfile>(path, { method: 'DELETE' });
    async function startPhone() {
        try { const r = await post<{ challengeId: string; mesaj: string }>('/api/account/me/phone/start'); setPhoneChallenge(r.challengeId); setPhoneInfo(r.mesaj); }
        catch (e) { toast(e instanceof Error ? e.message : 'Kod gönderilemedi.'); }
    }
    async function confirmPhone() {
        try { const r = await api<{ mesaj: string }>('/api/account/me/phone/confirm', { method: 'POST', json: { challengeId: phoneChallenge, code: code.trim() } }); toast(r.mesaj); setPhoneChallenge(null); setCode(''); void load(); }
        catch (e) { toast(e instanceof Error ? e.message : 'Kod doğrulanamadı.'); }
    }

    return (
        <Page title="Profilim">
            {/* Profil görünümü: kapak ve profil fotoğrafı herkese açık profildeki gibi görünür. */}
            <View style={{ borderRadius: radius.l, overflow: 'hidden', backgroundColor: c.panel, borderWidth: 1, borderColor: c.line }}>
                <Pressable onPress={() => setMenu('cover')} accessibilityRole="button" accessibilityLabel={t('Kapak fotoğrafı')} style={{ height: 130, backgroundColor: dark ? '#1f4a2f' : '#2f7a4a' }}>
                    <CoverPattern />
                    <FramedImage url={p.coverUrl} frame={p.coverFrame} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
                    <View style={{ position: 'absolute', right: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#000a', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}>
                        <Icon name="camera" color="#fff" size={16} />
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{t(p.coverUrl ? 'Kapağı düzenle' : 'Kapak fotoğrafı ekle')}</Text>
                    </View>
                </Pressable>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingHorizontal: 14, paddingBottom: 14, paddingLeft: 14 + 92 + 12, minHeight: 60 }}>
                    <View style={{ flex: 1, paddingTop: 8 }}>
                        <Txt weight="800" size={17} raw numberOfLines={1}>{p.businessName || p.displayName}</Txt>
                        <Txt muted size={12.5}>Fotoğraflara dokunarak değiştir, konumunu ayarla veya büyüt.</Txt>
                    </View>
                </View>
                <Pressable onPress={() => setMenu('photo')} accessibilityRole="button" accessibilityLabel={t('Profil fotoğrafı')}
                    style={{ position: 'absolute', left: 14, top: 130 - 44, width: 92, height: 92, borderRadius: 26, borderWidth: 4, borderColor: c.panel, backgroundColor: c.greenSoft, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
                    {p.photoUrl ? <FramedImage url={p.photoUrl} frame={p.photoFrame} style={{ width: '100%', height: '100%' }} /> : <Text style={{ fontSize: 36, fontWeight: '900', color: c.green2 }}>{(p.displayName || '?').trim().slice(0, 1).toLocaleUpperCase('tr')}</Text>}
                    <View style={{ position: 'absolute', right: 4, bottom: 4, width: 26, height: 26, borderRadius: 13, backgroundColor: c.green2, alignItems: 'center', justifyContent: 'center' }}><Icon name="camera" color="#fff" size={14} /></View>
                </Pressable>
            </View>
            <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <H2>Profil doluluğu</H2><View style={{ flex: 1 }} /><Tag label={'%' + p.completion} raw tone={p.completion >= 80 ? 'green' : 'accent'} />
                </View>
                <Txt muted size={13}>Profil bilgilerin ilan sayfalarında satıcı kartında görünür.</Txt>
            </Card>
            <Card>
                <Field label="Ad soyad" value={s('displayName')} onChangeText={set('displayName')} maxLength={100} />
                <Segmented value={s('accountType')} onChange={set('accountType')} options={[['Individual', 'Bireysel'], ['Business', 'Kurumsal']]} />
                {s('accountType') === 'Business' ? <Field label="Firma adı" value={s('businessName')} onChangeText={set('businessName')} maxLength={150} /> : null}
                <Select label="Faaliyet" value={s('activity')} options={ACTIVITIES} raw={false} onChange={set('activity')} />
                <Select label="İl" value={s('city')} options={cities} onChange={v => setF(prev => ({ ...prev, city: v, district: '' }))} />
                <Select label="İlçe" value={s('district')} options={s('city') ? districts(s('city')) : []} disabled={!s('city')} placeholder={s('city') ? 'Seç' : 'Önce il seç'} onChange={set('district')} />
                <Field label="Hakkında" value={s('about')} onChangeText={set('about')} maxLength={2000} multiline style={{ minHeight: 100 }} hint="Ürettiğin ürünler, kapasite, teslimat koşulları…" />
            </Card>
            <Card>
                <H2>İletişim</H2>
                <Field label="Cep telefonu" value={s('phone')} onChangeText={set('phone')} keyboardType="phone-pad" maxLength={25} />
                <SwitchRow label="Telefonumu ilanlarımda göster" value={Boolean(f.showPhone)} onChange={set('showPhone')} />
                {p.phoneVerified ? <Notice message={t('Telefonun doğrulandı.')} /> : s('phone') ? (
                    phoneChallenge ? <>
                        {phoneInfo ? <Notice message={phoneInfo} /> : null}
                        <Field label="Doğrulama kodu" value={code} onChangeText={setCode} keyboardType="number-pad" textContentType="oneTimeCode" maxLength={6} />
                        <Button title="Doğrula" small onPress={confirmPhone} />
                    </> : <Button title="Telefonu SMS ile doğrula" kind="secondary" small onPress={startPhone} />
                ) : null}
                <Txt muted size={12.5}>{t('E-posta') + ': ' + p.email}</Txt>
            </Card>
            {error ? <ErrorBox message={error} /> : null}
            <Button title="Kaydet" busy={busy} onPress={save} />

            <Sheet visible={Boolean(menu)} onClose={() => setMenu(null)} title={menu === 'cover' ? 'Kapak fotoğrafı' : 'Profil fotoğrafı'}>
                {menu ? <>
                    <Row title="Galeriden seç" icon={<Icon name="image" color={c.green2} />} onPress={() => pick(menu, 'library')} />
                    <Row title="Fotoğraf çek" icon={<Icon name="camera" color={c.green2} />} onPress={() => pick(menu, 'camera')} />
                    {(menu === 'cover' ? p.coverUrl : p.photoUrl) ? <>
                        <Row title="Konumunu ayarla" subtitle="Sürükleyerek ortala, yakınlaştır" icon={<Icon name="edit" color={c.green2} />} onPress={() => { const url = (menu === 'cover' ? p.coverUrl : p.photoUrl)!; const target = menu; setMenu(null); afterModal(() => setFraming({ target, url, local: false })); }} />
                        <Row title="Büyüt" icon={<Icon name="eye" color={c.green2} />} onPress={() => { const url = (menu === 'cover' ? p.coverUrl : p.photoUrl)!; setMenu(null); afterModal(() => setViewing(url)); }} />
                        <Row title="Kaldır" danger icon={<Icon name="trash" color={c.danger} />} onPress={() => removePhoto(menu)} />
                    </> : null}
                    <Txt muted size={12}>{menu === 'cover' ? t('Geniş, yatay bir fotoğraf seç (tarlan, bahçen, deponun önü…).') : t('Yüzünün veya logonun net göründüğü bir fotoğraf seç.')}</Txt>
                </> : null}
            </Sheet>
            {framing ? <FrameEditor url={framing.url} shape={framing.target === 'cover' ? 'cover' : 'avatar'} title={framing.target === 'cover' ? 'Kapak fotoğrafı' : 'Profil fotoğrafı'}
                frame={framing.local ? null : framing.target === 'cover' ? p.coverFrame : p.photoFrame} onCancel={() => setFraming(null)} onSave={saveFrame} /> : null}
            <PhotoViewer url={viewing} onClose={() => setViewing(null)} />
            {confirm.node}
        </Page>
    );
}

// Kapak fotoğrafı yokken yeşil zemin üzerinde ince çizgiler (web'deki kapakla uyumlu).
function CoverPattern() {
    return (
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, overflow: 'hidden' }}>
            <View style={{ position: 'absolute', right: -40, top: -70, width: 200, height: 200, borderRadius: 100, backgroundColor: '#ffffff1f' }} />
            <View style={{ position: 'absolute', left: -30, bottom: -90, width: 170, height: 170, borderRadius: 85, backgroundColor: '#ffffff17' }} />
            <View style={{ position: 'absolute', left: '35%', top: 0, bottom: 0, width: 160, backgroundColor: '#ffffff0d', transform: [{ skewX: '-20deg' }] }} />
        </View>
    );
}
