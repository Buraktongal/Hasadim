import { useState } from 'react';
import { Linking, Platform, Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useApp } from '../lib/app-state';
import { Icon } from './Icon';
import { Sheet, toast } from './ui';

// Konumu hangi harita uygulamasında açacağını sorar: Google Haritalar, iPhone'da Apple Haritalar,
// Android'de telefonun varsayılan harita uygulaması (geo: bağlantısı, sistem uygulama seçtirir).
type Target = { lat: number; lon: number; label: string; route: boolean };

export function useMapChooser() {
    const [target, setTarget] = useState<Target | null>(null);
    const [visible, setVisible] = useState(false);
    return { open: (t: Target) => { setTarget(t); setVisible(true); }, node: <MapChooser target={target} visible={visible} onClose={() => setVisible(false)} /> };
}

function MapChooser({ target, visible, onClose }: { target: Target | null; visible: boolean; onClose: () => void }) {
    const { colors: c, t } = useApp();
    const go = async (url: string, fallback?: string) => {
        onClose();
        try { await Linking.openURL(url); }
        catch {
            if (fallback) { try { await Linking.openURL(fallback); return; } catch { /* aşağıda bildirilir */ } }
            toast('Harita uygulaması açılamadı.');
        }
    };
    const options: { key: string; label: string; sub: string; icon: React.ReactNode; run: () => void }[] = [];
    if (target) {
        const { lat, lon, label, route } = target;
        const ll = `${lat},${lon}`, q = encodeURIComponent(label);
        options.push({
            key: 'google', label: 'Google Haritalar', sub: route ? t('Yol tarifi') : t('Konumu göster'),
            icon: <GoogleIcon />,
            // https bağlantısı Google Haritalar yüklüyse uygulamada, değilse tarayıcıda açılır.
            run: () => void go(route ? `https://www.google.com/maps/dir/?api=1&destination=${ll}` : `https://www.google.com/maps/search/?api=1&query=${ll}`)
        });
        if (Platform.OS === 'ios') options.push({
            key: 'apple', label: 'Apple Haritalar', sub: route ? t('Yol tarifi') : t('Konumu göster'),
            icon: <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center' }}><Icon name="map" color="#1E88E5" size={24} /></View>,
            run: () => void go(route ? `maps://?daddr=${ll}&dirflg=d` : `maps://?ll=${ll}&q=${q}`, route ? `https://maps.apple.com/?daddr=${ll}` : `https://maps.apple.com/?ll=${ll}&q=${q}`)
        });
        if (Platform.OS === 'android') options.push({
            key: 'geo', label: t('Telefonun harita uygulaması'), sub: t('Yüklü harita uygulamalarından seç'),
            icon: <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: c.greenSoft, alignItems: 'center', justifyContent: 'center' }}><Icon name="pin" color={c.green2} size={24} /></View>,
            run: () => void go(route ? `google.navigation:q=${ll}` : `geo:${ll}?q=${ll}(${q})`, `geo:${ll}?q=${ll}(${q})`)
        });
    }
    return (
        <Sheet visible={visible} onClose={onClose} title={target?.route ? 'Yol tarifi' : 'Haritada aç'}>
            <Text style={{ color: c.muted, fontSize: 13 }}>{t('Konumu hangi uygulamada açmak istersin?')}</Text>
            {options.map(o => (
                <Pressable key={o.key} onPress={o.run} accessibilityRole="button" accessibilityLabel={o.label}
                    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14, borderWidth: 1, borderColor: c.line, backgroundColor: pressed ? c.greenSoft : c.panel })}>
                    {o.icon}
                    <View style={{ flex: 1 }}>
                        <Text style={{ color: c.ink, fontWeight: '800', fontSize: 16 }}>{o.label}</Text>
                        <Text style={{ color: c.muted, fontSize: 12.5 }}>{o.sub}</Text>
                    </View>
                    <Icon name="share" color={c.muted} size={18} />
                </Pressable>
            ))}
        </Sheet>
    );
}

function GoogleIcon() {
    return (
        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e3e3e3', alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={26} height={26} viewBox="0 0 24 24">
                <Path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7z" fill="#EA4335" />
                <Circle cx={12} cy={9} r={2.6} fill="#fff" />
            </Svg>
        </View>
    );
}
