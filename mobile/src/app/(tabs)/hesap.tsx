import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Icon, type IconName } from '../../components/Icon';
import { Button, Card, Divider, Row, Screen, Txt, useConfirm } from '../../components/ui';
import { useApp } from '../../lib/app-state';
import { useCounts } from '../../lib/counts';
import { APP_VERSION } from '../../lib/config';
import { initials } from '../../lib/format';

type Item = [IconName, string, string, string, number?];

export default function Account() {
    const { colors: c, t, user, signOut, lang } = useApp();
    const counts = useCounts(Boolean(user));
    const confirm = useConfirm();
    const badge = (n?: number) => (n ? <View style={{ minWidth: 22, height: 22, borderRadius: 11, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}><Text style={{ color: '#fff', fontWeight: '900', fontSize: 12 }}>{n > 99 ? '99+' : n}</Text></View> : undefined);
    const section = (title: string, items: Item[]) => (
        <View style={{ gap: 6 }}>
            <Txt muted size={12.5} weight="800" style={{ marginLeft: 4, letterSpacing: 0.8 }}>{t(title).toLocaleUpperCase(lang === 'en' ? 'en' : 'tr')}</Txt>
            <Card padded={false} style={{ overflow: 'hidden' }}>
                {items.map(([icon, label, sub, href, n], i) => (
                    <View key={href}>
                        {i ? <Divider /> : null}
                        <Row title={label} subtitle={sub} icon={<Icon name={icon} color={c.green2} size={20} />} onPress={() => router.push(href as never)}
                            right={n ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>{badge(n)}</View> : undefined} />
                    </View>
                ))}
            </Card>
        </View>
    );

    if (!user) return (
        <Screen>
            <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.greenSoft, alignItems: 'center', justifyContent: 'center' }}><Icon name="user" color={c.green2} size={30} /></View>
                <Txt size={19} weight="800" center>{'Hasadım\'a hoş geldin'}</Txt>
                <Txt muted center>İlan vermek, teklif ve mesaj göndermek için giriş yap.</Txt>
                <View style={{ alignSelf: 'stretch', gap: 8, marginTop: 6 }}>
                    <Button title="Giriş yap" onPress={() => router.push('/giris')} />
                    <Button title="Kayıt ol" kind="secondary" onPress={() => router.push('/kayit')} />
                </View>
            </Card>
            {section('Uygulama', [['settings', 'Ayarlar', 'Görünüm ve dil', '/ayarlar'], ['calendar', 'Ürün takvimi', 'Hangi ay ne hasat edilir', '/urun-takvimi']])}
            <Txt muted size={12} center>{t('Sürüm') + ' ' + APP_VERSION}</Txt>
        </Screen>
    );

    return (
        <Screen>
            <Card>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.green, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: c.onGreen, fontWeight: '900', fontSize: 20 }}>{initials(user.displayName)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Txt size={18} weight="800" raw numberOfLines={1}>{user.displayName}</Txt>
                        {user.email ? <Txt muted size={13} raw numberOfLines={1}>{user.email}</Txt> : null}
                    </View>
                    <Button title="Profil" kind="secondary" small full={false} onPress={() => router.push('/profil')} />
                </View>
            </Card>
            {section('İlan ve ticaret', [
                ['tag', 'İlanlarım', 'Yayındaki ve taslak ilanların', '/ilanlarim'],
                ['heart', 'Favorilerim', 'Beğendiğin ilanlar', '/ilanlarim?tab=favorites'],
                ['offer', 'Tekliflerim', 'Gelen ve gönderilen teklifler', '/tekliflerim', counts.offers],
                ['bell', 'Bildirimler', 'Teklif, mesaj ve fiyat bildirimleri', '/bildirimler', counts.notifications],
                ['bookmark', 'Kayıtlı aramalar', 'Yeni ilan gelince haber al', '/kayitli-aramalar']
            ])}
            {section('Hesap', [
                ['shield', 'Hesap güvenliği', 'Oturumlar, giriş yöntemleri, hareketler', '/guvenlik'],
                ['ban', 'Engellenenler', 'Engellediğin kullanıcılar', '/engellenenler'],
                ['settings', 'Ayarlar', 'Görünüm, dil, bildirimler, şifre, uygulama kilidi', '/ayarlar'],
                ['calendar', 'Ürün takvimi', 'Hangi ay ne hasat edilir', '/urun-takvimi']
            ])}
            <Button title="Çıkış yap" kind="danger" icon={<Icon name="logout" color={c.danger} size={18} />}
                onPress={async () => { if (await confirm.ask('Çıkış yap', t('Hesabından çıkış yapmak istediğine emin misin?'), 'Çıkış yap', true)) await signOut(); }} />
            <Txt muted size={12} center>{t('Sürüm') + ' ' + APP_VERSION}</Txt>
            {confirm.node}
        </Screen>
    );
}
