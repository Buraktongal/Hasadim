import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppLock } from '../components/AppLock';
import { HumanHost } from '../components/HumanHost';
import { KeyboardBar, Loading, ToastHost, toast } from '../components/ui';
import { AppProvider, useApp } from '../lib/app-state';

function Root() {
    const { ready, colors, dark, notice, setNotice } = useApp();
    useEffect(() => { if (notice) { toast(notice); setNotice(null); } }, [notice, setNotice]);
    const navTheme = {
        ...(dark ? DarkTheme : DefaultTheme),
        colors: { ...(dark ? DarkTheme : DefaultTheme).colors, background: colors.bg, card: colors.panel, text: colors.ink, border: colors.line, primary: colors.green2 }
    };
    if (!ready) return <View style={{ flex: 1, backgroundColor: colors.bg }}><Loading text="Hasat hazırlanıyor…" /></View>;
    return (
        <ThemeProvider value={navTheme}>
            <StatusBar style={dark ? 'light' : 'dark'} />
            <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.bg } }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="ilan-ver" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
                <Stack.Screen name="filtreler" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
                <Stack.Screen name="giris" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            </Stack>
            <HumanHost />
            <ToastHost />
            <KeyboardBar />
            <AppLock />
        </ThemeProvider>
    );
}

export default function Layout() {
    return <SafeAreaProvider><AppProvider><Root /></AppProvider></SafeAreaProvider>;
}
