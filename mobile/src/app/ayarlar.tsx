import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { biometricsAvailable } from '../components/AppLock';
import { Icon } from '../components/Icon';
import { Button, Card, Divider, ErrorBox, Field, H2, Page, Row, Segmented, Sheet, SwitchRow, toast, Txt } from '../components/ui';
import { api, post } from '../lib/api';
import { useApp } from '../lib/app-state';
import { API_BASE, APP_VERSION } from '../lib/config';

export default function SettingsScreen() {
    const app = useApp();
    const { colors: c, t, user, serverSettings } = app;
    const [bio, setBio] = useState(false);
    const [sheet, setSheet] = useState<'password' | 'delete' | null>(null);
    useEffect(() => { void biometricsAvailable().then(setBio); }, []);

    const notify = (key: 'notifyMessages' | 'notifyOffers' | 'notifySavedSearches' | 'notifyPriceDrops') => (v: boolean) =>
        app.saveSettings({ [key]: v }).catch(e => toast(e instanceof Error ? e.message : 'Kaydedilemedi.'));

    return (
        <Page title="Ayarlar">
            <Card>
                <H2>Görünüm</H2>
                <Segmented value={app.theme} onChange={v => app.setTheme(v as 'system' | 'light' | 'dark')} options={[['system', 'Cihaza göre'], ['light', 'Açık'], ['dark', 'Koyu']]} />
                <H2>Dil</H2>
                <Segmented value={app.lang} onChange={v => app.setLang(v as 'tr' | 'en')} options={[['tr', 'Türkçe'], ['en', 'English']]} />
                {user ? <Txt muted size={12.5}>Görünüm ve dil hesabına kaydedilir; diğer cihazlarında da uygulanır.</Txt> : null}
            </Card>

            {user && serverSettings ? (
                <Card>
                    <H2>Bildirimler</H2>
                    <SwitchRow label="Mesajlar" hint="Sana yeni mesaj gelince" value={serverSettings.notifyMessages} onChange={notify('notifyMessages')} />
                    <SwitchRow label="Teklifler" hint="Teklif gelince veya teklifin yanıtlanınca" value={serverSettings.notifyOffers} onChange={notify('notifyOffers')} />
                    <SwitchRow label="Kayıtlı aramalar" hint="Aramana uygun yeni ilan yayınlanınca" value={serverSettings.notifySavedSearches} onChange={notify('notifySavedSearches')} />
                    <SwitchRow label="Fiyat düşüşleri" hint="Favori ilanının fiyatı düşünce" value={serverSettings.notifyPriceDrops} onChange={notify('notifyPriceDrops')} />
                </Card>
            ) : null}

            {user ? (
                <Card padded={false} style={{ overflow: 'hidden' }}>
                    <View style={{ padding: 14, paddingBottom: 4 }}><H2>Gizlilik ve güvenlik</H2></View>
                    {bio ? <View style={{ paddingHorizontal: 14 }}><SwitchRow label="Uygulama kilidi" hint="Açılışta ve 1 dakikadan uzun arka planda kalınca Face ID / parmak izi iste; uygulama değiştiricide ekranı gizle." value={app.appLock} onChange={app.setAppLock} /></View> : null}
                    <Divider />
                    {user.hasPassword ? <Row title="Şifre değiştir" icon={<Icon name="key" color={c.green2} size={20} />} onPress={() => setSheet('password')} /> : null}
                    <Divider />
                    <Row title="Hesap güvenliği" subtitle="Açık oturumlar ve giriş hareketleri" icon={<Icon name="shield" color={c.green2} size={20} />} onPress={() => router.push('/guvenlik')} />
                    <Divider />
                    <Row title="Hesabı sil" danger icon={<Icon name="trash" color={c.danger} size={20} />} onPress={() => setSheet('delete')} />
                </Card>
            ) : null}

            <Card>
                <Txt muted size={13}>{t('Sunucu adresi') + ': ' + (API_BASE || '–')}</Txt>
                <Txt muted size={13}>{t('Sürüm') + ': ' + APP_VERSION}</Txt>
            </Card>

            <PasswordSheet visible={sheet === 'password'} onClose={() => setSheet(null)} />
            <DeleteSheet visible={sheet === 'delete'} onClose={() => setSheet(null)} hasPassword={Boolean(user?.hasPassword)} />
        </Page>
    );
}

function PasswordSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const { signOut } = useApp();
    const [f, setF] = useState({ password: '', newPassword: '', newPasswordConfirm: '' });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const set = (k: keyof typeof f) => (v: string) => setF(p => ({ ...p, [k]: v }));
    async function save() {
        setError(null);
        if (f.newPassword.length < 12) { setError('Yeni şifre en az 12 karakter olmalı.'); return; }
        if (f.newPassword !== f.newPasswordConfirm) { setError('Yeni şifreler eşleşmiyor.'); return; }
        setBusy(true);
        try {
            await post('/api/account/change-password', f);
            setF({ password: '', newPassword: '', newPasswordConfirm: '' }); onClose();
            // Şifre değişince sunucu tüm oturumları kapatır; yeni şifreyle tekrar giriş yapılır.
            await signOut('Şifren değişti. Güvenliğin için tüm cihazlardan çıkış yapıldı; yeni şifrenle giriş yap.');
            router.push('/giris');
        } catch (e) { setError(e instanceof Error ? e.message : 'Şifre değiştirilemedi.'); }
        finally { setBusy(false); }
    }
    return (
        <Sheet visible={visible} onClose={onClose} title="Şifre değiştir">
            <Field label="Mevcut şifre" secureTextEntry autoComplete="current-password" value={f.password} onChangeText={set('password')} maxLength={128} />
            <Field label="Yeni şifre" secureTextEntry autoComplete="new-password" textContentType="newPassword" value={f.newPassword} onChangeText={set('newPassword')} maxLength={128} hint="En az 12 karakter; büyük harf, küçük harf ve rakam." />
            <Field label="Yeni şifre (tekrar)" secureTextEntry autoComplete="new-password" value={f.newPasswordConfirm} onChangeText={set('newPasswordConfirm')} maxLength={128} />
            <Txt muted size={12.5}>Şifren değişince tüm cihazlardaki oturumların kapanır.</Txt>
            {error ? <ErrorBox message={error} /> : null}
            <Button title="Şifreyi değiştir" busy={busy} onPress={save} />
        </Sheet>
    );
}

function DeleteSheet({ visible, onClose, hasPassword }: { visible: boolean; onClose: () => void; hasPassword: boolean }) {
    const { signOut, t } = useApp();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    async function remove() {
        setBusy(true); setError(null);
        try {
            await api('/api/account/delete', { method: 'POST', json: { password: password || null, confirm: /^HESABIMI S[Iİ]L$/.test(confirm.trim().toLocaleUpperCase('tr')) ? 'HESABIMI SİL' : confirm.trim() } });
            onClose();
            await signOut('Hesabın silindi. Hasadım\'ı kullandığın için teşekkürler.');
            router.replace('/');
        } catch (e) { setError(e instanceof Error ? e.message : 'Hesap silinemedi.'); }
        finally { setBusy(false); }
    }
    return (
        <Sheet visible={visible} onClose={onClose} title="Hesabı sil">
            <ErrorBox message={t('Hesabın, ilanların, mesajların, tekliflerin ve kayıtlı aramaların kalıcı olarak silinir. Bu işlem geri alınamaz.')} />
            {hasPassword ? <Field label="Şifre" secureTextEntry value={password} onChangeText={setPassword} maxLength={128} /> : null}
            <Field label={t('Onay için HESABIMI SİL yaz')} value={confirm} onChangeText={setConfirm} autoCapitalize="characters" maxLength={40} />
            {error ? <ErrorBox message={error} /> : null}
            <Button title="Hesabımı kalıcı olarak sil" kind="danger" busy={busy} disabled={confirm.trim().length < 5} onPress={remove} />
        </Sheet>
    );
}
