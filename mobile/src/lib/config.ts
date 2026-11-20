import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { checkBaseUrl } from './url-policy';

export { checkBaseUrl };

// Sunucu adresi: önce EXPO_PUBLIC_API_URL ortam değişkeni, yoksa app.json → extra.apiBaseUrl.
// Bu adres web sitesinin adresidir (Hasadim.Web); API istekleri oradan sunucuya iletilir.
const extra = (Constants.expoConfig?.extra ?? {}) as { apiBaseUrl?: string; googleClientIds?: Record<string, string> };
const raw = (process.env.EXPO_PUBLIC_API_URL || extra.apiBaseUrl || '').trim().replace(/\/+$/, '');

export const API_BASE = raw;
// Web önizlemesi yalnızca geliştirme amaçlıdır (yayınlanan uygulama iOS/Android); orada da yalnızca yerel adreslere http izni var.
export const API_BASE_ERROR = raw ? checkBaseUrl(raw, __DEV__ || Platform.OS === 'web') : 'Sunucu adresi ayarlanmamış (EXPO_PUBLIC_API_URL).';
export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
export const USER_AGENT = `HasadimMobile/${APP_VERSION} (${Platform.OS === 'ios' ? 'iPhone; iOS' : Platform.OS === 'android' ? 'Android' : 'Web'} ${String(Platform.Version ?? '')})`;
export const GOOGLE_CLIENT_IDS = extra.googleClientIds ?? {};
