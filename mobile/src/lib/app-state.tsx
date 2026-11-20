import * as Localization from 'expo-localization';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useColorScheme } from 'react-native';
import { translate } from '../i18n/translate';
import { api, clearTokens, get, hasStoredSession, onSignedOut, post, put, refreshSession, saveTokens } from './api';
import { prefGet, prefSet } from './storage';
import { palettes, type Colors } from './theme';
import type { Settings, User } from './types';

type ThemeChoice = 'system' | 'light' | 'dark';
type Lang = 'tr' | 'en';

interface AppState {
    ready: boolean;
    user: User | null;
    colors: Colors;
    dark: boolean;
    theme: ThemeChoice;
    lang: Lang;
    appLock: boolean;
    t: (text: string) => string;
    setTheme: (v: ThemeChoice) => void;
    setLang: (v: Lang) => void;
    setAppLock: (v: boolean) => void;
    signedIn: (tokens: TokenResponse) => Promise<void>;
    signOut: (message?: string) => Promise<void>;
    reloadUser: () => Promise<void>;
    notice: string | null;
    serverSettings: Settings | null;
    saveSettings: (patch: Partial<Settings>) => Promise<void>;
    setNotice: (v: string | null) => void;
}

export interface TokenResponse { accessToken: string; accessExpiresAt: string; refreshToken: string; refreshExpiresAt: string; user: User }

const Ctx = createContext<AppState | null>(null);

export function useApp() {
    const v = useContext(Ctx);
    if (!v) throw new Error('AppProvider eksik.');
    return v;
}
export const useT = () => useApp().t;
export const useColors = () => useApp().colors;

export function AppProvider({ children }: { children: ReactNode }) {
    const system = useColorScheme();
    const [ready, setReady] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [theme, setThemeState] = useState<ThemeChoice>('system');
    const deviceLang: Lang = Localization.getLocales()[0]?.languageCode === 'tr' ? 'tr' : 'en';
    const [lang, setLangState] = useState<Lang>(deviceLang);
    const [appLock, setAppLockState] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const settings = useRef<Settings | null>(null);
    const [serverSettings, setServerSettings] = useState<Settings | null>(null);

    const dark = theme === 'dark' || (theme === 'system' && system === 'dark');
    const colors = dark ? palettes.dark : palettes.light;
    const t = useCallback((text: string) => translate(text, lang), [lang]);

    // Sunucudaki tercihleri uygula (başka cihazda yapılan değişiklik buraya da gelir).
    const syncSettings = useCallback(async () => {
        try {
            const s = await get<Settings>('/api/me/settings');
            settings.current = s; setServerSettings(s);
            setThemeState(s.theme); setLangState(s.language);
            void prefSet('hasadim.theme', s.theme); void prefSet('hasadim.lang', s.language);
        } catch { /* tercih alınamazsa yereldekiler kullanılır */ }
    }, []);

    const saveSettings = useCallback(async (patch: Partial<Settings>) => {
        if (!settings.current) return;
        const previous = settings.current;
        settings.current = { ...previous, ...patch }; setServerSettings(settings.current);
        try { await put('/api/me/settings', settings.current); }
        catch (e) { settings.current = previous; setServerSettings(previous); throw e; }
    }, []);
    const pushSettings = useCallback((patch: Partial<Settings>) => { void saveSettings(patch).catch(() => undefined); }, [saveSettings]);

    const reloadUser = useCallback(async () => {
        try { setUser(await get<User | null>('/api/account/me')); } catch { /* ağ hatası: mevcut durum korunur */ }
    }, []);

    useEffect(() => {
        (async () => {
            const [th, lg, lock] = await Promise.all([prefGet('hasadim.theme'), prefGet('hasadim.lang'), prefGet('hasadim.applock')]);
            if (th === 'light' || th === 'dark' || th === 'system') setThemeState(th);
            if (lg === 'tr' || lg === 'en') setLangState(lg);
            setAppLockState(lock === '1');
            if (await hasStoredSession() && await refreshSession()) {
                await reloadUser();
                void syncSettings();
            }
            setReady(true);
        })();
    }, [reloadUser, syncSettings]);

    useEffect(() => onSignedOut(reason => {
        setUser(null); settings.current = null; setServerSettings(null);
        if (reason) setNotice(reason);
    }), []);

    const value = useMemo<AppState>(() => ({
        ready, user, colors, dark, theme, lang, appLock, t, notice, setNotice, serverSettings, saveSettings,
        setTheme: v => { setThemeState(v); void prefSet('hasadim.theme', v); pushSettings({ theme: v }); },
        setLang: v => { setLangState(v); void prefSet('hasadim.lang', v); pushSettings({ language: v }); },
        setAppLock: v => { setAppLockState(v); void prefSet('hasadim.applock', v ? '1' : '0'); },
        signedIn: async r => { await saveTokens(r); setUser(r.user); void syncSettings(); },
        signOut: async message => {
            try { await post('/api/mobile/auth/logout'); } catch { /* sunucuya ulaşılamasa da yerel oturum silinir */ }
            await clearTokens(); setUser(null); settings.current = null; setServerSettings(null);
            if (message) setNotice(message);
        },
        reloadUser
    }), [ready, user, colors, dark, theme, lang, appLock, t, notice, serverSettings, saveSettings, pushSettings, syncSettings, reloadUser]);

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export { api };
