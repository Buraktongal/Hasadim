import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { Button, Card, ErrorBox, Field, Notice, Page } from '../components/ui';
import { api } from '../lib/api';
import { useApp } from '../lib/app-state';
import { openLegal } from '../lib/legal';

// Kayıt: bilgiler gönderilir, e-postaya gelen 6 haneli kodla hesap oluşturulur.
export default function Register() {
    const { colors: c, t } = useApp();
    const [f, setF] = useState({ displayName: '', email: '', phone: '', password: '', passwordConfirm: '' });
    const [challenge, setChallenge] = useState<string | null>(null);
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const set = (k: keyof typeof f) => (v: string) => setF(p => ({ ...p, [k]: v }));
    const strong = f.password.length >= 12 && /[a-zçğıöşü]/.test(f.password) && /[A-ZÇĞİÖŞÜ]/.test(f.password) && /\d/.test(f.password);

    async function start() {
        setError(null);
        if (!/^05\d{9}$/.test(f.phone.replace(/\D/g, ''))) { setError('Telefon numaranı 05 ile başlayan 11 rakam olarak gir.'); return; }
        if (!strong) { setError('Şifre en az 12 karakter olmalı; büyük harf, küçük harf ve rakam içermeli.'); return; }
        if (f.password !== f.passwordConfirm) { setError('Şifreler eşleşmiyor.'); return; }
        setBusy(true);
        try {
            const r = await api<{ challengeId: string; mesaj: string }>('/api/account/register', { method: 'POST', json: { ...f, email: f.email.trim(), displayName: f.displayName.trim(), phone: f.phone.replace(/\D/g, '') }, auth: false });
            setChallenge(r.challengeId); setInfo(r.mesaj);
        } catch (e) { setError(e instanceof Error ? e.message : 'Kayıt başlatılamadı.'); }
        finally { setBusy(false); }
    }
    async function confirm() {
        setBusy(true); setError(null);
        try {
            const r = await api<{ mesaj: string }>('/api/account/register/confirm', { method: 'POST', json: { challengeId: challenge, code: code.trim() }, auth: false });
            setInfo(r.mesaj); setChallenge('done');
        } catch (e) { setError(e instanceof Error ? e.message : 'Kod doğrulanamadı.'); }
        finally { setBusy(false); }
    }

    return (
        <Page title="Kayıt ol">
            {challenge === 'done' ? <Card><Notice message={info ?? ''} /><Button title="Giriş yap" onPress={() => router.replace('/giris')} /></Card>
                : challenge ? (
                    <Card>
                        {info ? <Notice message={info} /> : null}
                        <Field label="Doğrulama kodu" value={code} onChangeText={setCode} keyboardType="number-pad" textContentType="oneTimeCode" maxLength={6} />
                        {error ? <ErrorBox message={error} /> : null}
                        <Button title="Hesabı oluştur" busy={busy} onPress={confirm} />
                    </Card>
                ) : (
                    <Card>
                        <Field label="Ad soyad" value={f.displayName} onChangeText={set('displayName')} autoComplete="name" maxLength={100} />
                        <Field label="E-posta" value={f.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" maxLength={256} />
                        <Field label="Cep telefonu" value={f.phone} onChangeText={set('phone')} keyboardType="phone-pad" placeholder="05xx xxx xx xx" maxLength={16} />
                        <Field label="Şifre" value={f.password} onChangeText={set('password')} secureTextEntry autoComplete="new-password" textContentType="newPassword" maxLength={128}
                            hint="En az 12 karakter; büyük harf, küçük harf ve rakam." />
                        <Field label="Şifre (tekrar)" value={f.passwordConfirm} onChangeText={set('passwordConfirm')} secureTextEntry autoComplete="new-password" maxLength={128} />
                        {error ? <ErrorBox message={error} /> : null}
                        <Button title="Kayıt ol" busy={busy} onPress={start} />
                        <Text style={{ color: c.muted, fontSize: 12.5, lineHeight: 17, textAlign: 'center' }}>
                            {t('Kayıt olarak')} <Text style={{ color: c.green2, fontWeight: '700' }} onPress={() => openLegal('kullanim-kosullari')}>{t('Kullanım koşulları')}</Text>{t('nı kabul etmiş olursun. Kişisel verilerinin nasıl işlendiği')} <Text style={{ color: c.green2, fontWeight: '700' }} onPress={() => openLegal('kvkk')}>{t('KVKK aydınlatma metni')}</Text>{t('nde.')}
                        </Text>
                        <Button title="Zaten hesabın var mı? Giriş yap" kind="plain" onPress={() => router.replace('/giris')} />
                    </Card>
                )}
        </Page>
    );
}
