import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { Button, Card, Empty, ErrorBox, Header, Select, SignInRequired, Spinner, Tag, Field, toast, Txt } from '../components/ui';
import { ApiError, get, post } from '../lib/api';
import { useApp } from '../lib/app-state';
import { date } from '../lib/format';
import { radius } from '../lib/theme';

type Kind = 'Oneri' | 'Hata' | 'Diger';
type Feedback = { id: string; number: number; kind: Kind; area: string; title: string; body: string; status: number; reply: string | null; createdAt: string };

const KINDS: [Kind, string, string, string][] = [
    ['Oneri', '💡', 'Öneri', 'Yeni özellik veya iyileştirme fikri'],
    ['Hata', '🐞', 'Hata bildirimi', 'Çalışmayan veya yanlış görünen bir şey'],
    ['Diger', '💬', 'Diğer', 'Soru, şikâyet veya teşekkür']
];
export const FEEDBACK_AREAS: [string, string][] = [
    ['Pazar', 'Pazar yeri ve arama'], ['IlanVerme', 'İlan verme ve düzenleme'], ['IlanDetayi', 'İlan detay sayfası'], ['Mesajlar', 'Mesajlar'],
    ['Teklifler', 'Teklifler'], ['Harita', 'Harita'], ['UrunTakvimi', 'Ürün takvimi'], ['Bildirimler', 'Bildirimler ve kayıtlı aramalar'],
    ['Hesap', 'Hesap, profil ve ayarlar'], ['Giris', 'Giriş ve kayıt'], ['MobilUygulama', 'Mobil uygulama'], ['Diger', 'Diğer']
];
const STATUS: [string, 'accent' | 'green' | 'muted'][] = [['Yeni', 'accent'], ['İnceleniyor', 'green'], ['Planlandı', 'green'], ['Çözüldü', 'green'], ['Kapatıldı', 'muted']];

// Öneri kutusu: kullanıcı uygulamanın hangi bölümünde sorun veya fikir olduğunu yazar; Hasadım ekibi yanıtlar.
export default function FeedbackScreen() {
    const { colors: c, t, user, lang } = useApp();
    const [kind, setKind] = useState<Kind>('Oneri');
    const [area, setArea] = useState('MobilUygulama');
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [items, setItems] = useState<Feedback[] | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!user) return;
        try { setItems(await get<Feedback[]>('/api/feedback/mine')); setLoadError(null); }
        catch (e) { setLoadError(e instanceof Error ? e.message : 'Geri bildirimler yüklenemedi.'); }
    }, [user]);
    useFocusEffect(useCallback(() => { void load(); }, [load]));

    if (!user) return <View style={{ flex: 1, backgroundColor: c.bg }}><Header title="Öneri ve geri bildirim" /><SignInRequired text="Geri bildirim göndermek ve yanıtları görmek için giriş yap." /></View>;

    const send = async () => {
        setError(null);
        if (title.trim().length < 5) return setError('Başlık en az 5 karakter olmalı.');
        if (body.trim().length < 15) return setError('Açıklama en az 15 karakter olmalı.');
        setBusy(true);
        try {
            const r = await post<{ number: number; mesaj: string }>('/api/feedback', { kind, area, title: title.trim(), body: body.trim(), pageUrl: null });
            toast(r.mesaj); setTitle(''); setBody(''); void load();
        } catch (e) {
            if (!(e instanceof ApiError && e.code === 'human_cancelled')) setError(e instanceof Error ? e.message : 'Gönderilemedi.');
        } finally { setBusy(false); }
    };

    return (
        <View style={{ flex: 1, backgroundColor: c.bg }}>
            <Header title="Öneri ve geri bildirim" />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 12, gap: 12, paddingBottom: 40 }}>
                    <Txt muted>Bir şey çalışmıyorsa, eksik bir özellik görüyorsan ya da bir fikrin varsa yaz. Her bildirimi Hasadım ekibi okur; yanıt verdiğimizde bildirim alırsın.</Txt>
                    <Card>
                        <Txt weight="800">Ne hakkında?</Txt>
                        <View style={{ gap: 8 }}>
                            {KINDS.map(([k, icon, label, sub]) => (
                                <Pressable key={k} accessibilityRole="radio" accessibilityState={{ checked: kind === k }} onPress={() => setKind(k)}
                                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.m, borderWidth: 2, borderColor: kind === k ? c.accent : c.line, backgroundColor: kind === k ? c.greenSoft : c.panel }}>
                                    <Txt size={22} raw>{icon}</Txt>
                                    <View style={{ flex: 1 }}><Txt weight="800">{label}</Txt><Txt muted size={12.5}>{sub}</Txt></View>
                                </Pressable>
                            ))}
                        </View>
                        <Select label="Uygulamanın hangi bölümü?" value={area} options={FEEDBACK_AREAS} onChange={setArea} raw={false} />
                        <Field label="Başlık" value={title} onChangeText={setTitle} maxLength={150} placeholder="Örn. Filtrede ilçe listesi açılmıyor" />
                        <Field label={kind === 'Hata' ? 'Ne oldu?' : 'Açıklama'} value={body} onChangeText={setBody} maxLength={4000} multiline
                            placeholder={kind === 'Hata' ? 'Ne yaptın, ne bekledin, ne oldu? Mümkünse adım adım yaz.' : 'Fikrini anlat: neyi, neden ve nasıl iyileştirelim?'}
                            style={{ minHeight: 130 }} hint={body.length + ' / 4000'} />
                        <Txt muted size={12.5}>Şifre, kart bilgisi gibi kişisel bilgileri yazma. Bildirimin hesabınla ve cihaz bilginle birlikte kaydedilir.</Txt>
                        {error ? <ErrorBox message={error} /> : null}
                        <Button title="Gönder" onPress={send} busy={busy} disabled={busy} />
                    </Card>

                    <Txt weight="800" size={17}>Gönderdiklerim</Txt>
                    {loadError ? <ErrorBox message={loadError} onRetry={load} /> : null}
                    {items === null ? <View style={{ padding: 30, alignItems: 'center' }}><Spinner size={40} /></View>
                        : !items.length ? <Empty title="Henüz geri bildirim göndermedin" />
                            : items.map(f => {
                                const [statusText, tone] = STATUS[f.status] ?? STATUS[0];
                                const kindInfo = KINDS.find(k => k[0] === f.kind) ?? KINDS[2];
                                return (
                                    <Card key={f.id}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Txt raw>{kindInfo[1]}</Txt>
                                            <Txt weight="800" raw style={{ flex: 1 }} numberOfLines={2}>{'#' + f.number + ' · ' + f.title}</Txt>
                                            <Tag label={statusText} tone={tone} />
                                        </View>
                                        <Txt muted size={12.5}>{t(kindInfo[2]) + ' · ' + t(FEEDBACK_AREAS.find(a => a[0] === f.area)?.[1] ?? f.area) + ' · ' + date(f.createdAt, lang)}</Txt>
                                        <Txt raw selectable>{f.body}</Txt>
                                        {f.reply ? (
                                            <View style={{ backgroundColor: c.greenSoft, borderRadius: radius.m, padding: 10, borderLeftWidth: 3, borderLeftColor: c.green2, gap: 4 }}>
                                                <Txt weight="800" size={13.5}>Hasadım ekibinin yanıtı</Txt>
                                                <Txt raw selectable>{f.reply}</Txt>
                                            </View>
                                        ) : null}
                                    </Card>
                                );
                            })}
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}
