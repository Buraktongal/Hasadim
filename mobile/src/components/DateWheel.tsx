import * as Haptics from 'expo-haptics';
import { type ComponentRef, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, type NativeScrollEvent, type NativeSyntheticEvent, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useApp } from '../lib/app-state';
import { monthNames } from '../lib/format';
import { radius } from '../lib/theme';
import { Icon } from './Icon';
import { Button, ClearButton, Sheet } from './ui';

// iPhone'daki gibi gün / ay / yıl tekerlekleriyle tarih seçimi. Değer GG.AA.YYYY biçimindedir.
const ITEM = 42;
const VISIBLE = 5;
const pad = (n: number) => String(n).padStart(2, '0');
const daysIn = (y: number, m: number) => new Date(y, m, 0).getDate();
export const parseTr = (v: string) => {
    const m = v.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    return m ? { d: +m[1]!, m: +m[2]!, y: +m[3]! } : null;
};

function Wheel({ items, index, onChange, label, width }: { items: string[]; index: number; onChange: (i: number) => void; label: string; width: number | `${number}%` }) {
    const { colors: c } = useApp();
    const ref = useRef<ComponentRef<typeof ScrollView>>(null);
    const live = useRef(index);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const [shown, setShown] = useState(index);
    // Dışarıdan değişince (ör. ay değişip gün sayısı azalınca) tekerlek doğru yere gider.
    useEffect(() => {
        live.current = index; setShown(index);
        const id = setTimeout(() => ref.current?.scrollTo({ y: index * ITEM, animated: false }), 0);
        return () => clearTimeout(id);
    }, [index, items.length]);
    const settle = (y: number) => {
        const i = Math.max(0, Math.min(items.length - 1, Math.round(y / ITEM)));
        if (Math.abs(y - i * ITEM) > 1) ref.current?.scrollTo({ y: i * ITEM, animated: true });
        if (i !== index) onChange(i);
    };
    const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const y = e.nativeEvent.contentOffset.y;
        const i = Math.max(0, Math.min(items.length - 1, Math.round(y / ITEM)));
        if (i !== live.current) { live.current = i; setShown(i); if (Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => undefined); }
        clearTimeout(timer.current);
        timer.current = setTimeout(() => settle(y), 140); // web'de momentum olayı yok; durunca yerine oturur
    };
    return (
        <View style={{ width, height: ITEM * VISIBLE }} accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ text: items[shown] }}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={e => { const i = shown + (e.nativeEvent.actionName === 'increment' ? 1 : -1); if (i >= 0 && i < items.length) onChange(i); }}>
            <ScrollView ref={ref} showsVerticalScrollIndicator={false} snapToInterval={ITEM} decelerationRate="fast" scrollEventThrottle={16} onScroll={onScroll}
                onMomentumScrollEnd={e => { clearTimeout(timer.current); settle(e.nativeEvent.contentOffset.y); }}
                contentContainerStyle={{ paddingVertical: ITEM * 2 }} nestedScrollEnabled>
                {items.map((it, i) => {
                    const dist = Math.abs(i - shown);
                    return (
                        <Pressable key={it + i} onPress={() => { ref.current?.scrollTo({ y: i * ITEM, animated: true }); onChange(i); }} style={{ height: ITEM, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: dist === 0 ? 20 : 17, fontWeight: dist === 0 ? '800' : '500', color: dist === 0 ? c.ink : c.muted, opacity: dist > 1 ? 0.45 : 1 }}>{it}</Text>
                        </Pressable>
                    );
                })}
            </ScrollView>
        </View>
    );
}

export function DateWheelPicker({ value, onChange, minYear, maxYear }: { value: { d: number; m: number; y: number }; onChange: (v: { d: number; m: number; y: number }) => void; minYear: number; maxYear: number }) {
    const { colors: c, t, lang } = useApp();
    const years = useMemo(() => Array.from({ length: maxYear - minYear + 1 }, (_, i) => String(minYear + i)), [minYear, maxYear]);
    const months = monthNames(lang);
    const dayCount = daysIn(value.y, value.m);
    const days = useMemo(() => Array.from({ length: dayCount }, (_, i) => String(i + 1)), [dayCount]);
    const set = (patch: Partial<typeof value>) => {
        const next = { ...value, ...patch };
        next.d = Math.min(next.d, daysIn(next.y, next.m));
        onChange(next);
    };
    return (
        <View style={{ height: ITEM * VISIBLE, flexDirection: 'row', justifyContent: 'center' }}>
            {/* Seçili satır bandı */}
            <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: ITEM * 2, height: ITEM, borderRadius: 10, backgroundColor: c.greenSoft }} />
            <Wheel label={t('Gün')} width="22%" items={days} index={value.d - 1} onChange={i => set({ d: i + 1 })} />
            <Wheel label={t('Ay')} width="44%" items={months} index={value.m - 1} onChange={i => set({ m: i + 1 })} />
            <Wheel label={t('Yıl')} width="30%" items={years} index={Math.max(0, years.indexOf(String(value.y)))} onChange={i => set({ y: minYear + i })} />
        </View>
    );
}

// Form alanı: dokununca alttan tekerlekli seçici açılır.
export function DateField({ label, value, onChange, hint, minYear, maxYear }: { label: string; value: string; onChange: (v: string) => void; hint?: string; minYear?: number; maxYear?: number }) {
    const { colors: c, t, lang } = useApp();
    const now = new Date();
    const lo = minYear ?? now.getFullYear() - 3, hi = maxYear ?? now.getFullYear() + 2;
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState(() => parseTr(value) ?? { d: now.getDate(), m: now.getMonth() + 1, y: now.getFullYear() });
    const parsed = parseTr(value);
    const text = parsed ? parsed.d + ' ' + monthNames(lang)[parsed.m - 1] + ' ' + parsed.y : '';
    const show = () => {
        Keyboard.dismiss();
        const p = parseTr(value);
        setDraft(p && p.y >= lo && p.y <= hi ? p : { d: now.getDate(), m: now.getMonth() + 1, y: Math.min(hi, Math.max(lo, now.getFullYear())) });
        setOpen(true);
    };
    const commit = () => { onChange(pad(draft.d) + '.' + pad(draft.m) + '.' + draft.y); setOpen(false); };
    return (
        <View style={{ gap: 5 }}>
            <Text style={{ color: c.ink, fontWeight: '700', fontSize: 13.5 }}>{t(label)}</Text>
            <Pressable onPress={show} accessibilityRole="button" accessibilityLabel={t(label) + ': ' + (text || t('Tarih seç'))}
                style={{ minHeight: 46, borderRadius: radius.m, borderWidth: 1, borderColor: c.line, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.input }}>
                <Icon name="calendar" color={c.green2} size={19} />
                <Text style={{ flex: 1, fontSize: 15.5, color: text ? c.ink : c.muted }}>{text || t('Tarih seç')}</Text>
                {value ? <ClearButton label={t('Tarihi temizle')} onPress={() => onChange('')} /> : null}
            </Pressable>
            {hint ? <Text style={{ color: c.muted, fontSize: 12.5 }}>{t(hint)}</Text> : null}
            <Sheet visible={open} onClose={() => setOpen(false)} title={label}>
                <DateWheelPicker value={draft} onChange={setDraft} minYear={lo} maxYear={hi} />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}><Button title="Bugün" kind="secondary" onPress={() => setDraft({ d: now.getDate(), m: now.getMonth() + 1, y: now.getFullYear() })} /></View>
                    <View style={{ flex: 1 }}><Button title="Tamam" onPress={commit} /></View>
                </View>
            </Sheet>
        </View>
    );
}
