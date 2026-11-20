import { router, Tabs } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '../../components/Icon';
import { useApp } from '../../lib/app-state';
import { useCounts } from '../../lib/counts';

export default function TabsLayout() {
    const { colors: c, t, user } = useApp();
    const insets = useSafeAreaInsets();
    const counts = useCounts(Boolean(user));
    const tab = (name: IconName) => {
        const TabIcon = ({ color }: { color: unknown }) => <Icon name={name} color={String(color)} size={24} />;
        return TabIcon;
    };
    return (
        <Tabs screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: c.green2,
            tabBarInactiveTintColor: c.muted,
            tabBarStyle: { backgroundColor: c.panel, borderTopColor: c.line, height: 60 + insets.bottom, paddingTop: 6 },
            tabBarLabelStyle: { fontSize: 11.5, fontWeight: '700' },
            tabBarBadgeStyle: { backgroundColor: c.accent, color: '#fff', fontSize: 10.5, fontWeight: '800' }
        }}>
            <Tabs.Screen name="index" options={{ title: t('Pazar'), tabBarIcon: tab('market') }} />
            <Tabs.Screen name="harita" options={{ title: t('Harita'), tabBarIcon: tab('map') }} />
            <Tabs.Screen name="yeni" options={{
                title: t('İlan ver'),
                tabBarButton: () => (
                    <Pressable accessibilityRole="button" accessibilityLabel={t('İlan ver')} onPress={() => router.push(user ? '/ilan-ver' : '/giris')}
                        style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-start' }}>
                        <View style={{ marginTop: -18, width: 56, height: 56, borderRadius: 28, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: c.panel, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 5 }}>
                            <Icon name="plus" color="#fff" size={26} width={2.6} />
                        </View>
                        <Text style={{ color: c.accentDark, fontSize: 11.5, fontWeight: '800', marginTop: 2 }}>{t('İlan ver')}</Text>
                    </Pressable>
                )
            }} />
            <Tabs.Screen name="mesajlar" options={{ title: t('Mesajlar'), tabBarIcon: tab('chat'), tabBarBadge: counts.messages || undefined }} />
            <Tabs.Screen name="hesap" options={{ title: t('Hesabım'), tabBarIcon: tab('user'), tabBarBadge: (counts.notifications + counts.offers) || undefined }} />
        </Tabs>
    );
}
