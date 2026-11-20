import { useState } from 'react';
import { Button, Card, ErrorBox, Field, Notice, Page, Txt } from '../components/ui';
import { api } from '../lib/api';

export default function Forgot() {
    const [email, setEmail] = useState('');
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    async function send() {
        setBusy(true); setError(null);
        try { setDone((await api<{ mesaj: string }>('/api/account/forgot-password', { method: 'POST', json: { email: email.trim() }, auth: false })).mesaj); }
        catch (e) { setError(e instanceof Error ? e.message : 'İstek gönderilemedi.'); }
        finally { setBusy(false); }
    }
    return (
        <Page title="Şifremi unuttum">
            <Card>
                <Txt muted>E-posta adresini yaz; hesabın varsa şifre yenileme bağlantısı gönderilir. Bağlantıyı açıp yeni şifreni belirledikten sonra uygulamadan giriş yapabilirsin.</Txt>
                {done ? <Notice message={done} /> : <>
                    <Field label="E-posta" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" maxLength={256} />
                    {error ? <ErrorBox message={error} /> : null}
                    <Button title="Bağlantı gönder" busy={busy} onPress={send} />
                </>}
            </Card>
        </Page>
    );
}
