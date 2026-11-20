import { Image } from 'expo-image';
import { View, type ViewStyle } from 'react-native';
import { imageSource } from '../lib/api';
import { useColors } from '../lib/app-state';
import { ProductIcon } from './ProductIcon';

// Sunucudaki ilan fotoğrafı. Fotoğraf yoksa ürün simgesi gösterilir.
export function Photo({ url, product, style, radius = 12, fit = 'cover' }: { url?: string | null; product?: string; style?: ViewStyle; radius?: number; fit?: 'cover' | 'contain' }) {
    const c = useColors();
    const source = imageSource(url);
    return (
        <View style={[{ backgroundColor: c.greenSoft, borderRadius: radius, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, style]}>
            <ProductIcon name={product} size={34} />
            {source ? <Image source={source} contentFit={fit} transition={150} cachePolicy="memory-disk" recyclingKey={url ?? undefined}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} accessibilityIgnoresInvertColors /> : null}
        </View>
    );
}
