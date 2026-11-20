import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { Button, Card, Empty, ErrorBox, Field, Header, Segmented, Sheet, SignInRequired, Spinner, Tag, toast, Txt } from '../components/ui';
import { get, post } from '../lib/api';
import { useApp } from '../lib/app-state';
import { refreshCounts } from '../lib/counts';
import { money, number, timeAgo, unitLabel } from '../lib/format';
import type { Offer } from '../lib/types';

const STATUS: Record<number, [string, 'accent' | 'green' | 'danger' | 'muted']> = { 0: ['Yanıt bekliyor', 'accent'], 1: ['Kabul edildi', 'green'], 2: ['Reddedildi', 'danger'], 3: ['Geri çekildi', 'muted'] };

export default function Offers() {
    const { colors: c, t, user, lang } = useApp();
    const [box, setBox] = useState<'gelen' | 'giden'>('gelen');
    const [items, setItems] = useState<Offer[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [reply, setReply] = useState<{ offer: Offer; action: 'accept' | 'reject' } | null>(null);
    const [replyText, setReplyText] = useState('');
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        if (!user) return;
        setError(null);
        try { setItems((await get<{ items: Offer[] }>('/api/offers?kutu=' + box)).items); void refreshCounts(); }
        catch (e) { setError(e instanceof Error ? e.message : 'Teklifler yüklenemedi.'); }
    }, [user, box]);
    useFocusEffect(useCallback(() => { setItems(null); void load(); }, [load]));

    async function act(path: string, body?: object, done?: string) {
        setBusy(true);
        try { const r = await post<{ mesaj?: string }>(path, body); toast(r?.mesaj ?? done ?? 'Tamam'); setReply(null); setReplyText(''); void load(); }
        catch (e) { toast(e instanceof Error ? e.message : 'İşlem tamamlanamadı.'); }
        finally { setBusy(false); }
    }

    if (!user) return <View style={{ flex: 1, backgroundColor: c.bg }}><Header title="Tekliflerim" /><SignInRequired /></View>;
    const unit = (o: Offer) => (o.kategori === 'Arazi' ? '' : ' / ' + unitLabel(o.birim));
    return (
        <View style={{ flex: 1, backgroundColor: c.bg }}>
            <Header title="Tekliflerim" />
            <View style={{ padding: 12, paddingBottom: 0 }}><Segmented value={box} onChange={v => setBox(v as 'gelen' | 'giden')} options={[['gelen', 'Gelen teklifler'], ['giden', 'Gönderdiğim teklifler']]} /></View>
            {error ? <View style={{ padding: 12 }}><ErrorBox message={error} onRetry={load} /></View> : null}
            {items === null ? <View style={{ padding: 40, alignItems: 'center' }}><Spinner size={46} /></View> : (
                <FlatList data={items} keyExtractor={o => o.id} contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 40 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={c.green2} colors={[c.green2]} />}
                    ListEmptyComponent={<Empty title={box === 'gelen' ? 'Gelen teklif yok' : 'Gönderdiğin teklif yok'} text={box === 'gelen' ? 'İlanlarına teklif geldiğinde burada görünür.' : 'Bir ilanda “Teklif ver” düğmesine dokunarak satıcıya fiyat önerebilirsin.'} />}
                    renderItem={({ item: o }) => {
                        const [label, tone] = STATUS[o.status] ?? STATUS[0]!;
                        return (
                            <Card>
                                <Pressable onPress={() => router.push({ pathname: '/ilan/[id]', params: { id: o.listingId } })}>
                                    <Txt weight="800" raw numberOfLines={2}>{o.listingTitle}</Txt>
                                    <Txt muted size={12.5}>{t('İlan No') + ': ' + o.listingNumber + ' · ' + timeAgo(o.createdAt, lang)}</Txt>
                                </Pressable>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <Txt size={20} weight="900" color={c.accent} raw>{money(o.amount, o.kategori === 'Arazi' ? 0 : 2) + unit(o)}</Txt>
                                    <Tag tone={tone} label={label} />
                                </View>
                                <Txt muted size={13}>{t('İlan fiyatı') + ': ' + money(o.listingPrice, o.kategori === 'Arazi' ? 0 : 2) + unit(o) + (o.quantity ? ' · ' + t('Miktar') + ': ' + number(o.quantity) + ' ' + unitLabel(o.birim) : '')}</Txt>
                                <Txt size={13.5}>{(box === 'gelen' ? t('Alıcı') + ': ' + o.buyerName : t('Satıcı') + ': ' + o.sellerName)}</Txt>
                                {o.note ? <Txt raw muted>“{o.note}”</Txt> : null}
                                {o.reply ? <Txt raw size={13.5}>{t('Yanıt') + ': ' + o.reply}</Txt> : null}
                                {o.status === 0 && box === 'gelen' ? (
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        <View style={{ flex: 1 }}><Button title="Reddet" kind="danger" small onPress={() => setReply({ offer: o, action: 'reject' })} /></View>
                                        <View style={{ flex: 1 }}><Button title="Kabul et" small onPress={() => setReply({ offer: o, action: 'accept' })} /></View>
                                    </View>
                                ) : null}
                                {o.status === 0 && box === 'giden' ? <Button title="Teklifi geri çek" kind="secondary" small busy={busy} onPress={() => act('/api/offers/' + o.id + '/withdraw')} /> : null}
                                {o.status === 1 ? <Button title="Mesajlaş" kind="secondary" small onPress={() => router.push({ pathname: '/sohbet', params: { listingId: o.listingId, userId: box === 'gelen' ? o.buyerId : o.sellerId, name: box === 'gelen' ? o.buyerName : o.sellerName, title: o.listingTitle } })} /> : null}
                            </Card>
                        );
                    }} />
            )}
            <Sheet visible={Boolean(reply)} onClose={() => setReply(null)} title={reply?.action === 'accept' ? 'Teklifi kabul et' : 'Teklifi reddet'}>
                <Field label="Alıcıya not" hint="İsteğe bağlı" value={replyText} onChangeText={setReplyText} maxLength={500} multiline style={{ minHeight: 80 }} />
                <Button title={reply?.action === 'accept' ? 'Kabul et' : 'Reddet'} kind={reply?.action === 'accept' ? 'primary' : 'danger'} busy={busy}
                    onPress={() => reply && act('/api/offers/' + reply.offer.id + '/' + reply.action, { reply: replyText.trim() || null })} />
            </Sheet>
        </View>
    );
}
