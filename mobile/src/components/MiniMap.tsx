import { Image } from 'expo-image';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { type LayoutChangeEvent, Linking, PanResponder, Pressable, Text, View, type ViewInstance } from 'react-native';
import { useApp } from '../lib/app-state';
import { USER_AGENT } from '../lib/config';
import { Icon } from './Icon';

// Hafif OpenStreetMap haritası (web'deki HasadimMap ile aynı yaklaşım): karolar resim olarak
// çizilir, parmakla kaydırılır, +/− ile yakınlaştırılır. Harici bir harita SDK'sı veya API
// anahtarı gerekmez; konum izni istenmez.
const TILE = 256;
const MIN_ZOOM = 5, MAX_ZOOM = 17;
const project = (lat: number, lon: number, z: number) => {
    const s = Math.sin((lat * Math.PI) / 180);
    const scale = TILE * 2 ** z;
    return { x: ((lon + 180) / 360) * scale, y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * scale };
};
const unproject = (x: number, y: number, z: number) => {
    const scale = TILE * 2 ** z;
    const lon = (x / scale) * 360 - 180;
    const n = Math.PI - (2 * Math.PI * y) / scale;
    return { lat: (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))), lon };
};

export const TURKEY = { lat: 39.0, lon: 35.2 };

export interface MapPin { id: string; lat: number; lon: number; render: () => ReactNode; onPress?: () => void }

export function MiniMap({ center, zoom: initialZoom = 6, height = 220, pins = [], pin, interactive = true, onTap, onMove, rounded = true }: {
    center: { lat: number; lon: number }; zoom?: number; height?: number; pins?: MapPin[]; pin?: { lat: number; lon: number }; interactive?: boolean;
    onTap?: (at: { lat: number; lon: number }) => void;
    // Harita kaydırılınca/yakınlaştırılınca yeni merkez (tam ekran konum seçicide "artı işaretinin altındaki yer").
    onMove?: (center: { lat: number; lon: number }, zoom: number) => void;
    rounded?: boolean;
}) {
    const { colors: c, t } = useApp();
    const [width, setWidth] = useState(0);
    const [zoom, setZoom] = useState(initialZoom);
    const [view, setView] = useState(center);
    const drag = useRef<{ x: number; y: number } | null>(null);
    const box = useRef<ViewInstance>(null);
    // Dışarıdan yeni merkez gelirse (ör. il değişti) harita oraya gider.
    useEffect(() => { setView(center); setZoom(initialZoom); }, [center.lat, center.lon, initialZoom]); // eslint-disable-line react-hooks/exhaustive-deps
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    useEffect(() => { onMove?.(view, zoom); }, [view, zoom]); // eslint-disable-line react-hooks/exhaustive-deps
    const touchAt = useRef({ x: 0, y: 0 });

    const origin = useMemo(() => project(view.lat, view.lon, zoom), [view, zoom]);
    const pan = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => Boolean(onTap),
        onMoveShouldSetPanResponder: (_, g) => interactive && Math.abs(g.dx) + Math.abs(g.dy) > 6,
        // Dokunulan nokta, haritanın kendi köşesine göre alınır (sayfa kaydırılmış olsa da doğru yer işaretlenir).
        onPanResponderGrant: e => { drag.current = { x: 0, y: 0 }; touchAt.current = { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY }; },
        onPanResponderMove: (_, g) => setOffset({ x: g.dx, y: g.dy }),
        onPanResponderRelease: (_, g) => {
            drag.current = null; setOffset({ x: 0, y: 0 });
            if (Math.abs(g.dx) + Math.abs(g.dy) < 6) {
                // Dokunma: haritadaki noktanın enlem/boylamı.
                if (onTap) onTap(unproject(origin.x + touchAt.current.x - width / 2, origin.y + touchAt.current.y - height / 2, zoom));
                return;
            }
            setView(unproject(origin.x - g.dx, origin.y - g.dy, zoom));
        },
        onPanResponderTerminationRequest: () => false
    }), [interactive, origin, zoom, onTap, width, height]);

    const tiles: { key: string; url: string; left: number; top: number }[] = [];
    if (width) {
        const cx = origin.x - offset.x, cy = origin.y - offset.y;
        const x0 = Math.floor((cx - width / 2) / TILE), x1 = Math.floor((cx + width / 2) / TILE);
        const y0 = Math.floor((cy - height / 2) / TILE), y1 = Math.floor((cy + height / 2) / TILE);
        const n = 2 ** zoom;
        for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
            if (y < 0 || y >= n) continue;
            const wx = ((x % n) + n) % n;
            tiles.push({ key: `${zoom}/${x}/${y}`, url: `https://tile.openstreetmap.org/${zoom}/${wx}/${y}.png`, left: x * TILE - cx + width / 2, top: y * TILE - cy + height / 2 });
        }
    }
    const place = (lat: number, lon: number) => {
        const p = project(lat, lon, zoom);
        return { left: p.x - (origin.x - offset.x) + width / 2, top: p.y - (origin.y - offset.y) + height / 2 };
    };
    const zoomBy = (d: number) => setZoom(z => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + d)));

    return (
        <View ref={box} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} {...pan.panHandlers}
            accessibilityLabel={t('Harita')} style={{ height, borderRadius: rounded ? 12 : 0, overflow: 'hidden', backgroundColor: c.greenSoft, borderWidth: rounded ? 1 : 0, borderColor: c.line }}>
            {/* Karolar dokunmayı almaz: dokunulan yer haritanın kendisine göre hesaplanır. */}
            <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
                {tiles.map(tile => (
                    <Image key={tile.key} source={{ uri: tile.url, headers: { 'User-Agent': USER_AGENT } }} cachePolicy="memory-disk"
                        style={{ position: 'absolute', left: tile.left, top: tile.top, width: TILE, height: TILE }} />
                ))}
            </View>
            {width ? pins.map(p => {
                const at = place(p.lat, p.lon);
                if (at.left < -60 || at.left > width + 60 || at.top < -40 || at.top > height + 40) return null;
                return <Pressable key={p.id} onPress={p.onPress} style={{ position: 'absolute', left: at.left, top: at.top, transform: [{ translateX: -40 }, { translateY: -30 }], width: 80, alignItems: 'center' }}>{p.render()}</Pressable>;
            }) : null}
            {width && pin ? (() => { const at = place(pin.lat, pin.lon); return <View pointerEvents="none" style={{ position: 'absolute', left: at.left - 14, top: at.top - 34 }}><Icon name="pin" color={c.accent} size={30} width={2.4} /></View>; })() : null}
            {interactive ? (
                <View style={{ position: 'absolute', right: 8, top: 8, gap: 6 }}>
                    {([[1, '+', 'Yakınlaştır'], [-1, '−', 'Uzaklaştır']] as const).map(([d, l, label]) => (
                        <Pressable key={l} accessibilityRole="button" accessibilityLabel={t(label)} onPress={() => zoomBy(d)}
                            style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: c.panel, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.line }}>
                            <Text style={{ fontSize: 20, fontWeight: '700', color: c.ink }}>{l}</Text>
                        </Pressable>
                    ))}
                </View>
            ) : null}
            <Pressable onPress={() => void Linking.openURL('https://www.openstreetmap.org/copyright')} style={{ position: 'absolute', right: 0, bottom: 0, backgroundColor: c.panel + 'DD', paddingHorizontal: 5, paddingVertical: 1, borderTopLeftRadius: 6 }}>
                <Text style={{ fontSize: 10, color: c.muted }}>© {t('OpenStreetMap katkıcıları').replace('© ', '')}</Text>
            </Pressable>
        </View>
    );
}

// İl merkezleri (konumu işaretlenmemiş ilanlar için yaklaşık konum).
export const CITY_CENTERS: Record<string, [number, number]> = {
    Adana: [37.0, 35.32], Adıyaman: [37.76, 38.28], Afyonkarahisar: [38.76, 30.54], Ağrı: [39.72, 43.05], Aksaray: [38.37, 34.03], Amasya: [40.65, 35.83], Ankara: [39.93, 32.86], Antalya: [36.9, 30.7], Ardahan: [41.11, 42.7], Artvin: [41.18, 41.82], Aydın: [37.85, 27.84], Balıkesir: [39.65, 27.88], Bartın: [41.63, 32.34], Batman: [37.88, 41.13], Bayburt: [40.26, 40.22], Bilecik: [40.14, 29.98], Bingöl: [38.88, 40.5], Bitlis: [38.4, 42.11], Bolu: [40.74, 31.61], Burdur: [37.72, 30.29], Bursa: [40.18, 29.06], Çanakkale: [40.15, 26.41], Çankırı: [40.6, 33.62], Çorum: [40.55, 34.95], Denizli: [37.78, 29.09], Diyarbakır: [37.91, 40.24], Düzce: [40.84, 31.16], Edirne: [41.68, 26.56], Elazığ: [38.67, 39.22], Erzincan: [39.75, 39.49], Erzurum: [39.9, 41.27], Eskişehir: [39.78, 30.52], Gaziantep: [37.07, 37.38], Giresun: [40.91, 38.39], Gümüşhane: [40.46, 39.48], Hakkari: [37.58, 43.74], Hatay: [36.2, 36.16], Iğdır: [39.92, 44.04], Isparta: [37.76, 30.55], İstanbul: [41.01, 28.98], İzmir: [38.42, 27.14], Kahramanmaraş: [37.58, 36.94], Karabük: [41.2, 32.63], Karaman: [37.18, 33.22], Kars: [40.6, 43.1], Kastamonu: [41.39, 33.78], Kayseri: [38.73, 35.49], Kırıkkale: [39.85, 33.51], Kırklareli: [41.73, 27.23], Kırşehir: [39.15, 34.16], Kilis: [36.72, 37.12], Kocaeli: [40.77, 29.92], Konya: [37.87, 32.48], Kütahya: [39.42, 29.98], Malatya: [38.35, 38.31], Manisa: [38.61, 27.43], Mardin: [37.31, 40.74], Mersin: [36.8, 34.63], Muğla: [37.22, 28.36], Muş: [38.74, 41.49], Nevşehir: [38.62, 34.71], Niğde: [37.97, 34.68], Ordu: [40.98, 37.88], Osmaniye: [37.07, 36.25], Rize: [41.02, 40.52], Sakarya: [40.78, 30.4], Samsun: [41.29, 36.33], Siirt: [37.93, 41.94], Sinop: [42.03, 35.15], Sivas: [39.75, 37.02], Şanlıurfa: [37.16, 38.79], Şırnak: [37.52, 42.46], Tekirdağ: [40.98, 27.51], Tokat: [40.31, 36.55], Trabzon: [41.0, 39.72], Tunceli: [39.11, 39.55], Uşak: [38.68, 29.41], Van: [38.49, 43.38], Yalova: [40.65, 29.27], Yozgat: [39.82, 34.81], Zonguldak: [41.45, 31.79]
};

// Kimliğe göre sabit küçük kaydırma: aynı ildeki ilanlar üst üste binmesin.
export function approximate(id: string, city: string): { lat: number; lon: number } | null {
    const base = CITY_CENTERS[city];
    if (!base) return null;
    let h = 0;
    for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return { lat: base[0] + ((h % 1000) / 1000 - 0.5) * 0.16, lon: base[1] + (((h >>> 10) % 1000) / 1000 - 0.5) * 0.22 };
}
