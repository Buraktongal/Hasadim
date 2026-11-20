import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Güvenli depolama: iOS Anahtar Zinciri / Android Keystore.
// WHEN_UNLOCKED_THIS_DEVICE_ONLY: cihaz kilitliyken okunamaz, yedeklerle başka cihaza taşınmaz.
// Web önizlemesi (yalnızca geliştirme; yayınlanan uygulama iOS/Android'dir): değerler sekme
// kapanınca silinen sessionStorage'da tutulur.
const session = typeof globalThis.sessionStorage !== 'undefined' ? globalThis.sessionStorage : null;
const memory = {
    get: (k: string) => { try { return session?.getItem(k) ?? undefined; } catch { return undefined; } },
    set: (k: string, v: string) => { try { session?.setItem(k, v); } catch { /* yok */ } },
    delete: (k: string) => { try { session?.removeItem(k); } catch { /* yok */ } }
};
const native = Platform.OS === 'ios' || Platform.OS === 'android';
const options: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

export async function secureGet(key: string): Promise<string | null> {
    if (!native) return memory.get(key) ?? null;
    try { return await SecureStore.getItemAsync(key, options); } catch { return null; }
}

export async function secureSet(key: string, value: string): Promise<void> {
    if (!native) { memory.set(key, value); return; }
    await SecureStore.setItemAsync(key, value, options);
}

export async function secureDelete(key: string): Promise<void> {
    if (!native) { memory.delete(key); return; }
    try { await SecureStore.deleteItemAsync(key, options); } catch { /* zaten yok */ }
}

// Gizli olmayan küçük tercihler (tema, dil, uygulama kilidi açık mı).
export const prefGet = secureGet;
export const prefSet = secureSet;
