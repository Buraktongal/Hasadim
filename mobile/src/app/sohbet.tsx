import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { Chevron, ErrorBox, goBack, Header, IconButton, Loading, SignInRequired, Txt } from '../components/ui';
import { UserAvatar, useProfile } from '../components/UserAvatar';
import { post } from '../lib/api';
import { useApp } from '../lib/app-state';
import { refreshCounts } from '../lib/counts';
import { clock, date } from '../lib/format';
import { loadMessages } from '../lib/messages';
import type { Message } from '../lib/types';

const GUID = /^[0-9a-f-]{36}$/i;

export default function Chat() {
    const p = useLocalSearchParams<{ listingId: string; userId: string; name?: string; title?: string }>();
    const { colors: c, t, user, lang } = useApp();
    const insets = useSafeAreaInsets();
    const [items, setItems] = useState<Message[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(false);
    const listRef = useRef<FlatList<Message>>(null);
    const other = useProfile(GUID.test(p.userId ?? '') ? p.userId : null);
    const valid = GUID.test(p.listingId ?? '') && GUID.test(p.userId ?? '');

    const load = useCallback(async () => {
        if (!user || !valid) return;
        try {
            const all = await loadMessages();
            // Bu kişiyle olan TÜM yazışma (farklı ilanlar dahil) gösterilir; yeni mesaj açılan ilan üzerinden gider.
            const thread = all.filter(m => (m.senderId === p.userId && m.recipientId === user.id) || (m.recipientId === p.userId && m.senderId === user.id))
                .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
            setItems(thread);
            const unread = thread.filter(m => m.recipientId === user.id && !m.readAt).map(m => m.id);
            if (unread.length) { await post('/api/messages/read', { ids: unread.slice(0, 100) }).catch(() => undefined); void refreshCounts(); }
        } catch (e) { setError(e instanceof Error ? e.message : 'Mesajlar yüklenemedi.'); }
    }, [user, valid, p.userId]);

    useEffect(() => {
        void load();
        const timer = setInterval(() => void load(), 15000);
        return () => clearInterval(timer);
    }, [load]);

    const rows = useMemo(() => {
        const out: ({ type: 'day'; key: string; label: string } | { type: 'listing'; key: string; label: string; id: string } | { type: 'msg'; key: string; m: Message })[] = [];
        let last = '', lastListing = '';
        for (const m of items ?? []) {
            const day = m.createdAt.slice(0, 10);
            if (day !== last) { out.push({ type: 'day', key: 'd' + day + m.id, label: date(m.createdAt, lang) }); last = day; }
            // Konuşma başka bir ilana geçince hangi ilan hakkında olduğu araya yazılır.
            if (m.listingId !== lastListing) { out.push({ type: 'listing', key: 'l' + m.id, label: m.listingTitle, id: m.listingId }); lastListing = m.listingId; }
            out.push({ type: 'msg', key: m.id, m });
        }
        return out.reverse();
    }, [items, lang]);

    if (!user) return <View style={{ flex: 1, backgroundColor: c.bg }}><Header title="Mesajlar" /><SignInRequired /></View>;
    if (!valid) return <View style={{ flex: 1, backgroundColor: c.bg }}><Header title="Mesajlar" /><ErrorBox message="Aranan kayıt bulunamadı." /></View>;

    async function send() {
        const body = text.trim();
        if (!body || busy) return;
        setBusy(true); setError(null);
        try {
            await post('/api/messages', { listingId: p.listingId, recipientId: p.userId, body: body.slice(0, 2000) });
            setText('');
            const now = new Date().toISOString();
            setItems(prev => [...(prev ?? []), { id: 'local-' + now, listingId: p.listingId!, listingTitle: p.title ?? '', senderId: user!.id, recipientId: p.userId!, senderName: user!.displayName, recipientName: p.name ?? '', body, createdAt: now, readAt: null }]);
            void load();
        } catch (e) { setError(e instanceof Error ? e.message : 'Mesaj gönderilemedi.'); }
        finally { setBusy(false); }
    }

    return (
        <View style={{ flex: 1, backgroundColor: c.bg }}>
            {/* Karşı tarafın fotoğrafı ve adı: dokununca profili açılır. */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingBottom: 8, paddingTop: 6 + insets.top, borderBottomWidth: 1, borderColor: c.line, backgroundColor: c.panel }}>
                <IconButton label="Geri" onPress={goBack}><Chevron dir="left" color={c.ink} /></IconButton>
                <Pressable onPress={() => router.push({ pathname: '/satici/[id]', params: { id: p.userId! } })} accessibilityRole="button" accessibilityLabel={(other?.businessName || other?.displayName || p.name || '') + ' — ' + t('profili aç')}
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <UserAvatar userId={p.userId} name={p.name ?? '?'} size={40} />
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: c.ink, fontSize: 16.5, fontWeight: '800' }} numberOfLines={1}>{other?.businessName || other?.displayName || p.name || t('Mesajlar')}</Text>
                        <Text style={{ color: c.muted, fontSize: 12 }} numberOfLines={1}>{[other?.city, t('Profili gör')].filter(Boolean).join(' · ')}</Text>
                    </View>
                </Pressable>
                <IconButton label="İlanı aç" onPress={() => router.push({ pathname: '/ilan/[id]', params: { id: p.listingId! } })}><Icon name="tag" color={c.green2} /></IconButton>
            </View>
            {p.title ? <Pressable onPress={() => router.push({ pathname: '/ilan/[id]', params: { id: p.listingId! } })} style={{ paddingHorizontal: 14, paddingVertical: 8, backgroundColor: c.greenSoft }}>
                <Text style={{ color: c.green2, fontWeight: '700' }} numberOfLines={1}>{t('Yazdığın ilan') + ': ' + p.title}</Text>
            </Pressable> : null}
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                {items === null ? <Loading /> : (
                    <FlatList ref={listRef as never} inverted data={rows} keyExtractor={r => r.key} contentContainerStyle={{ padding: 12, gap: 6 }}
                        ListFooterComponent={!rows.length ? <Txt muted center>İlk mesajı sen gönder.</Txt> : undefined}
                        renderItem={({ item: r }) => r.type === 'listing'
                            ? <Pressable onPress={() => router.push({ pathname: '/ilan/[id]', params: { id: r.id } })} style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '90%', marginVertical: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: c.greenSoft }}>
                                <Icon name="tag" color={c.green2} size={13} /><Text style={{ color: c.green2, fontSize: 12, fontWeight: '700' }} numberOfLines={1}>{r.label}</Text>
                            </Pressable>
                            : r.type === 'day'
                            ? <Text style={{ alignSelf: 'center', color: c.muted, fontSize: 12, fontWeight: '700', marginVertical: 6, backgroundColor: c.panel, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' }}>{r.label}</Text>
                            : (() => {
                                const mine = r.m.senderId === user.id;
                                return (
                                    <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '82%', backgroundColor: mine ? c.green : c.panel, borderRadius: 16, borderBottomRightRadius: mine ? 4 : 16, borderBottomLeftRadius: mine ? 16 : 4, paddingHorizontal: 12, paddingVertical: 8, borderWidth: mine ? 0 : 1, borderColor: c.line }}>
                                        <Text selectable style={{ color: mine ? c.onGreen : c.ink, fontSize: 15.5, lineHeight: 21 }}>{r.m.body}</Text>
                                        <Text style={{ color: mine ? c.onGreen : c.muted, opacity: 0.75, fontSize: 11, alignSelf: 'flex-end', marginTop: 2 }}>{clock(r.m.createdAt)}{mine ? (r.m.readAt ? '  ✓✓' : '  ✓') : ''}</Text>
                                    </View>
                                );
                            })()} />
                )}
                {error ? <View style={{ paddingHorizontal: 12 }}><ErrorBox message={error} /></View> : null}
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10, paddingBottom: 10 + insets.bottom, backgroundColor: c.panel, borderTopWidth: 1, borderColor: c.line }}>
                    <TextInput value={text} onChangeText={setText} placeholder={t('Mesaj yaz…')} placeholderTextColor={c.muted} multiline maxLength={2000}
                        accessibilityLabel={t('Mesajın')}
                        style={{ flex: 1, minHeight: 44, maxHeight: 130, borderRadius: 22, backgroundColor: c.bg, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, color: c.ink, fontSize: 15.5 }} />
                    <Pressable accessibilityRole="button" accessibilityLabel={t('Gönder')} onPress={send} disabled={!text.trim() || busy}
                        style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: text.trim() ? c.green : c.line, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="send" color={text.trim() ? c.onGreen : c.muted} size={20} />
                    </Pressable>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}
