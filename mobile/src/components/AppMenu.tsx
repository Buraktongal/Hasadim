import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../lib/app-state';
import { useCounts } from '../lib/counts';
import { initials } from '../lib/format';
import { Icon, type IconName } from './Icon';
import { afterModal, useConfirm } from './ui';

// Soldan açılan ana menü (Pazar ekranındaki ☰ düğmesi). Web'deki "Menü" ile aynı bölümler.
type Item = { icon: IconName; label: string; href: string; count?: number; auth?: boolean };

export function AppMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
    const { colors: c, t, user, signOut, dark } = useApp();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const counts = useCounts(Boolean(user));
    const confirm = useConfirm();
    const panelW = Math.min(330, width * 0.84);
    const [mounted, setMounted] = useState(open);
    const x = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (open) { setMounted(true); Animated.timing(x, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }
        else if (mounted) Animated.timing(x, { toValue: 0, duration: 190, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(({ finished }) => { if (finished) setMounted(false); });
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    const go = (href: string, auth?: boolean) => { onClose(); afterModal(() => router.push((auth && !user ? '/giris' : href) as never)); };
    const sections: [string, Item[]][] = [
        ['Keşfet', [
            { icon: 'market', label: 'Tüm ilanlar', href: '/' },
            { icon: 'map', label: 'Harita', href: '/harita' },
            { icon: 'calendar', label: 'Ürün takvimi', href: '/urun-takvimi' },
            { icon: 'plus', label: 'İlan ver', href: '/ilan-ver', auth: true }
        ]],
        ['İlanlar ve alışveriş', [
            { icon: 'tag', label: 'İlanlarım', href: '/ilanlarim', auth: true },
            { icon: 'heart', label: 'Favorilerim', href: '/ilanlarim?tab=favorites', auth: true },
            { icon: 'chat', label: 'Mesajlar', href: '/mesajlar', count: counts.messages, auth: true },
            { icon: 'offer', label: 'Tekliflerim', href: '/tekliflerim', count: counts.offers, auth: true },
            { icon: 'bell', label: 'Bildirimler', href: '/bildirimler', count: counts.notifications, auth: true },
            { icon: 'bookmark', label: 'Kayıtlı aramalar', href: '/kayitli-aramalar', auth: true }
        ]],
        ['Hesap', [
            { icon: 'user', label: 'Profilim', href: '/profil', auth: true },
            { icon: 'shield', label: 'Hesap güvenliği', href: '/guvenlik', auth: true },
            { icon: 'settings', label: 'Ayarlar', href: '/ayarlar' },
            { icon: 'idea', label: 'Öneri ve geri bildirim', href: '/geri-bildirim' }
        ]]
    ];
    if (!mounted) return confirm.node;
    return (
        <>
        <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
            <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#0008', opacity: x }]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('Menüyü kapat')} />
            </Animated.View>
            <Animated.View accessibilityViewIsModal style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: panelW, backgroundColor: c.bg, paddingTop: insets.top, transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [-panelW, 0] }) }], shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 16, elevation: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 }}>
                    <Image source={dark ? require('../../assets/logo-yazi-koyu.png') : require('../../assets/logo-yazi.png')} style={{ width: 118, height: 30 }} resizeMode="contain" accessibilityLabel="Hasadım" />
                    <View style={{ flex: 1 }} />
                    <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('Kapat')} hitSlop={8} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: c.panel }}><Icon name="close" color={c.muted} size={18} /></Pressable>
                </View>
                {/* Kullanıcı kartı */}
                <Pressable onPress={() => go(user ? '/profil' : '/giris')} style={{ marginHorizontal: 12, marginBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: c.panel, borderWidth: 1, borderColor: c.line }}>
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.greenSoft, alignItems: 'center', justifyContent: 'center' }}>
                        {user ? <Text style={{ color: c.green2, fontWeight: '900', fontSize: 16 }}>{initials(user.displayName)}</Text> : <Icon name="user" color={c.green2} size={22} />}
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: c.ink, fontWeight: '800', fontSize: 15.5 }} numberOfLines={1}>{user ? user.displayName : t('Giriş yap veya kayıt ol')}</Text>
                        <Text style={{ color: c.muted, fontSize: 12.5 }} numberOfLines={1}>{user ? t('Profilini görüntüle') : t('İlan vermek ve mesajlaşmak için')}</Text>
                    </View>
                </Pressable>
                <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
                    {sections.map(([title, items]) => (
                        <View key={title} style={{ paddingTop: 10 }}>
                            <Text style={{ paddingHorizontal: 20, paddingBottom: 4, color: c.muted, fontSize: 11.5, fontWeight: '800', letterSpacing: 0.8 }}>{t(title).toLocaleUpperCase('tr')}</Text>
                            {items.map(it => (
                                <Pressable key={it.href} onPress={() => go(it.href, it.auth)} accessibilityRole="button"
                                    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 11, backgroundColor: pressed ? c.greenSoft : 'transparent' })}>
                                    <Icon name={it.icon} color={c.green2} size={21} />
                                    <Text style={{ flex: 1, color: c.ink, fontSize: 15.5, fontWeight: '600' }}>{t(it.label)}</Text>
                                    {it.count ? <View style={{ minWidth: 22, height: 22, borderRadius: 11, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}><Text style={{ color: '#fff', fontWeight: '900', fontSize: 12 }}>{it.count > 99 ? '99+' : it.count}</Text></View> : null}
                                </Pressable>
                            ))}
                        </View>
                    ))}
                    {user ? (
                        <Pressable onPress={() => { onClose(); afterModal(async () => { if (await confirm.ask('Çıkış yap', t('Bu cihazdaki oturumun kapatılacak.'), 'Çıkış yap', true)) await signOut(); }); }}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 14, marginTop: 8 }}>
                            <Icon name="logout" color={c.danger} size={21} />
                            <Text style={{ color: c.danger, fontSize: 15.5, fontWeight: '700' }}>{t('Çıkış yap')}</Text>
                        </Pressable>
                    ) : null}
                </ScrollView>
            </Animated.View>
        </Modal>
        {confirm.node}
        </>
    );
}
