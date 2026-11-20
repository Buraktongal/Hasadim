import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { api } from '../lib/api';
import { type TokenResponse, useApp } from '../lib/app-state';
import { GOOGLE_CLIENT_IDS } from '../lib/config';
import { Button, ErrorBox } from './ui';

WebBrowser.maybeCompleteAuthSession();

// Google ve Apple ile giriş. Kimlik jetonu sunucuya gönderilir; sunucu imzayı, alıcıyı (istemci
// kimliği), süreyi ve tek kullanımlık nonce değerini doğrular. Uygulamada sır (client secret) yoktur.
export function SocialSignIn({ onDone, providers }: { onDone: () => void; providers: { google: boolean; apple: boolean } }) {
    const [error, setError] = useState<string | null>(null);
    const googleId = Platform.select({ ios: GOOGLE_CLIENT_IDS.ios, android: GOOGLE_CLIENT_IDS.android, default: GOOGLE_CLIENT_IDS.web });
    const [apple, setApple] = useState(false);
    useEffect(() => { if (Platform.OS === 'ios' && providers.apple) AppleAuthentication.isAvailableAsync().then(setApple).catch(() => setApple(false)); }, [providers.apple]);
    return (
        <View style={{ gap: 10 }}>
            {providers.google && googleId ? <GoogleButton onDone={onDone} onError={setError} /> : null}
            {apple ? <AppleButton onDone={onDone} onError={setError} /> : null}
            {error ? <ErrorBox message={error} /> : null}
        </View>
    );
}

function useExchange(onDone: () => void, onError: (m: string) => void) {
    const { signedIn } = useApp();
    return async (provider: 'google' | 'apple', idToken: string, nonce?: string, displayName?: string) => {
        try {
            const r = await api<TokenResponse>('/api/mobile/auth/external', { method: 'POST', json: { provider, idToken, nonce, displayName }, auth: false });
            await signedIn(r); onDone();
        } catch (e) { onError(e instanceof Error ? e.message : 'Giriş yapılamadı.'); }
    };
}

function GoogleButton({ onDone, onError }: { onDone: () => void; onError: (m: string) => void }) {
    const exchange = useExchange(onDone, onError);
    const [request, , promptAsync] = Google.useIdTokenAuthRequest({ iosClientId: GOOGLE_CLIENT_IDS.ios, androidClientId: GOOGLE_CLIENT_IDS.android, webClientId: GOOGLE_CLIENT_IDS.web, selectAccount: true });
    return <Button title="Google ile devam et" kind="secondary" disabled={!request} onPress={async () => {
        const result = await promptAsync();
        if (result.type === 'success' && typeof result.params.id_token === 'string') await exchange('google', result.params.id_token, request?.nonce);
        else if (result.type === 'error') onError('Google ile giriş tamamlanamadı.');
    }} />;
}

function AppleButton({ onDone, onError }: { onDone: () => void; onError: (m: string) => void }) {
    const exchange = useExchange(onDone, onError);
    const { dark } = useApp();
    return (
        <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={dark ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={12} style={{ height: 48 }}
            onPress={async () => {
                try {
                    // Ham nonce sunucuya, SHA-256 özeti Apple'a gider; yanıttaki jeton bu isteğe bağlanır.
                    const raw = Crypto.randomUUID() + Crypto.randomUUID();
                    const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
                    const cred = await AppleAuthentication.signInAsync({ nonce: hashed, requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL] });
                    if (!cred.identityToken) { onError('Apple ile giriş tamamlanamadı.'); return; }
                    const name = cred.fullName ? AppleAuthentication.formatFullName(cred.fullName) : undefined;
                    await exchange('apple', cred.identityToken, raw, name || undefined);
                } catch (e) {
                    if ((e as { code?: string }).code !== 'ERR_REQUEST_CANCELED') onError('Apple ile giriş tamamlanamadı.');
                }
            }} />
    );
}
