import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useRef, useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { Button, Card, ErrorBox, goBack, Header, SignInRequired, Txt } from '../components/ui';
import { Icon } from '../components/Icon';
import { post } from '../lib/api';
import { API_BASE } from '../lib/config';
import { useApp } from '../lib/app-state';
import { parseQrLogin, qrHost } from '../lib/qr-login';
import { radius } from '../lib/theme';

type Request = { device: string; ip: string | null; createdAt: string; expiresAt: string };
type Stage = { kind: 'scan' } | { kind: 'busy' } | { kind: 'confirm'; code: string; host: string | null; req: Request } | { kind: 'done'; approved: boolean; message: string };

// Bilgisayarda QR ile giriş: kamerayla kodu okut, tarayıcı bilgisini gör, onayla veya reddet.
export default function QrLoginScreen() {
    const { colors: c, user, t, lang } = useApp();
    const [permission, requestPermission] = useCameraPermissions();
    const [stage, setStage] = useState<Stage>({ kind: 'scan' });
    const [error, setError] = useState<string | null>(null);
    const handled = useRef(false);

    const onScan = useCallback(async (result: BarcodeScanningResult) => {
        if (handled.current) return;
        const code = parseQrLogin(result.data);
        if (!code) { setError('Bu bir Hasadım giriş kodu değil. Bilgisayarda Hasadım giriş sayfasının sağındaki QR kodu okut.'); return; }
        handled.current = true;
        setError(null);
        setStage({ kind: 'busy' });
        void Haptics.selectionAsync().catch(() => { });
        try {
            const req = await post<Request>('/api/mobile/qr/scan', { code });
            setStage({ kind: 'confirm', code, host: qrHost(result.data), req });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Kod okunamadı.');
            setStage({ kind: 'scan' });
            setTimeout(() => { handled.current = false; }, 1500);
        }
    }, []);

    const decide = async (approve: boolean) => {
        if (stage.kind !== 'confirm') return;
        // Onaydan önce cihaz kilidi (parmak izi / yüz / ekran şifresi) sorulur; cihazda kilit yoksa atlanır.
        if (approve && Platform.OS !== 'web' && (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync())) {
            const r = await LocalAuthentication.authenticateAsync({ promptMessage: t('Bilgisayarda giriş için kimliğini doğrula'), cancelLabel: t('Vazgeç') });
            if (!r.success) return;
        }
        const code = stage.code;
        setStage({ kind: 'busy' });
        try {
            const r = await post<{ mesaj: string }>('/api/mobile/qr/decide', { code, approve });
            void Haptics.notificationAsync(approve ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning).catch(() => { });
            setStage({ kind: 'done', approved: approve, message: r.mesaj });
        } catch (e) {
            setStage({ kind: 'done', approved: false, message: e instanceof Error ? e.message : 'İşlem tamamlanamadı.' });
        }
    };

    const again = () => { handled.current = false; setError(null); setStage({ kind: 'scan' }); };

    if (!user) return <View style={{ flex: 1, backgroundColor: c.bg }}><Header title="Bilgisayarda giriş (QR)" /><SignInRequired text="Bilgisayarda QR ile giriş yapmak için önce bu uygulamada giriş yap." /></View>;

    const time = (v: string) => new Date(v).toLocaleTimeString(lang === 'en' ? 'en-GB' : 'tr-TR', { hour: '2-digit', minute: '2-digit' });
    const apiHost = qrHost(API_BASE);

    return (
        <View style={{ flex: 1, backgroundColor: c.bg }}>
            <Header title="Bilgisayarda giriş (QR)" />
            <View style={{ flex: 1, padding: 14, gap: 14 }}>
                {stage.kind === 'scan' || stage.kind === 'busy' ? (
                    <>
                        <Txt muted>Bilgisayarında Hasadım giriş sayfasını aç ve sağ taraftaki QR kodu çerçeveye getir.</Txt>
                        {!permission ? null : !permission.granted ? (
                            <Card>
                                <Icon name="camera" size={30} color={c.green2} />
                                <Txt weight="800" size={16}>Kamera izni gerekli</Txt>
                                <Txt muted>QR kodu okutmak için Hasadım’ın kameraya erişmesine izin ver. Fotoğraf veya video kaydedilmez.</Txt>
                                {permission.canAskAgain
                                    ? <Button title="Kameraya izin ver" onPress={() => void requestPermission()} />
                                    : <Button title="Ayarları aç" onPress={() => void Linking.openSettings()} />}
                            </Card>
                        ) : (
                            <View style={{ flex: 1, maxHeight: 460, borderRadius: radius.l, overflow: 'hidden', backgroundColor: '#000' }}>
                                <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                                    onBarcodeScanned={stage.kind === 'scan' ? onScan : undefined} />
                                <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
                                    <View style={{ width: 230, height: 230, borderRadius: 22, borderWidth: 3, borderColor: '#ffffffdd' }} />
                                </View>
                                <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 14, alignItems: 'center' }}>
                                    <View style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: '#000000a6' }}>
                                        <Txt color="#fff" weight="700" size={14}>{stage.kind === 'busy' ? 'Kontrol ediliyor…' : 'Kodu çerçevenin içine getir'}</Txt>
                                    </View>
                                </View>
                            </View>
                        )}
                        {error ? <ErrorBox message={error} /> : null}
                    </>
                ) : stage.kind === 'confirm' ? (
                    <Card>
                        <View style={{ alignItems: 'center', gap: 8, paddingVertical: 6 }}>
                            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.greenSoft, alignItems: 'center', justifyContent: 'center' }}>
                                <Icon name="monitor" size={32} color={c.green2} />
                            </View>
                            <Txt weight="800" size={19} style={{ textAlign: 'center' }}>Bu bilgisayarda giriş yapılsın mı?</Txt>
                        </View>
                        <View style={{ gap: 8, padding: 12, borderRadius: radius.m, backgroundColor: c.bg, borderWidth: 1, borderColor: c.line }}>
                            <Row label="Tarayıcı" value={stage.req.device} />
                            {stage.req.ip ? <Row label="Bağlantı" value={stage.req.ip} /> : null}
                            <Row label="Kod oluşturuldu" value={time(stage.req.createdAt)} />
                            {stage.host ? <Row label="Site" value={stage.host} warn={Boolean(apiHost && stage.host !== apiHost)} /> : null}
                        </View>
                        <View style={{ flexDirection: 'row', gap: 10, padding: 10, borderRadius: radius.m, backgroundColor: '#fff6ec' }}>
                            <Txt raw>🔒</Txt>
                            <Txt size={13} color="#6b4a22" style={{ flex: 1 }}>Bu kodu yalnızca kendi bilgisayarında açtığın sayfadan okuttuysan onayla. Biri sana kod gönderip “okut” dediyse reddet; onaylarsan hesabına o kişi girer.</Txt>
                        </View>
                        <Button title="Giriş yap" onPress={() => void decide(true)} />
                        <Button title="Reddet" kind="secondary" onPress={() => void decide(false)} />
                    </Card>
                ) : (
                    <Card>
                        <View style={{ alignItems: 'center', gap: 10, paddingVertical: 10 }}>
                            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: stage.approved ? c.green2 : c.bg, alignItems: 'center', justifyContent: 'center' }}>
                                <Icon name={stage.approved ? 'check' : 'close'} size={32} color={stage.approved ? '#fff' : c.muted} />
                            </View>
                            <Txt weight="800" size={18} style={{ textAlign: 'center' }}>{stage.message}</Txt>
                            {stage.approved ? <Txt muted style={{ textAlign: 'center' }}>Bilgisayardaki oturumu Hesap → Güvenlik bölümünden istediğin zaman kapatabilirsin.</Txt> : null}
                        </View>
                        <Button title="Tamam" onPress={() => goBack()} />
                        <Button title="Başka bir kod okut" kind="secondary" onPress={again} />
                    </Card>
                )}
            </View>
        </View>
    );
}

function Row({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
    const { colors: c } = useApp();
    return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <Txt muted size={13.5}>{label}</Txt>
            <Txt raw weight="700" size={13.5} color={warn ? c.danger : undefined} style={{ flexShrink: 1, textAlign: 'right' }}>{value + (warn ? ' ⚠' : '')}</Txt>
        </View>
    );
}
