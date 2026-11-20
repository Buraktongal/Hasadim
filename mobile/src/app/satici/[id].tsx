import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';
import { ListingCard } from '../../components/ListingCard';
import { Card, Empty, ErrorBox, Header, Spinner, Tag, Txt } from '../../components/ui';
import { get } from '../../lib/api';
import { useApp } from '../../lib/app-state';
import { ACTIVITY } from '../../lib/catalog';
import { date, initials, number } from '../../lib/format';
import { useListingPages } from '../../lib/listings';
import type { PublicProfile } from '../../lib/types';

export default function Seller() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors: c, t, lang } = useApp();
    const valid = /^[0-9a-f-]{36}$/i.test(id ?? '');
    const [p, setP] = useState<PublicProfile | null>(null);
    const [error, setError] = useState<string | null>(null);
    const list = useListingPages({ ownerId: id }, valid);
    useEffect(() => { if (valid) get<PublicProfile>('/api/profiles/' + id).then(setP).catch(e => setError(e.message)); }, [id, valid]);
    return (
        <View style={{ flex: 1, backgroundColor: c.bg }}>
            <Header title={p?.displayName ?? t('Satıcı')} raw />
            <FlatList data={list.items} keyExtractor={x => x.id} onEndReached={list.more} contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 40 }}
                ListHeaderComponent={<View style={{ gap: 10, marginBottom: 4 }}>
                    {error ? <ErrorBox message={error} /> : null}
                    {p ? <Card>
                        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.greenSoft, alignItems: 'center', justifyContent: 'center' }}><Txt size={20} weight="900" color={c.green2} raw>{initials(p.displayName)}</Txt></View>
                            <View style={{ flex: 1 }}>
                                <Txt size={18} weight="800" raw>{p.displayName}</Txt>
                                <Txt muted size={13} raw>{[p.businessName, p.city, p.district].filter(Boolean).join(' · ')}</Txt>
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                            <Tag tone="muted" label={ACTIVITY[p.activity] ?? 'Diğer'} />
                            <Tag tone={p.emailVerified ? 'green' : 'muted'} label={p.emailVerified ? 'E-posta doğrulandı' : 'E-posta doğrulanmadı'} />
                            <Tag tone="muted" raw label={number(p.activeListingCount) + ' ' + t('yayında ilan')} />
                            {p.memberSince ? <Tag tone="muted" raw label={t('Üyelik tarihi') + ': ' + date(p.memberSince, lang)} /> : null}
                        </View>
                        {p.about ? <Txt raw>{p.about}</Txt> : null}
                        <Txt muted size={12}>E-posta doğrulaması, ürün kalitesi veya ticari kimlik onayı değildir.</Txt>
                    </Card> : null}
                </View>}
                renderItem={({ item }) => <ListingCard item={item} />}
                ListEmptyComponent={list.loading ? <View style={{ padding: 30, alignItems: 'center' }}><Spinner /></View> : <Empty title="Yayında ilan yok" />} />
        </View>
    );
}
