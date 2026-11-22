import { router } from 'expo-router';
import { type ComponentRef, type ReactNode, type Ref, type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated, Easing, FlatList, InputAccessoryView, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch,
    Text, TextInput, type TextInputProps, type TextStyle, View, type ViewStyle
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { useApp, useColors, useT } from '../lib/app-state';
import { radius, type Colors } from '../lib/theme';

const native = Platform.OS !== 'web';

// ---------- Metin ----------
type TxtProps = { children?: ReactNode; style?: TextStyle | TextStyle[]; muted?: boolean; size?: number; weight?: TextStyle['fontWeight']; color?: string; numberOfLines?: number; raw?: boolean; center?: boolean; selectable?: boolean };
// Txt: Türkçe metni seçili dile çevirir. Kullanıcının yazdığı içerik için raw kullanılır.
// Geri gidilecek ekran yoksa (uygulama doğrudan bu ekranla açıldıysa) ana sayfaya döner.
// Doğrudan router.back() çağrısı bu durumda "GO_BACK was not handled" uyarısı verir.
export function goBack() {
    if (router.canGoBack()) router.back(); else router.replace('/');
}

export function Txt({ children, style, muted, size = 15, weight, color, numberOfLines, raw, center, selectable }: TxtProps) {
    const c = useColors();
    const t = useT();
    const content = !raw && typeof children === 'string' ? t(children) : children;
    return (
        <Text selectable={selectable} numberOfLines={numberOfLines}
            style={[{ color: color ?? (muted ? c.muted : c.ink), fontSize: size, fontWeight: weight, textAlign: center ? 'center' : undefined, lineHeight: Math.round(size * 1.38) }, style as TextStyle]}>
            {content}
        </Text>
    );
}

export const H1 = (p: TxtProps) => <Txt size={24} weight="800" {...p} />;
export const H2 = (p: TxtProps) => <Txt size={18} weight="800" {...p} />;
export function Eyebrow({ children }: { children: string }) {
    const { colors: c, t, lang } = useApp();
    return <Text style={{ color: c.green2, fontSize: 11.5, fontWeight: '800', letterSpacing: 1.1 }}>{t(children).toLocaleUpperCase(lang === 'en' ? 'en' : 'tr')}</Text>;
}

// ---------- Ekran ----------
export function Screen({ children, scroll = true, padded = true, edges = ['top'], refresh, footer }: {
    children: ReactNode; scroll?: boolean; padded?: boolean; edges?: ('top' | 'bottom')[]; refresh?: ReactNode; footer?: ReactNode;
}) {
    const c = useColors();
    const body = scroll
        ? <ScrollView contentContainerStyle={[padded && { padding: 16, gap: 14 }, { paddingBottom: 40 }]} keyboardShouldPersistTaps="handled" refreshControl={refresh as never}>{children}</ScrollView>
        : <View style={[{ flex: 1 }, padded && { padding: 16, gap: 14 }]}>{children}</View>;
    return (
        <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: c.bg }}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                {body}
                {footer}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// Yığındaki ekranlar: üst başlık + içerik.
export function Page({ title, right, children, scroll = true, padded = true, footer, refresh, raw }: { title: string; right?: ReactNode; children: ReactNode; scroll?: boolean; padded?: boolean; footer?: ReactNode; refresh?: ReactNode; raw?: boolean }) {
    const c = useColors();
    return <View style={{ flex: 1, backgroundColor: c.bg }}><Header title={title} right={right} raw={raw} /><Screen edges={['bottom']} scroll={scroll} padded={padded} footer={footer} refresh={refresh}>{children}</Screen></View>;
}

// Üst başlık: geri düğmesi + başlık (yığındaki ekranlar için).
export function Header({ title, right, back = true, raw }: { title: string; right?: ReactNode; back?: boolean; raw?: boolean }) {
    const c = useColors(); const t = useT(); const insets = useSafeAreaInsets();
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingBottom: 6, paddingTop: 6 + insets.top, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.line, backgroundColor: c.panel }}>
            {back ? <IconButton label="Geri" onPress={goBack}><Chevron dir="left" color={c.ink} /></IconButton> : <View style={{ width: 8 }} />}
            <Text accessibilityRole="header" style={{ flex: 1, fontSize: 17, fontWeight: '800', color: c.ink }} numberOfLines={1}>{raw ? title : t(title)}</Text>
            {right}
        </View>
    );
}

export function Card({ children, style, padded = true }: { children: ReactNode; style?: ViewStyle; padded?: boolean }) {
    const c = useColors();
    return <View style={[{ backgroundColor: c.panel, borderRadius: radius.l, borderWidth: StyleSheet.hairlineWidth, borderColor: c.line }, padded && { padding: 14, gap: 10 }, style]}>{children}</View>;
}

// ---------- Düğmeler ----------
type ButtonKind = 'primary' | 'accent' | 'secondary' | 'danger' | 'plain';
export function Button({ title, onPress, kind = 'primary', disabled, busy, icon, small, full = true, raw }: {
    title: string; onPress?: () => void; kind?: ButtonKind; disabled?: boolean; busy?: boolean; icon?: ReactNode; small?: boolean; full?: boolean; raw?: boolean;
}) {
    const c = useColors(); const t = useT();
    const bg = { primary: c.green, accent: c.accent, secondary: c.panel, danger: c.dangerSoft, plain: 'transparent' }[kind];
    const fg = { primary: c.onGreen, accent: '#FFFFFF', secondary: c.green2, danger: c.danger, plain: c.green2 }[kind];
    return (
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} onPress={onPress}
            style={({ pressed }) => [{
                minHeight: small ? 38 : 48, paddingHorizontal: small ? 12 : 16, borderRadius: radius.m, backgroundColor: bg,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: full ? 'stretch' : 'flex-start',
                borderWidth: kind === 'secondary' ? 1 : 0, borderColor: c.line, opacity: disabled ? 0.5 : pressed ? 0.85 : 1
            }]}>
            {busy ? <Spinner size={18} color={fg} /> : icon}
            <Text style={{ color: fg, fontWeight: '800', fontSize: small ? 14 : 15.5 }}>{raw ? title : t(title)}</Text>
        </Pressable>
    );
}

export function IconButton({ label, onPress, children, size = 40, badge }: { label: string; onPress?: () => void; children: ReactNode; size?: number; badge?: number }) {
    const c = useColors(); const t = useT();
    return (
        <Pressable accessibilityRole="button" accessibilityLabel={t(label)} onPress={onPress} hitSlop={6}
            style={({ pressed }) => ({ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.greenSoft : 'transparent' })}>
            {children}
            {badge ? <View style={{ position: 'absolute', top: 2, right: 2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                <Text style={{ color: '#fff', fontSize: 10.5, fontWeight: '900' }}>{badge > 99 ? '99+' : badge}</Text>
            </View> : null}
        </Pressable>
    );
}

export function Chip({ label, active, onPress, icon, raw, onRemove }: { label: string; active?: boolean; onPress?: () => void; icon?: ReactNode; raw?: boolean; onRemove?: () => void }) {
    const c = useColors(); const t = useT();
    const text = raw ? label : t(label);
    return (
        <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress ?? onRemove}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 12, paddingRight: onRemove ? 4 : 12, height: 36, borderRadius: radius.pill, borderWidth: 1, borderColor: active ? c.green2 : c.line, backgroundColor: active ? c.greenSoft : c.panel }}>
            {icon}
            <Text style={{ color: active ? c.green2 : c.ink, fontWeight: active ? '800' : '600', fontSize: 13.5 }}>{text}</Text>
            {onRemove ? <ClearButton label={t('Kaldır') + ': ' + text} onPress={onRemove} size={26} /> : null}
        </Pressable>
    );
}

// Seçimi kaldıran küçük yuvarlak × düğmesi (filtre etiketleri ve seçim kutuları).
export function ClearButton({ label, onPress, size = 28 }: { label: string; onPress: () => void; size?: number }) {
    const c = useColors();
    return (
        <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={8} onPress={onPress}
            style={({ pressed }) => ({ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.line : c.bg })}>
            <Svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24"><Path d="M6 6l12 12M18 6L6 18" stroke={c.muted} strokeWidth={2.6} strokeLinecap="round" /></Svg>
        </Pressable>
    );
}

export function Tag({ label, tone = 'green', raw }: { label: string; tone?: 'green' | 'accent' | 'muted' | 'danger'; raw?: boolean }) {
    const c = useColors(); const t = useT();
    const map = { green: [c.greenSoft, c.green2], accent: ['#FFF1E6', c.accentDark], muted: [c.bg, c.muted], danger: [c.dangerSoft, c.danger] } as const;
    const [bg, fg] = map[tone];
    return <View style={{ backgroundColor: bg, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'flex-start' }}><Text style={{ color: fg, fontSize: 12, fontWeight: '700' }}>{raw ? label : t(label)}</Text></View>;
}

// ---------- Form ----------
// iOS sayı klavyesinde "Bitti" tuşu yoktur; her alanın üstünde "Sonraki" ve "Bitti" düğmeli bir çubuk çıkar.
// Ekrandaki alanlar açılış sırasına göre kaydedilir, "Sonraki" bir sonraki alana geçer (son alanda klavyeyi kapatır).
export const KEYBOARD_BAR_ID = 'hasadim-klavye';
type InputNode = ComponentRef<typeof TextInput>;
const fieldOrder: RefObject<InputNode | null>[] = [];
export function focusNextField() {
    const current = TextInput.State.currentlyFocusedInput?.();
    const live = fieldOrder.filter(r => r.current);
    const i = live.findIndex(r => (r.current as unknown) === (current as unknown));
    const next = i >= 0 ? live[i + 1] : undefined;
    if (next?.current) next.current.focus(); else Keyboard.dismiss();
}
export function KeyboardBar() {
    const c = useColors(); const t = useT();
    if (Platform.OS !== 'ios') return null;
    return (
        <InputAccessoryView nativeID={KEYBOARD_BAR_ID} backgroundColor={c.panel}>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 44, borderTopWidth: StyleSheet.hairlineWidth, borderColor: c.line }}>
                <Pressable onPress={focusNextField} accessibilityRole="button" style={{ paddingHorizontal: 14, paddingVertical: 8 }}><Text style={{ color: c.green2, fontSize: 16, fontWeight: '600' }}>{t('Sonraki')}</Text></Pressable>
                <Pressable onPress={() => Keyboard.dismiss()} accessibilityRole="button" style={{ paddingHorizontal: 14, paddingVertical: 8 }}><Text style={{ color: c.green2, fontSize: 16, fontWeight: '800' }}>{t('Bitti')}</Text></Pressable>
            </View>
        </InputAccessoryView>
    );
}

export function Field({ label, hint, error, style, ref, ...input }: TextInputProps & { label: string; hint?: string; error?: string | null; ref?: Ref<InputNode> }) {
    const c = useColors(); const t = useT();
    const [focus, setFocus] = useState(false);
    const own = useRef<InputNode | null>(null);
    useEffect(() => { fieldOrder.push(own); return () => { const i = fieldOrder.indexOf(own); if (i >= 0) fieldOrder.splice(i, 1); }; }, []);
    const setRef = (node: InputNode | null) => {
        own.current = node;
        if (typeof ref === 'function') ref(node); else if (ref) (ref as RefObject<InputNode | null>).current = node;
    };
    return (
        <View style={{ gap: 5 }}>
            <Text style={{ color: c.ink, fontWeight: '700', fontSize: 13.5 }}>{t(label)}</Text>
            <TextInput ref={setRef} placeholderTextColor={c.muted} accessibilityLabel={t(label)}
                inputAccessoryViewID={Platform.OS === 'ios' ? KEYBOARD_BAR_ID : undefined}
                returnKeyType={input.multiline ? 'default' : 'next'}
                submitBehavior={input.multiline ? 'newline' : 'submit'}
                onSubmitEditing={input.multiline ? undefined : () => focusNextField()}
                {...input}
                placeholder={input.placeholder ? t(input.placeholder) : undefined}
                onFocus={e => { setFocus(true); input.onFocus?.(e); }} onBlur={e => { setFocus(false); input.onBlur?.(e); }}
                style={[{ minHeight: 46, borderRadius: radius.m, borderWidth: focus ? 2 : 1, borderColor: error ? c.danger : focus ? c.green2 : c.line, paddingHorizontal: 12, paddingVertical: input.multiline ? 10 : 0, color: c.ink, backgroundColor: c.input, fontSize: 15.5, textAlignVertical: input.multiline ? 'top' : 'center' }, style]} />
            {error ? <Text style={{ color: c.danger, fontSize: 12.5 }}>{t(error)}</Text> : hint ? <Text style={{ color: c.muted, fontSize: 12.5 }}>{t(hint)}</Text> : null}
        </View>
    );
}

export function SwitchRow({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
    const c = useColors();
    return (
        <Pressable onPress={() => onChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: value }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
            <View style={{ flex: 1, gap: 2 }}><Txt weight="700">{label}</Txt>{hint ? <Txt muted size={13}>{hint}</Txt> : null}</View>
            <Switch value={value} onValueChange={onChange} trackColor={{ true: c.green2, false: c.line }} thumbColor="#fff" />
        </Pressable>
    );
}

// Arama yapılabilir seçim listesi (il, ilçe, ürün, çeşit…).
// openSignal: değeri arttıkça liste kendiliğinden açılır (ör. il seçilince ilçe listesi).
export function Select({ label, value, options, onChange, placeholder = 'Seç', disabled, allowEmpty, emptyLabel = 'Hepsi', raw = true, openSignal = 0 }: {
    label: string; value: string; options: (string | [string, string])[]; onChange: (v: string) => void; placeholder?: string; disabled?: boolean; allowEmpty?: boolean; emptyLabel?: string; raw?: boolean; openSignal?: number;
}) {
    const c = useColors(); const t = useT();
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState('');
    useEffect(() => { if (openSignal > 0 && !disabled) { Keyboard.dismiss(); setQ(''); setOpen(true); } }, [openSignal]); // eslint-disable-line react-hooks/exhaustive-deps
    const list = useMemo(() => options.map(o => (Array.isArray(o) ? o : [o, o]) as [string, string]), [options]);
    const shown = useMemo(() => {
        const n = q.trim().toLocaleLowerCase('tr');
        const items = n ? list.filter(([, l]) => l.toLocaleLowerCase('tr').includes(n)) : list;
        return allowEmpty && !n ? [['', emptyLabel] as [string, string], ...items] : items;
    }, [list, q, allowEmpty, emptyLabel]);
    const current = list.find(([v]) => v === value)?.[1] ?? (allowEmpty && !value && !disabled ? t(emptyLabel) : undefined);
    const insets = useSafeAreaInsets();
    return (
        <View style={{ gap: 5 }}>
            <Text style={{ color: c.ink, fontWeight: '700', fontSize: 13.5 }}>{t(label)}</Text>
            <Pressable disabled={disabled} accessibilityRole="button" accessibilityLabel={t(label) + ': ' + (current ?? t(placeholder))} onPress={() => { Keyboard.dismiss(); setQ(''); setOpen(true); }}
                style={{ minHeight: 46, borderRadius: radius.m, borderWidth: 1, borderColor: c.line, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: disabled ? c.bg : c.input, opacity: disabled ? 0.6 : 1 }}>
                <Text style={{ flex: 1, color: current ? c.ink : c.muted, fontSize: 15.5 }} numberOfLines={1}>{current ? (raw ? current : t(current)) : t(placeholder)}</Text>
                {allowEmpty && value && !disabled ? <View style={{ marginRight: 6 }}><ClearButton label={t('Seçimi kaldır') + ': ' + t(label)} onPress={() => onChange('')} /></View> : null}
                <Chevron dir="down" color={c.muted} />
            </Pressable>
            <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)} presentationStyle="pageSheet">
                <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: Platform.OS === 'android' ? insets.top : 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.line }}>
                        <Text style={{ flex: 1, fontSize: 17, fontWeight: '800', color: c.ink }}>{t(label)}</Text>
                        <Button title="Kapat" kind="plain" small full={false} onPress={() => setOpen(false)} />
                    </View>
                    {list.length > 8 ? <View style={{ padding: 12 }}><TextInput autoFocus value={q} onChangeText={setQ} placeholder={t('Ara')} placeholderTextColor={c.muted}
                        style={{ height: 44, borderRadius: radius.m, borderWidth: 1, borderColor: c.line, paddingHorizontal: 12, color: c.ink, backgroundColor: c.input }} /></View> : null}
                    <FlatList data={shown} keyExtractor={([v]) => v || '__all'} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
                        renderItem={({ item: [v, l] }) => (
                            <Pressable onPress={() => { onChange(v); setOpen(false); }} style={({ pressed }) => ({ paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: pressed ? c.greenSoft : 'transparent', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.line })}>
                                <Text style={{ flex: 1, color: c.ink, fontSize: 16, fontWeight: v === value ? '800' : '400' }}>{raw && v ? l : t(l)}</Text>
                                {v === value ? <Check color={c.green2} /> : null}
                            </Pressable>
                        )} />
                </View>
            </Modal>
        </View>
    );
}

export function Segmented({ value, options, onChange }: { value: string; options: [string, string][]; onChange: (v: string) => void }) {
    const c = useColors(); const t = useT();
    return (
        <View accessibilityRole="tablist" style={{ flexDirection: 'row', backgroundColor: c.greenSoft, borderRadius: radius.m, padding: 3 }}>
            {options.map(([v, l]) => (
                <Pressable key={v} accessibilityRole="tab" accessibilityState={{ selected: v === value }} onPress={() => onChange(v)}
                    style={{ flex: 1, height: 38, borderRadius: radius.s + 2, alignItems: 'center', justifyContent: 'center', backgroundColor: v === value ? c.panel : 'transparent' }}>
                    <Text style={{ color: v === value ? c.green2 : c.muted, fontWeight: '800', fontSize: 13.5 }}>{t(l)}</Text>
                </Pressable>
            ))}
        </View>
    );
}

// Menü satırı (Hesabım, Ayarlar).
export function Row({ title, subtitle, icon, onPress, right, danger, raw }: { title: string; subtitle?: string; icon?: ReactNode; onPress?: () => void; right?: ReactNode; danger?: boolean; raw?: boolean }) {
    const c = useColors(); const t = useT();
    return (
        <Pressable onPress={onPress} accessibilityRole={onPress ? 'button' : undefined} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: pressed ? c.greenSoft : 'transparent' })}>
            {icon ? <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: danger ? c.dangerSoft : c.greenSoft, alignItems: 'center', justifyContent: 'center' }}>{icon}</View> : null}
            <View style={{ flex: 1, gap: 1 }}>
                <Text style={{ color: danger ? c.danger : c.ink, fontWeight: '700', fontSize: 15.5 }}>{raw ? title : t(title)}</Text>
                {subtitle ? <Text style={{ color: c.muted, fontSize: 13 }} numberOfLines={2}>{raw ? subtitle : t(subtitle)}</Text> : null}
            </View>
            {right ?? (onPress ? <Chevron dir="right" color={c.muted} /> : null)}
        </Pressable>
    );
}

export function Divider() { const c = useColors(); return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.line, marginLeft: 62 }} />; }

// ---------- Durumlar ----------
// Hasadım yaprağı: dönen altın halka ve sallanan yaprak (web'deki yükleme ekranıyla aynı).
export function Spinner({ size = 34, color }: { size?: number; color?: string }) {
    const c = useColors();
    const spin = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: native }));
        loop.start();
        return () => loop.stop();
    }, [spin]);
    const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    return (
        <View style={{ width: size, height: size }} accessibilityLabel="Yükleniyor" accessibilityRole="progressbar">
            <Svg width={size} height={size} viewBox="0 0 80 80" style={StyleSheet.absoluteFill}>
                <Circle cx={40} cy={40} r={36} stroke={c.line} strokeWidth={5} fill="none" />
                <G>
                    <Path d="M27 58C24 40 32 24 55 18c2 22-8 37-28 40Z" fill={color ?? c.green2} />
                    <Path d="M28 56C34 42 41 32 51 23" stroke={c.gold} strokeWidth={3} strokeLinecap="round" fill="none" />
                </G>
            </Svg>
            <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate }] }]}>
                <Svg width={size} height={size} viewBox="0 0 80 80">
                    <Path d="M40 4 A36 36 0 0 1 72 22" stroke={c.gold} strokeWidth={5} strokeLinecap="round" fill="none" />
                </Svg>
            </Animated.View>
        </View>
    );
}

export function Loading({ text = 'Yükleniyor…' }: { text?: string }) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 30 }}><Spinner size={52} /><Txt muted>{text}</Txt></View>;
}

export function Empty({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
    return (
        <View style={{ alignItems: 'center', gap: 8, paddingVertical: 36, paddingHorizontal: 20 }}>
            <Svg width={56} height={56} viewBox="0 0 80 80"><Circle cx={40} cy={40} r={36} fill="none" stroke="#9db3a2" strokeWidth={3} strokeDasharray="6 7" /><Path d="M27 58C24 40 32 24 55 18c2 22-8 37-28 40Z" fill="#9db3a2" /></Svg>
            <Txt weight="800" size={16.5} center>{title}</Txt>
            {text ? <Txt muted center>{text}</Txt> : null}
            {action}
        </View>
    );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
    const c = useColors();
    return (
        <View accessibilityRole="alert" style={{ backgroundColor: c.dangerSoft, borderRadius: radius.m, padding: 12, gap: 8 }}>
            <Txt color={c.danger} weight="700">{message}</Txt>
            {onRetry ? <Button title="Tekrar dene" kind="secondary" small full={false} onPress={onRetry} /> : null}
        </View>
    );
}

export function Notice({ message, tone = 'green' }: { message: string; tone?: 'green' | 'danger' }) {
    const c = useColors();
    return <View accessibilityRole="alert" style={{ backgroundColor: tone === 'green' ? c.greenSoft : c.dangerSoft, borderRadius: radius.m, padding: 12 }}><Txt color={tone === 'green' ? c.green2 : c.danger} weight="700">{message}</Txt></View>;
}

// Kısa süreli bildirim balonu.
let showToast: ((text: string) => void) | null = null;
export const toast = (text: string) => showToast?.(text);
export function ToastHost() {
    const t = useT(); const insets = useSafeAreaInsets();
    const [text, setText] = useState<string | null>(null);
    const opacity = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        showToast = value => {
            setText(value);
            Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: native }).start();
            clearTimeout(timer);
            timer = setTimeout(() => Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: native }).start(() => setText(null)), 3200);
        };
        return () => { showToast = null; clearTimeout(timer); };
    }, [opacity]);
    if (!text) return null;
    return (
        <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 84, opacity, alignItems: 'center' }}>
            <View accessibilityLiveRegion="polite" style={{ backgroundColor: '#1D2A22', paddingHorizontal: 16, paddingVertical: 12, borderRadius: radius.m, maxWidth: 480 }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{t(text)}</Text>
            </View>
        </Animated.View>
    );
}

// ---------- Küçük simgeler ----------
export function Chevron({ dir, color, size = 20 }: { dir: 'left' | 'right' | 'down' | 'up'; color: string; size?: number }) {
    const d = { left: 'M15 5l-7 7 7 7', right: 'M9 5l7 7-7 7', down: 'M5 9l7 7 7-7', up: 'M5 15l7-7 7 7' }[dir];
    return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d={d} stroke={color} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}
export function Check({ color, size = 20 }: { color: string; size?: number }) {
    return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M5 12.5l4.5 4.5L19 7.5" stroke={color} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

// Giriş gerektiren ekranlarda gösterilir.
export function SignInRequired({ text = 'Bu işlem için giriş yapmalısın.' }: { text?: string }) {
    return <Empty title="Giriş yap" text={text} action={<View style={{ width: 220, marginTop: 8 }}><Button title="Giriş yap" onPress={() => router.push('/giris')} /></View>} />;
}

export function useRequireUser() {
    const { user, ready } = useApp();
    return { user, ready };
}

export type { Colors };

// Alttan açılan pencere (teklif, şikâyet, onay).
// Karartı yerinde solarak gelir; yalnızca panel aşağıdan kayar (karartı panelle birlikte inip kalkmaz).
export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: ReactNode }) {
    const c = useColors(); const t = useT(); const insets = useSafeAreaInsets();
    const [mounted, setMounted] = useState(visible);
    const fade = useRef(new Animated.Value(0)).current;
    const slide = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        if (visible) {
            setMounted(true);
            Animated.parallel([
                Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: native }),
                Animated.timing(slide, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: native })
            ]).start();
        } else if (mounted) {
            Animated.parallel([
                Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: native }),
                Animated.timing(slide, { toValue: 1, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: native })
            ]).start(({ finished }) => { if (finished) setMounted(false); });
        }
    }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps
    if (!mounted) return null;
    return (
        <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
                <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#0008', opacity: fade }]}>
                    <Pressable accessibilityLabel={t('Kapat')} onPress={onClose} style={StyleSheet.absoluteFill} />
                </Animated.View>
                <Animated.View style={{ backgroundColor: c.panel, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, paddingBottom: insets.bottom + 18, gap: 12, maxHeight: '90%', transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [0, 600] }) }] }}>
                    <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: c.line }} />
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text accessibilityRole="header" style={{ flex: 1, fontSize: 18, fontWeight: '800', color: c.ink }}>{t(title)}</Text>
                        <IconButton label="Kapat" onPress={onClose}><Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M6 6l12 12M18 6L6 18" stroke={c.muted} strokeWidth={2.4} strokeLinecap="round" /></Svg></IconButton>
                    </View>
                    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12 }}>{children}</ScrollView>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

// Onay penceresi (silme, çıkış, engelleme).
export function useConfirm() {
    const [state, setState] = useState<{ title: string; text: string; ok: string; danger?: boolean; resolve: (v: boolean) => void } | null>(null);
    const [open, setOpen] = useState(false);
    const ask = (title: string, text: string, ok = 'Tamam', danger = false) => new Promise<boolean>(resolve => { setState({ title, text, ok, danger, resolve }); setOpen(true); });
    // Metin, kapanma animasyonu bitene kadar ekranda kalır.
    const close = (v: boolean) => { if (open) state?.resolve(v); setOpen(false); };
    const node = (
        <Sheet visible={open} onClose={() => close(false)} title={state?.title ?? ''}>
            <Txt>{state?.text ?? ''}</Txt>
            <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}><Button title="Vazgeç" kind="secondary" onPress={() => close(false)} /></View>
                <View style={{ flex: 1 }}><Button title={state?.ok ?? 'Tamam'} kind={state?.danger ? 'danger' : 'primary'} onPress={() => close(true)} /></View>
            </View>
        </Sheet>
    );
    return { ask, node };
}
