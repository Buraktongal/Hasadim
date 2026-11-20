import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Icon } from '../components/Icon';
import { Button, Card, ErrorBox, H2, Header, SignInRequired, Spinner, Tag, toast, Txt, useConfirm } from '../components/ui';
import { del, get, post } from '../lib/api';
import { useApp } from '../lib/app-state';
import { timeAgo } from '../lib/format';
import type { SecurityInfo } from '../lib/types';

export default function Security() {
    const { colors: c, t, user, lang, signOut } = useApp();
    const [s, setS] = useState<SecurityInfo | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const confirm = useConfirm();
    const load = useCallback(async () => {
        if (!user) return;
        try { setS(await get<SecurityInfo>('/api/account/security')); setError(null); } catch (e) { setError(e instanceof Error ? e.message : 'Bilgiler yüklenemedi.'); }
    }, [user]);
    useFocusEffect(useCallback(() => { void load(); }, [load]));

    if (!user) return <View style={{ flex: 1, backgroundColor: c.bg }}><Header title="Hesap güvenliği" /><SignInRequired /></View>;
    if (!s) return <View style={{ flex: 1, backgroundColor: c.bg }}><Header title="Hesap güvenliği" />{error ? <View style={{ padding: 12 }}><ErrorBox message={error} onRetry={load} /></View> : <View style={{ padding: 40, alignItems: 'center' }}><Spinner size={46} /></View>}</View>;

    const social = s.logins.map(l => l.name).join(', ');
    const items = [
        { ok: s.emailConfirmed, title: 'E-posta doğrulandı', text: s.emailConfirmed ? s.email : 'E-posta adresin doğrulanmamış.', weight: 25 },
        { ok: s.phoneConfirmed, title: 'Telefon doğrulandı', text: s.phoneConfirmed ? (s.phone ?? '') + ' — SMS ile giriş ve hesap kurtarma için' : 'Telefonunu doğrula; SMS ile giriş ve hesap kurtarma için gerekli.', weight: 25 },
        s.hasPassword ? { ok: true, title: 'Şifre belirlenmiş', text: 'Düzenli aralıklarla değiştirmen önerilir.', weight: 25 }
            : { ok: s.logins.length > 0, title: 'Güvenli giriş', text: t('Şifresiz giriş yapıyorsun') + ' (' + social + ').', weight: 25 },
        { ok: s.twoFactorEnabled, title: 'İki adımlı doğrulama', text: s.twoFactorEnabled ? 'Açık — girişte ek kod isteniyor.' : s.twoFactorAvailable ? 'Kapalı. Açman önerilir.' : 'Yakında kullanılabilir olacak.', weight: 25, soon: !s.twoFactorAvailable && !s.twoFactorEnabled }
    ];
    const scored = items.filter(i => !i.soon);
    const score = Math.round(scored.filter(i => i.ok).reduce((a, i) => a + i.weight, 0) / scored.reduce((a, i) => a + i.weight, 0) * 100);
    const ringColor = score >= 99 ? c.green2 : score >= 60 ? c.gold : c.danger;
    const failed = s.history.filter(h => !h.success && Date.now() - new Date(h.at).getTime() < 7 * 86400_000).length;

    async function act(fn: () => Promise<{ mesaj?: string } | undefined>) {
        try { const r = await fn(); if (r?.mesaj) toast(r.mesaj); void load(); } catch (e) { toast(e instanceof Error ? e.message : 'İşlem tamamlanamadı.'); }
    }

    return (
        <View style={{ flex: 1, backgroundColor: c.bg }}>
            <Header title="Hesap güvenliği" />
            <ScrollView contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={c.green2} colors={[c.green2]} />}>
                <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <View style={{ width: 84, height: 84, alignItems: 'center', justifyContent: 'center' }}>
                        <Svg width={84} height={84} viewBox="0 0 84 84" style={{ position: 'absolute' }}>
                            <Circle cx={42} cy={42} r={36} stroke={c.line} strokeWidth={8} fill="none" />
                            <Circle cx={42} cy={42} r={36} stroke={ringColor} strokeWidth={8} fill="none" strokeLinecap="round"
                                strokeDasharray={`${(2 * Math.PI * 36 * score) / 100} ${2 * Math.PI * 36}`} transform="rotate(-90 42 42)" />
                        </Svg>
                        <Txt size={20} weight="900" raw>{'%' + score}</Txt>
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                        <H2>Güvenlik durumu</H2>
                        <Txt muted size={13.5}>{score >= 99 ? 'Hesabın iyi korunuyor.' : score >= 60 ? 'İyi durumda; aşağıdaki eksikleri tamamlayarak güçlendirebilirsin.' : 'Hesabını korumak için aşağıdaki adımları tamamla.'}</Txt>
                    </View>
                </Card>
                {failed ? <ErrorBox message={t('Son 7 günde') + ' ' + failed + ' ' + t('başarısız giriş denemesi var. Sen değilsen şifreni değiştir.')} /> : null}

                <Card>
                    {items.map(i => (
                        <View key={i.title} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: i.ok ? c.greenSoft : i.soon ? c.bg : c.dangerSoft, alignItems: 'center', justifyContent: 'center' }}>
                                <Icon name={i.ok ? 'check' : 'info'} color={i.ok ? c.green2 : i.soon ? c.muted : c.danger} size={15} width={2.6} />
                            </View>
                            <View style={{ flex: 1 }}><Txt weight="800">{i.title}</Txt><Txt muted size={13}>{i.text}</Txt></View>
                        </View>
                    ))}
                    {s.hasPassword ? <Button title="Şifre değiştir" kind="secondary" small onPress={() => router.push('/ayarlar')} /> : null}
                </Card>

                <Card>
                    <H2>Açık oturumlar</H2>
                    {s.sessions.map(x => (
                        <View key={x.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Icon name={x.device.includes('uygulaması') ? 'phone' : 'globe'} color={c.green2} size={20} />
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}><Txt weight="800" raw>{x.device}</Txt>{x.current ? <Tag label="Bu cihaz" /> : null}</View>
                                <Txt muted size={12.5}>{t(x.method) + ' · ' + timeAgo(x.lastSeenAt, lang)}</Txt>
                            </View>
                            {!x.current ? <Button title="Kapat" kind="secondary" small full={false} onPress={async () => {
                                if (await confirm.ask('Oturum kapatılsın mı?', x.device + ' ' + t('cihazındaki oturum kapatılacak. O cihazda tekrar giriş yapılması gerekecek.'), 'Kapat', true))
                                    await act(() => del('/api/account/sessions/' + x.id));
                            }} /> : null}
                        </View>
                    ))}
                    {s.sessions.length > 1 ? <Button title="Diğer oturumları kapat" kind="danger" small onPress={async () => {
                        if (await confirm.ask('Diğer oturumlar kapatılsın mı?', t('Bu cihaz dışındaki tüm oturumlar kapatılacak.'), 'Kapat', true)) await act(() => post('/api/account/sessions/end-others'));
                    }} /> : null}
                </Card>

                {s.logins.length ? (
                    <Card>
                        <H2>Bağlı hesaplar</H2>
                        {s.logins.map(l => (
                            <View key={l.provider} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <Txt weight="800" raw style={{ flex: 1 }}>{l.name}</Txt>
                                <Button title="Bağlantıyı kaldır" kind="secondary" small full={false} onPress={async () => {
                                    if (await confirm.ask('Bağlantıyı kaldır', l.name + ' ' + t('ile giriş kapatılacak.'), 'Kaldır', true)) await act(() => del('/api/account/logins/' + encodeURIComponent(l.provider)));
                                }} />
                            </View>
                        ))}
                    </Card>
                ) : null}

                <Card>
                    <H2>Son giriş hareketleri</H2>
                    {s.history.map((h, i) => (
                        <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: h.success ? c.green2 : c.danger }} />
                            <View style={{ flex: 1 }}>
                                <Txt size={14} weight="700" raw>{h.device}</Txt>
                                <Txt muted size={12.5}>{(h.success ? t('Başarılı') : t('Başarısız') + (h.reason ? ' · ' + t(h.reason) : '')) + ' · ' + t(h.method) + ' · ' + timeAgo(h.at, lang)}</Txt>
                            </View>
                        </View>
                    ))}
                </Card>

                <Card>
                    <H2>Tüm cihazlardan çık</H2>
                    <Txt muted size={13}>Telefonunu kaybettiysen veya şüpheli bir giriş gördüysen: bu cihaz dışındaki oturumları kapat ve şifreni değiştir.</Txt>
                    <Button title="Bu cihazdan çıkış yap" kind="secondary" onPress={async () => { if (await confirm.ask('Çıkış yap', t('Hesabından çıkış yapmak istediğine emin misin?'), 'Çıkış yap', true)) { await signOut(); router.replace('/'); } }} />
                </Card>
            </ScrollView>
            {confirm.node}
        </View>
    );
}
