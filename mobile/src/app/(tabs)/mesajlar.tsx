import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../components/Icon';
import { Empty, ErrorBox, SignInRequired, Spinner } from '../../components/ui';
import { useApp } from '../../lib/app-state';
import { refreshCounts } from '../../lib/counts';
import { initials, timeAgo } from '../../lib/format';
import { type Conversation, conversations, loadMessages } from '../../lib/messages';
import type { Message } from '../../lib/types';
import { radius } from '../../lib/theme';

export default function Messages() {
    const { colors: c, t, user, lang } = useApp();
    const [items, setItems] = useState<Message[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [q, setQ] = useState('');

    const load = useCallback(async () => {
        if (!user) return;
        setError(null);
        try { setItems(await loadMessages()); void refreshCounts(); } catch (e) { setError(e instanceof Error ? e.message : 'Mesajlar yüklenemedi.'); }
    }, [user]);
    useFocusEffect(useCallback(() => { void load(); }, [load]));

    const list = useMemo(() => {
        const all = items && user ? conversations(items, user.id) : [];
        const n = q.trim().toLocaleLowerCase('tr');
        return n ? all.filter(x => (x.otherName + ' ' + x.listingTitle + ' ' + x.last.body).toLocaleLowerCase('tr').includes(n)) : all;
    }, [items, user, q]);

    if (!user) return <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}><SignInRequired text="Giriş yapınca mesajların burada görünür." /></SafeAreaView>;

    const row = ({ item }: { item: Conversation }) => (
        <Pressable onPress={() => router.push({ pathname: '/sohbet', params: { listingId: item.listingId, userId: item.otherId, name: item.otherName, title: item.listingTitle } })}
            style={({ pressed }) => ({ flexDirection: 'row', gap: 12, padding: 12, alignItems: 'center', backgroundColor: pressed ? c.greenSoft : c.panel })}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.greenSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: c.green2, fontWeight: '900', fontSize: 17 }}>{initials(item.otherName)}</Text>
            </View>
            <View style={{ flex: 1, gap: 1 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Text style={{ flex: 1, color: c.ink, fontWeight: item.unread ? '900' : '700', fontSize: 15.5 }} numberOfLines={1}>{item.otherName}</Text>
                    <Text style={{ color: item.unread ? c.accent : c.muted, fontSize: 12, fontWeight: item.unread ? '800' : '400' }}>{timeAgo(item.last.createdAt, lang)}</Text>
                </View>
                <Text style={{ color: c.green2, fontSize: 12.5, fontWeight: '700' }} numberOfLines={1}>{item.listingTitle}</Text>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <Text style={{ flex: 1, color: item.unread ? c.ink : c.muted, fontSize: 13.5 }} numberOfLines={1}>{(item.last.senderId === user.id ? t('Sen') + ': ' : '') + item.last.body}</Text>
                    {item.unread ? <View style={{ minWidth: 20, height: 20, borderRadius: 10, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}><Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>{item.unread}</Text></View> : null}
                </View>
            </View>
        </Pressable>
    );

    return (
        <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
            <View style={{ padding: 12, gap: 10, backgroundColor: c.panel, borderBottomWidth: 1, borderColor: c.line }}>
                <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 22, fontWeight: '800' }}>{t('Mesajlar')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: radius.m, backgroundColor: c.bg, paddingLeft: 10 }}>
                    <Icon name="search" color={c.muted} size={18} />
                    <TextInput value={q} onChangeText={setQ} placeholder={t('Kişi, ilan veya mesaj ara')} placeholderTextColor={c.muted} style={{ flex: 1, height: 40, paddingHorizontal: 8, color: c.ink }} />
                </View>
            </View>
            {error ? <View style={{ padding: 12 }}><ErrorBox message={error} onRetry={load} /></View> : null}
            {items === null && !error ? <View style={{ padding: 40, alignItems: 'center' }}><Spinner size={46} /></View> : (
                <FlatList data={list} keyExtractor={x => x.key} renderItem={row}
                    ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: c.line, marginLeft: 72 }} />}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={c.green2} colors={[c.green2]} />}
                    ListEmptyComponent={<Empty title={q ? 'Sonuç bulunamadı' : 'Henüz mesajın yok'} text={q ? undefined : 'Bir ilana mesaj gönderdiğinde veya sana mesaj geldiğinde burada görünür.'} />} />
            )}
        </SafeAreaView>
    );
}
