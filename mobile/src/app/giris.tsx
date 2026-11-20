import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { SocialSignIn } from '../components/SocialSignIn';
import { Button, Card, ErrorBox, Field, H1, Header, Notice, Screen, Segmented, Txt } from '../components/ui';
import { api, get } from '../lib/api';
import { type TokenResponse, useApp } from '../lib/app-state';

type Providers = { google: { enabled: boolean }; apple: { enabled: boolean }; phone: { enabled: boolean } };
const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

export default function SignIn() {
    const { colors: c, signedIn, user } = useApp();
    const [mode, setMode] = useState<'email' | 'phone'>('email');
    const [providers, setProviders] = useState<Providers | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [challenge, setChallenge] = useState<string | null>(null);
    const [ticket, setTicket] = useState<string | null>(null);
    const [code, setCode] = useState('');
    const [recovery, setRecovery] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);

    useEffect(() => { get<Providers>('/api/account/providers').then(setProviders).catch(() => undefined); }, []);
    useEffect(() => { if (user) close(); }, [user]);

    async function run(fn: () => Promise<void>) {
        setBusy(true); setError(null);
        try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : 'Giriş yapılamadı.'); } finally { setBusy(false); }
    }
    const done = async (r: TokenResponse) => { await signedIn(r); close(); };

    const login = () => run(async () => {
        if (!email.trim() || !password) { setError('E-posta ve şifreni gir.'); return; }
        const r = await api<TokenResponse & { requiresTwoFactor?: boolean; ticket?: string }>('/api/mobile/auth/login', { method: 'POST', json: { email: email.trim(), password }, auth: false });
        setPassword('');
        if (r.requiresTwoFactor && r.ticket) { setTicket(r.ticket); return; }
        await done(r);
    });
    const twoFactor = () => run(async () => {
        await done(await api<TokenResponse>('/api/mobile/auth/two-factor', { method: 'POST', json: { ticket, code: code.trim(), recovery }, auth: false }));
    });
    const phoneStart = () => run(async () => {
        const digits = phone.replace(/\D/g, '');
        if (digits.length < 10) { setError('5 ile başlayan 10 haneli cep telefonu numaranı gir.'); return; }
        const r = await api<{ challengeId: string; mesaj: string }>('/api/account/phone/start', { method: 'POST', json: { phone: digits }, auth: false });
        setChallenge(r.challengeId); setInfo(r.mesaj);
    });
    const phoneConfirm = () => run(async () => {
        await done(await api<TokenResponse>('/api/mobile/auth/phone', { method: 'POST', json: { challengeId: challenge, code: code.trim() }, auth: false }));
    });

    return (
        <View style={{ flex: 1, backgroundColor: c.bg }}>
            <Header title="Giriş yap" />
            <Screen edges={['bottom']}>
                <View style={{ alignItems: 'center', gap: 8, marginVertical: 8 }}>
                    <Image source={require('../../assets/logo.png')} style={{ width: 180, height: 60, borderRadius: 8 }} resizeMode="contain" accessibilityLabel="Hasadım" />
                    <H1 center>Hesabına giriş yap</H1>
                </View>
                {ticket ? (
                    <Card>
                        <Txt weight="800">İki adımlı doğrulama</Txt>
                        <Txt muted>{recovery ? 'Kurtarma kodlarından birini gir.' : 'Doğrulama uygulamandaki 6 haneli kodu gir.'}</Txt>
                        <Field label={recovery ? 'Kurtarma kodu' : 'Doğrulama kodu'} value={code} onChangeText={setCode} autoComplete="one-time-code" textContentType="oneTimeCode" keyboardType={recovery ? 'default' : 'number-pad'} autoCapitalize="none" maxLength={recovery ? 20 : 6} />
                        {error ? <ErrorBox message={error} /> : null}
                        <Button title="Doğrula" busy={busy} onPress={twoFactor} />
                        <Button title={recovery ? 'Doğrulama kodu kullan' : 'Kurtarma kodu kullan'} kind="plain" onPress={() => { setRecovery(!recovery); setCode(''); }} />
                    </Card>
                ) : <>
                    {providers?.phone.enabled ? <Segmented value={mode} onChange={v => { setMode(v as 'email' | 'phone'); setError(null); setCode(''); setChallenge(null); }} options={[['email', 'E-posta'], ['phone', 'Telefon']]} /> : null}
                    <Card>
                        {mode === 'email' ? <>
                            <Field label="E-posta" value={email} onChangeText={setEmail} autoComplete="email" textContentType="username" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} maxLength={256} />
                            <Field label="Şifre" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" maxLength={128} onSubmitEditing={login} />
                            {error ? <ErrorBox message={error} /> : null}
                            <Button title="Giriş yap" busy={busy} onPress={login} />
                            <Button title="Şifremi unuttum" kind="plain" onPress={() => router.push('/sifremi-unuttum')} />
                        </> : !challenge ? <>
                            <Field label="Cep telefonu" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" placeholder="05xx xxx xx xx" maxLength={16} />
                            {error ? <ErrorBox message={error} /> : null}
                            <Button title="Kod gönder" busy={busy} onPress={phoneStart} />
                        </> : <>
                            {info ? <Notice message={info} /> : null}
                            <Field label="Doğrulama kodu" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="sms-otp" textContentType="oneTimeCode" maxLength={6} />
                            {error ? <ErrorBox message={error} /> : null}
                            <Button title="Doğrula" busy={busy} onPress={phoneConfirm} />
                            <Button title="Numarayı değiştir" kind="plain" onPress={() => { setChallenge(null); setCode(''); }} />
                        </>}
                    </Card>
                    {providers ? <SocialSignIn onDone={close} providers={{ google: providers.google.enabled, apple: providers.apple.enabled }} /> : null}
                    <Card>
                        <Txt muted center>Hesabın yok mu?</Txt>
                        <Button title="Kayıt ol" kind="secondary" onPress={() => router.replace('/kayit')} />
                    </Card>
                </>}
            </Screen>
        </View>
    );
}
