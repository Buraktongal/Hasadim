import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Card, Empty, ErrorBox, Header, SignInRequired, Spinner, toast, Txt } from '../components/ui';
import { del, get } from '../lib/api';
import { useApp } from '../lib/app-state';
import { date } from '../lib/format';
import type { Block } from '../lib/types';

export default function Blocked() {
    const { colors: c, t, user, lang } = useApp();
    const [items, setItems] = useState<Block[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const load = useCallback(async () => {
        if (!user) return;
        try { setItems(await get<Block[]>('/api/blocks')); setError(null); } catch (e) { setError(e instanceof Error ? e.message : 'Liste yüklenemedi.'); }
    }, [user]);
    useFocusEffect(useCallback(() => { void load(); }, [load]));
    if (!user) return <View style={{ flex: 1, backgroundColor: c.bg }}><Header title="Engellenenler" /><SignInRequired /></View>;
    return (
        <View style={{ flex: 1, backgroundColor: c.bg }}>
            <Header title="Engellenenler" />
            <ScrollView contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 40 }}>
                <Txt muted>Engellediğin kişiler sana mesaj ve teklif gönderemez; ilanları pazarda sana gösterilmez.</Txt>
                {error ? <ErrorBox message={error} onRetry={load} /> : null}
                {items === null ? <View style={{ padding: 40, alignItems: 'center' }}><Spinner size={46} /></View>
                    : !items.length ? <Empty title="Engellediğin kimse yok" />
                        : items.map(b => (
                            <Card key={b.userId} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={{ flex: 1 }}>
                                    <Txt weight="800" raw>{b.displayName}</Txt>
                                    <Txt muted size={12.5}>{t('Engellendi') + ': ' + date(b.createdAt, lang)}</Txt>
                                </View>
                                <Button title="Engeli kaldır" kind="secondary" small full={false} onPress={async () => {
                                    try { await del('/api/blocks/' + b.userId); setItems(all => all?.filter(x => x.userId !== b.userId) ?? null); toast('Engel kaldırıldı.'); } catch (e) { toast(e instanceof Error ? e.message : 'İşlem tamamlanamadı.'); }
                                }} />
                            </Card>
                        ))}
            </ScrollView>
        </View>
    );
}
