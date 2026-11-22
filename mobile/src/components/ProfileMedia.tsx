import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { Modal, PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { imageSource } from '../lib/api';
import { useApp } from '../lib/app-state';
import type { PhotoFrame } from '../lib/types';
import { Button } from './ui';

// Profil ve kapak fotoğrafları: kaydedilen kadrajla gösterim, tam ekran büyütme ve kadraj ayarlama.
const DEFAULT: PhotoFrame = { x: 50, y: 50, zoom: 100 };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
// Sunucudaki yol (/api/...) ya da seçilen yerel dosya (file://...) olabilir.
const sourceOf = (url?: string | null) => (!url ? undefined : /^(file|content|ph|blob|data):/.test(url) ? { uri: url } : imageSource(url));

export function FramedImage({ url, frame, style }: { url?: string | null; frame?: PhotoFrame | null; style?: ViewStyle }) {
    const f = frame ?? DEFAULT;
    const source = sourceOf(url);
    if (!source) return null;
    return (
        <View style={[{ overflow: 'hidden' }, style]} pointerEvents="none">
            <Image source={source} contentFit="cover" contentPosition={{ left: `${f.x}%`, top: `${f.y}%` }} transition={120} cachePolicy="memory-disk"
                style={{ width: '100%', height: '100%', transformOrigin: `${f.x}% ${f.y}%`, transform: [{ scale: f.zoom / 100 }] }} accessibilityIgnoresInvertColors />
        </View>
    );
}

// Fotoğrafı kırpmadan, ekranı kaplayarak gösterir. Dokununca kapanır.
export function PhotoViewer({ url, onClose }: { url: string | null; onClose: () => void }) {
    const { t } = useApp(); const insets = useSafeAreaInsets();
    const source = sourceOf(url);
    return (
        <Modal visible={Boolean(url)} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
            <Pressable onPress={onClose} accessibilityLabel={t('Kapat')} style={{ flex: 1, backgroundColor: '#000e', alignItems: 'center', justifyContent: 'center' }}>
                {source ? <Image source={source} contentFit="contain" style={{ width: '100%', height: '82%' }} accessibilityIgnoresInvertColors /> : null}
                <View style={{ position: 'absolute', top: insets.top + 10, right: 14, width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff3', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: 24, marginTop: -2 }}>×</Text>
                </View>
            </Pressable>
        </Modal>
    );
}

// Kadraj ayarlama: fotoğraf parmakla sürüklenir, alttaki çubukla yakınlaştırılır.
export function FrameEditor({ url, frame, shape, title, onCancel, onSave }: {
    url: string | null; frame?: PhotoFrame | null; shape: 'cover' | 'avatar'; title: string; onCancel: () => void; onSave: (f: PhotoFrame) => Promise<void>;
}) {
    const { colors: c, t } = useApp(); const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const [f, setF] = useState<PhotoFrame>(frame ?? DEFAULT);
    const [busy, setBusy] = useState(false);
    const live = useRef(f); live.current = f;
    const boxW = shape === 'cover' ? width - 32 : Math.min(260, width - 80);
    const boxH = shape === 'cover' ? Math.round(boxW / 3) : boxW;
    const start = useRef(f);
    const pan = useRef(PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => { start.current = live.current; },
        onPanResponderMove: (_, g) => {
            const k = 100 / (start.current.zoom / 100);
            setF(p => ({ ...p, x: clamp(Math.round(start.current.x - g.dx / boxW * k), 0, 100), y: clamp(Math.round(start.current.y - g.dy / boxH * k), 0, 100) }));
        }
    })).current;
    const [trackW, setTrackW] = useState(1);
    const trackRef = useRef(1);
    const zoomPan = useRef(PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: e => setF(p => ({ ...p, zoom: clamp(Math.round(100 + e.nativeEvent.locationX / trackRef.current * 200), 100, 300) })),
        onPanResponderMove: e => setF(p => ({ ...p, zoom: clamp(Math.round(100 + e.nativeEvent.locationX / trackRef.current * 200), 100, 300) }))
    })).current;
    const save = async () => { setBusy(true); try { await onSave(f); } finally { setBusy(false); } };
    return (
        <Modal visible={Boolean(url)} animationType="slide" presentationStyle="fullScreen" onRequestClose={onCancel}>
            <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 10 }}>
                    <Button title="Vazgeç" kind="plain" small full={false} onPress={onCancel} />
                    <Text style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: c.ink }}>{t(title)}</Text>
                    <Button title="Kaydet" small full={false} busy={busy} onPress={save} />
                </View>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 }}>
                    <View {...pan.panHandlers} accessibilityLabel={t('Fotoğrafı sürükleyerek konumlandır')}
                        style={{ width: boxW, height: boxH, borderRadius: shape === 'cover' ? 14 : boxW * 0.26, overflow: 'hidden', backgroundColor: c.greenSoft }}>
                        <FramedImage url={url} frame={f} style={StyleSheet.absoluteFill} />
                        {/* Üçte bir kılavuz çizgileri */}
                        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                            {[1, 2].map(i => <View key={'v' + i} style={{ position: 'absolute', top: 0, bottom: 0, left: `${i * 33.33}%`, width: StyleSheet.hairlineWidth, backgroundColor: '#fff9' }} />)}
                            {[1, 2].map(i => <View key={'h' + i} style={{ position: 'absolute', left: 0, right: 0, top: `${i * 33.33}%`, height: StyleSheet.hairlineWidth, backgroundColor: '#fff9' }} />)}
                        </View>
                    </View>
                    <Text style={{ color: c.muted, fontSize: 13.5, textAlign: 'center', paddingHorizontal: 30 }}>{t('Fotoğrafı sürükleyerek istediğin yeri ortala, alttaki çubukla yakınlaştır.')}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, width: Math.min(320, width - 60) }}>
                        <Text style={{ color: c.muted, fontSize: 20, fontWeight: '800' }}>−</Text>
                        <View {...zoomPan.panHandlers} onLayout={e => { trackRef.current = e.nativeEvent.layout.width; setTrackW(e.nativeEvent.layout.width); }}
                            accessible accessibilityRole="adjustable" accessibilityLabel={t('Yakınlaştırma')} accessibilityValue={{ min: 100, max: 300, now: f.zoom }}
                            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
                            onAccessibilityAction={e => setF(p => ({ ...p, zoom: clamp(p.zoom + (e.nativeEvent.actionName === 'increment' ? 20 : -20), 100, 300) }))}
                            style={{ flex: 1, height: 36, justifyContent: 'center' }}>
                            <View style={{ height: 5, borderRadius: 3, backgroundColor: c.line }}>
                                <View style={{ width: ((f.zoom - 100) / 200) * trackW, height: 5, borderRadius: 3, backgroundColor: c.green2 }} />
                            </View>
                            <View pointerEvents="none" style={{ position: 'absolute', left: ((f.zoom - 100) / 200) * trackW - 13, width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff', borderWidth: 2, borderColor: c.green2, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 3, elevation: 2 }} />
                        </View>
                        <Text style={{ color: c.muted, fontSize: 20, fontWeight: '800' }}>+</Text>
                    </View>
                    <View style={{ alignSelf: "center" }}><Button title="Ortala" kind="secondary" small full={false} onPress={() => setF({ x: 50, y: 50, zoom: 100 })} /></View>
                </View>
            </View>
        </Modal>
    );
}
