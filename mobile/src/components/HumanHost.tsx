import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useColors, useT } from '../lib/app-state';
import { normalizeAnswer, setHumanAsker } from '../lib/human';
import { Button, Field, Sheet, Txt } from './ui';

type Ask = { svg: string; message: string | null; refresh: () => Promise<string>; resolve: (v: string | null) => void };

// Sunucu görsel kod istediğinde açılan "Robot olmadığını doğrula" penceresi.
// Görsel yalnızca çizgilerden oluşan SVG'dir; metin, bağlantı veya betik içermez.
export function HumanHost() {
    const c = useColors(); const t = useT();
    const [ask, setAsk] = useState<Ask | null>(null);
    const [svg, setSvg] = useState('');
    const [value, setValue] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const current = useRef<Ask | null>(null);

    useEffect(() => {
        setHumanAsker((image, message, refresh) => new Promise(resolve => {
            current.current?.resolve(null);
            const next = { svg: image, message, refresh, resolve };
            current.current = next;
            setSvg(image); setValue(''); setError(message); setAsk(next);
        }));
        return () => setHumanAsker(null);
    }, []);

    const finish = (v: string | null) => { current.current?.resolve(v); current.current = null; setAsk(null); };
    const submit = () => {
        const code = normalizeAnswer(value);
        if (code.length < 4) { setError('Kodu eksiksiz yaz.'); return; }
        finish(code);
    };
    const refresh = async () => {
        if (!ask) return;
        setBusy(true);
        try { setSvg(await ask.refresh()); setValue(''); setError(null); }
        catch { setError('Yeni kod alınamadı.'); }
        finally { setBusy(false); }
    };

    return (
        <Sheet visible={Boolean(ask)} onClose={() => finish(null)} title="Robot olmadığını doğrula">
            <Txt muted>Gördüğün 5 karakteri yaz. Büyük/küçük harf fark etmez.</Txt>
            <View style={{ borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: c.line, backgroundColor: '#f6f3e8', aspectRatio: 220 / 80 }}>
                {svg ? <SvgXml xml={svg} width="100%" height="100%" accessibilityLabel={t('Doğrulama kodu görseli')} /> : null}
            </View>
            <Pressable accessibilityRole="button" onPress={refresh} disabled={busy} style={{ alignSelf: 'flex-end', paddingVertical: 4 }}>
                <Txt color={c.green2} weight="700" size={14}>{busy ? 'Yükleniyor…' : '↻ Yeni kod'}</Txt>
            </Pressable>
            <Field label="Gördüğün kod" value={value} onChangeText={setValue} autoCapitalize="characters" autoCorrect={false} autoComplete="off"
                maxLength={8} onSubmitEditing={submit} returnKeyType="done" error={error}
                style={{ fontSize: 22, letterSpacing: 6, textAlign: 'center', fontWeight: '800' }} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}><Button title="Vazgeç" kind="secondary" onPress={() => finish(null)} /></View>
                <View style={{ flex: 1.4 }}><Button title="Doğrula" onPress={submit} /></View>
            </View>
        </Sheet>
    );
}
