import { useState } from 'react';
import { Keyboard, Linking, Modal, Pressable, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../lib/app-state';
import { radius } from '../lib/theme';
import { Icon } from './Icon';
import { MiniMap } from './MiniMap';
import { Button, toast } from './ui';

// Tam ekran konum seçici: haritayı parmakla kaydırırsın, ortadaki iğnenin altındaki yer seçilir
// (küçük haritada tam noktaya dokunmaktan çok daha kolay). Google Haritalar'dan kopyalanan bağlantı
// veya "38.49, 27.70" gibi koordinat da yapıştırılabilir.
type Point = { lat: number; lon: number };
const inTurkey = (p: Point) => p.lat >= 35.5 && p.lat <= 42.5 && p.lon >= 25.5 && p.lon <= 45;

export function parseLocation(text: string): Point | null {
    const s = text.trim();
    const patterns = [/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/, /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
        /[?&](?:q|query|ll|destination|center)=(-?\d+(?:\.\d+)?)(?:,|%2C)\s*(-?\d+(?:\.\d+)?)/i, /^(-?\d+(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d+(?:[.,]\d+)?)$/];
    for (const p of patterns) {
        const m = p.exec(s);
        if (m) { const lat = Number(m[1]!.replace(',', '.')), lon = Number(m[2]!.replace(',', '.')); if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon }; }
    }
    return null;
}

export function MapPicker({ visible, start, startZoom, place, onCancel, onPick }: {
    visible: boolean; start: Point; startZoom: number; place: string; onCancel: () => void; onPick: (p: Point) => void;
}) {
    const { colors: c, t } = useApp();
    const insets = useSafeAreaInsets();
    const { height } = useWindowDimensions();
    const [center, setCenter] = useState<Point>(start);
    const [jump, setJump] = useState<{ p: Point; z: number }>({ p: start, z: startZoom });
    const [text, setText] = useState('');
    const [zoom, setZoom] = useState(startZoom);
    const mapH = height - insets.top - insets.bottom - 56 - 170;
    const go = () => {
        const p = parseLocation(text);
        if (!p) { toast('Bağlantıda konum bulunamadı. “38.49, 27.70” gibi koordinat da yapıştırabilirsin.'); return; }
        if (!inTurkey(p)) { toast('Bu konum Türkiye dışında görünüyor.'); return; }
        Keyboard.dismiss(); setText(''); setJump({ p, z: 15 });
    };
    return (
        <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onCancel}>
            <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
                <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, borderBottomWidth: 1, borderColor: c.line, backgroundColor: c.panel }}>
                    <Button title="Vazgeç" kind="plain" small full={false} onPress={onCancel} />
                    <Text style={{ flex: 1, textAlign: 'center', color: c.ink, fontWeight: '800', fontSize: 16.5 }} numberOfLines={1}>{t('Konumu işaretle')}</Text>
                    <View style={{ width: 70 }} />
                </View>
                <View>
                    <MiniMap center={jump.p} zoom={jump.z} height={mapH} rounded={false} onMove={(p, z) => { setCenter(p); setZoom(z); }} />
                    {/* Ortadaki iğne: haritayı kaydırarak altına istediğin yeri getir. */}
                    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: mapH / 2 - 40, alignItems: 'center' }}>
                        <Icon name="pin" color={c.accent} size={42} width={2.6} />
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent, marginTop: -4, opacity: 0.6 }} />
                    </View>
                    <View pointerEvents="none" style={{ position: 'absolute', left: 12, top: 12, right: 60, backgroundColor: '#000a', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 }}>
                        <Text style={{ color: '#fff', fontSize: 12.5 }}>{t('Haritayı kaydır; iğnenin altındaki yer seçilir. +/− ile yakınlaştır.')}</Text>
                    </View>
                </View>
                <View style={{ flex: 1, padding: 12, paddingBottom: 12 + insets.bottom, gap: 10, backgroundColor: c.panel, borderTopWidth: 1, borderColor: c.line }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TextInput value={text} onChangeText={setText} onSubmitEditing={go} returnKeyType="go" autoCapitalize="none" autoCorrect={false}
                            placeholder={t('Google Haritalar bağlantısı veya 38.49, 27.70')} placeholderTextColor={c.muted}
                            style={{ flex: 1, height: 42, borderRadius: radius.m, borderWidth: 1, borderColor: c.line, paddingHorizontal: 12, color: c.ink, backgroundColor: c.input }} />
                        <Button title="Git" kind="secondary" small full={false} onPress={go} />
                    </View>
                    <Pressable onPress={() => void Linking.openURL('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(place || 'Türkiye'))}>
                        <Text style={{ color: c.green2, fontSize: 13, fontWeight: '700' }}>{t('Yeri Google Haritalar’da bul, konumu kopyalayıp buraya yapıştır ↗')}</Text>
                    </Pressable>
                    {/* Çok uzaktan seçim yanlış olur: önce yakınlaştırılır (düğme bir dokunuşla yakınlaştırır). */}
                    <Button title={zoom < 12 ? 'Yakınlaştır' : 'Bu konumu kullan'} kind={zoom < 12 ? 'secondary' : 'primary'} disabled={!inTurkey(center)}
                        onPress={() => zoom < 12 ? setJump({ p: center, z: Math.min(14, zoom + 3) }) : onPick({ lat: Math.round(center.lat * 1e5) / 1e5, lon: Math.round(center.lon * 1e5) / 1e5 })} />
                </View>
            </View>
        </Modal>
    );
}
