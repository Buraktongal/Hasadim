import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Image, Platform, StyleSheet, View } from 'react-native';
import { useApp, useColors } from '../lib/app-state';
import { Button, Txt } from './ui';

// Uygulama kilidi (isteğe bağlı): açılışta ve uygulama 1 dakikadan uzun arka planda kaldıysa
// Face ID / parmak izi / cihaz şifresi istenir. Kilit açıkken uygulama değiştiricide ekran
// içeriği gizlenir (gizlilik perdesi).
const RELOCK_AFTER_MS = 60_000;

export function AppLock() {
    const { appLock, user, t } = useApp();
    const c = useColors();
    const enabled = appLock && Boolean(user) && Platform.OS !== 'web';
    const [locked, setLocked] = useState(enabled);
    const [cover, setCover] = useState(false);
    const leftAt = useRef(0);

    const unlock = useCallback(async () => {
        const result = await LocalAuthentication.authenticateAsync({ promptMessage: t('Uygulamayı açmak için kimliğini doğrula'), cancelLabel: t('Vazgeç') });
        if (result.success) setLocked(false);
    }, [t]);

    useEffect(() => { if (!enabled) setLocked(false); }, [enabled]);
    useEffect(() => { if (locked) void unlock(); }, [locked, unlock]);

    useEffect(() => {
        if (!enabled) return;
        const sub = AppState.addEventListener('change', state => {
            if (state === 'active') {
                setCover(false);
                if (leftAt.current && Date.now() - leftAt.current > RELOCK_AFTER_MS) setLocked(true);
                leftAt.current = 0;
            } else {
                setCover(true);
                if (!leftAt.current) leftAt.current = Date.now();
            }
        });
        return () => sub.remove();
    }, [enabled]);

    if (!enabled || (!locked && !cover)) return null;
    return (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 18, zIndex: 1000 }]}>
            <Image source={require('../../assets/logo.png')} style={{ width: 200, height: 67, borderRadius: 10 }} resizeMode="contain" accessibilityIgnoresInvertColors />
            {locked ? <>
                <Txt weight="800" size={18} center>Hasadım kilitli</Txt>
                <View style={{ width: 240 }}><Button title="Kilidi aç" onPress={unlock} /></View>
            </> : null}
        </View>
    );
}

export async function biometricsAvailable() {
    if (Platform.OS === 'web') return false;
    return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
}
