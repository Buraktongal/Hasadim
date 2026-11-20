import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Card, Empty, ErrorBox, Header, SignInRequired, Spinner, SwitchRow, Tag, toast, Txt, useConfirm } from '../components/ui';
import { del, get, post } from '../lib/api';
import { useApp } from '../lib/app-state';
import { category } from '../lib/catalog';
import { parseQs, setFilters } from '../lib/filters';
import { date } from '../lib/format';
import type { SavedSearch } from '../lib/types';

export default function SavedSearches() {
    const { colors: c, t, user, lang } = useApp();
    const [items, setItems] = useState<SavedSearch[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const confirm = useConfirm();
    const load = useCallback(async () => {
        if (!user) return;
        try { setItems(await get<SavedSearch[]>('/api/saved-searches')); setError(null); } catch (e) { setError(e instanceof Error ? e.message : 'Kayıtlı aramalar yüklenemedi.'); }
    }, [user]);
    useFocusEffect(useCallback(() => { void load(); }, [load]));

    if (!user) return <View style={{ flex: 1, backgroundColor: c.bg }}><Header title="Kayıtlı aramalar" /><SignInRequired /></View>;
    return (
        <View style={{ flex: 1, backgroundColor: c.bg }}>
            <Header title="Kayıtlı aramalar" />
            <ScrollView contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 40 }}>
                <Txt muted>Pazarda filtre seçip “Kaydet”e dokunduğunda arama buraya eklenir; uygun yeni ilan yayınlanınca bildirim alırsın.</Txt>
                {error ? <ErrorBox message={error} onRetry={load} /> : null}
                {items === null ? <View style={{ padding: 40, alignItems: 'center' }}><Spinner size={46} /></View>
                    : !items.length ? <Empty title="Kayıtlı araman yok" action={<View style={{ width: 200 }}><Button title="Pazara git" kind="secondary" onPress={() => router.navigate('/')} /></View>} />
                        : items.map(s => {
                            const f = parseQs(s.query);
                            const chips = [f.kategori && category(f.kategori).name, f.meyveTuru, f.cesit, f.il, f.ilce, f.q && '“' + f.q + '”', f.minFiyat && '≥ ' + f.minFiyat + ' TL', f.maxFiyat && '≤ ' + f.maxFiyat + ' TL'].filter(Boolean) as string[];
                            return (
                                <Card key={s.id}>
                                    <Txt weight="800" size={16.5} raw>{s.name}</Txt>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{chips.length ? chips.map(x => <Tag key={x} label={x} />) : <Tag tone="muted" label="Tüm ilanlar" />}</View>
                                    <Txt muted size={12.5}>{t('Kaydedildi') + ': ' + date(s.createdAt, lang)}</Txt>
                                    <SwitchRow label="Yeni ilan bildirimi" value={s.notify} onChange={async v => {
                                        setItems(all => all?.map(x => (x.id === s.id ? { ...x, notify: v } : x)) ?? null);
                                        try { await post('/api/saved-searches/' + s.id + '/notify?on=' + v); } catch (e) { toast(e instanceof Error ? e.message : 'Kaydedilemedi.'); void load(); }
                                    }} />
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        <View style={{ flex: 1 }}><Button title="İlanları gör" small onPress={() => { setFilters(f); router.navigate('/'); }} /></View>
                                        <View style={{ flex: 1 }}><Button title="Sil" kind="danger" small onPress={async () => {
                                            if (!await confirm.ask('Aramayı sil', t('Bu kayıtlı arama silinsin mi?'), 'Sil', true)) return;
                                            try { await del('/api/saved-searches/' + s.id); setItems(all => all?.filter(x => x.id !== s.id) ?? null); } catch (e) { toast(e instanceof Error ? e.message : 'Silinemedi.'); }
                                        }} /></View>
                                    </View>
                                </Card>
                            );
                        })}
            </ScrollView>
            {confirm.node}
        </View>
    );
}
