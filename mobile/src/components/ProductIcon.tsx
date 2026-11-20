import { memo } from 'react';
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import icons from '../data/icons.json';

// Web'deki ürün simgelerinin aynısı (src/data/icons.json, web'den üretilir).
type Shape = [string, Record<string, string | number>];
const shapes = icons.shapes as unknown as Record<string, Shape[]>;
const aliases = icons.aliases as Record<string, string>;
const camel = (k: string) => k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
const Tags: Record<string, typeof Path> = { path: Path, circle: Circle as unknown as typeof Path, ellipse: Ellipse as unknown as typeof Path, rect: Rect as unknown as typeof Path };

export const ProductIcon = memo(function ProductIcon({ name, size = 22 }: { name?: string | null; size?: number }) {
    const parts = shapes[name ?? ''] ?? shapes[aliases[name ?? ''] ?? ''] ?? shapes['Diğer'] ?? [];
    return (
        <Svg width={size} height={size} viewBox="0 0 32 32" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {parts.map(([tag, attrs], i) => {
                const Tag = Tags[tag];
                if (!Tag) return null;
                const props: Record<string, string | number> = {};
                for (const [k, v] of Object.entries(attrs)) props[camel(k)] = v;
                return <Tag key={i} {...(props as object)} />;
            })}
        </Svg>
    );
});
