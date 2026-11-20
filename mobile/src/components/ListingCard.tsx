import { router } from 'expo-router';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../lib/app-state';
import { category } from '../lib/catalog';
import { discount, isLand, isRent, money, priceText, qtyText, shortDate, unitLabel } from '../lib/format';
import type { Listing } from '../lib/types';
import { Icon } from './Icon';
import { Photo } from './Photo';
import { Tag } from './ui';

export const ListingCard = memo(function ListingCard({ item, onFavorite }: { item: Listing; onFavorite?: (x: Listing) => void }) {
    const { colors: c, t } = useApp();
    const off = discount(item);
    const land = isLand(item);
    return (
        <Pressable onPress={() => router.push({ pathname: '/ilan/[id]', params: { id: item.id } })} accessibilityRole="button"
            accessibilityLabel={item.baslik + ', ' + priceText(item)}
            style={({ pressed }) => [styles.card, { backgroundColor: c.panel, borderColor: c.line, opacity: pressed ? 0.92 : 1 }]}>
            <View>
                <Photo url={item.photoUrl} product={item.meyveTuru} style={{ width: 112, height: 112 }} />
                {onFavorite ? (
                    <Pressable accessibilityRole="button" accessibilityLabel={t(item.favorite ? 'Favorilerden çıkar' : 'Favorilere ekle')} hitSlop={8} onPress={() => onFavorite(item)}
                        style={[styles.heart, { backgroundColor: c.panel }]}>
                        <Icon name="heart" size={17} color={item.favorite ? c.accent : c.muted} />
                    </Pressable>
                ) : null}
            </View>
            <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ color: c.muted, fontSize: 12, fontWeight: '700' }} numberOfLines={1}>
                    {land ? t(category('Arazi').short) + ' · ' + t(isRent(item) ? 'Kiralık' : 'Satılık') : item.meyveTuru + (item.cesit ? ' / ' + item.cesit : '')}
                </Text>
                <Text style={{ color: c.ink, fontSize: 15.5, fontWeight: '800', lineHeight: 20 }} numberOfLines={2}>{item.baslik}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={{ color: c.accent, fontWeight: '900', fontSize: 16 }}>{t(priceText(item))}</Text>
                    {off ? <Tag tone="green" raw label={'↓ %' + String(off).replace('.', ',')} /> : null}
                </View>
                {off && item.oncekiKilogramFiyati ? <Text style={{ color: c.muted, fontSize: 12, textDecorationLine: 'line-through' }}>{money(item.oncekiKilogramFiyati, land ? 0 : 2) + (land ? '' : ' / ' + unitLabel(item.birim))}</Text> : null}
                <Text style={{ color: c.muted, fontSize: 12.5 }} numberOfLines={1}>{qtyText(item)}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Icon name="pin" size={13} color={c.muted} />
                    <Text style={{ color: c.muted, fontSize: 12.5, flex: 1 }} numberOfLines={1}>{item.il} / {item.ilce}</Text>
                    <Text style={{ color: c.muted, fontSize: 12 }}>{shortDate(item.publishedAt ?? item.olusturulmaTarihi)}</Text>
                </View>
                {item.isMine && item.statusText && item.status !== 4 ? <Tag tone="accent" label={item.statusText} /> : null}
            </View>
        </Pressable>
    );
});

const styles = StyleSheet.create({
    card: { flexDirection: 'row', gap: 12, padding: 10, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
    heart: { position: 'absolute', top: 6, right: 6, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }
});
