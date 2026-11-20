import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Button, Card, ErrorBox, Field, H2, Loading, Notice, Page, Segmented, Select, SignInRequired, SwitchRow, Tag, toast, Txt } from '../components/ui';
import { api, get, post, put } from '../lib/api';
import { useApp } from '../lib/app-state';
import { cities, districts } from '../lib/catalog';
import type { MyProfile } from '../lib/types';

const ACTIVITIES: [string, string][] = [['Producer', 'Üretici'], ['Buyer', 'Alıcı'], ['Trader', 'Tüccar'], ['Cooperative', 'Kooperatif'], ['Other', 'Diğer']];

export default function Profile() {
    const { user, reloadUser, t } = useApp();
    const [p, setP] = useState<MyProfile | null>(null);
    const [f, setF] = useState<Record<string, string | boolean>>({});
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [phoneChallenge, setPhoneChallenge] = useState<string | null>(null);
    const [phoneInfo, setPhoneInfo] = useState<string | null>(null);
    const [code, setCode] = useState('');

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
        </Page>
    );
}
