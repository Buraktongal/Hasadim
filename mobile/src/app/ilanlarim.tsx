import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { ListingCard } from '../components/ListingCard';
import { Button, Empty, ErrorBox, Header, Segmented, SignInRequired, Spinner, toast } from '../components/ui';
import { useApp } from '../lib/app-state';
import { toggleFavorite, useListingPages } from '../lib/listings';

type Tab = 'mine' | 'history' | 'favorites';

export default function MyListings() {
    const params = useLocalSearchParams<{ tab?: string }>();
    const { colors: c, user } = useApp();
    const [tab, setTab] = useState<Tab>(params.tab === 'favorites' ? 'favorites' : params.tab === 'history' ? 'history' : 'mine');
    const list = useListingPages({ [tab]: 'true' }, Boolean(user));
    useFocusEffect(useCallback(() => { if (user && list.items.length) void list.refresh(); }, [user])); // eslint-disable-line react-hooks/exhaustive-deps

    if (!user) return <View style={{ flex: 1, backgroundColor: c.bg }}><Header title="İlanlarım" /><SignInRequired /></View>;
    return (
        <View style={{ flex: 1, backgroundColor: c.bg }}>
            <Header title={tab === 'favorites' ? 'Favorilerim' : 'İlanlarım'} />
            <View style={{ padding: 12, paddingBottom: 0 }}>
                <Segmented value={tab} onChange={v => setTab(v as Tab)} options={[['mine', 'Güncel ilanlar'], ['history', 'Geçmiş ilanlar'], ['favorites', 'Favorilerim']]} />
            </View>
            {list.error ? <View style={{ padding: 12 }}><ErrorBox message={list.error} onRetry={list.reload} /></View> : null}
            <FlatList data={list.items} keyExtractor={x => x.id} contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 40 }}
                renderItem={({ item }) => <ListingCard item={item} onFavorite={tab === 'favorites' ? x => toggleFavorite(x, true, fav => list.setItems(all => (fav ? all : all.filter(i => i.id !== x.id)))).catch(e => toast(e.message)) : undefined} />}
                onEndReached={list.more} onEndReachedThreshold={0.6}
                refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={c.green2} colors={[c.green2]} />}
                ListEmptyComponent={list.loading ? <View style={{ padding: 40, alignItems: 'center' }}><Spinner size={46} /></View> : list.error ? undefined
                    : tab === 'favorites' ? <Empty title="Favori ilanın yok" text="Beğendiğin ilanlardaki kalbe dokunarak favorilerine ekleyebilirsin." />
                        : <Empty title={tab === 'history' ? 'Geçmiş ilanın yok' : 'Henüz ilanın yok'} text="Ürününü veya araziyi birkaç adımda ilana çıkar."
                            action={tab === 'mine' ? <View style={{ width: 200 }}><Button title="İlan ver" kind="accent" onPress={() => router.push('/ilan-ver')} /></View> : undefined} />} />
        </View>
    );
}
