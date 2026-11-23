import * as WebBrowser from 'expo-web-browser';
import { PUBLIC_WEB_URL } from './config';

export type LegalPage = 'kullanim-kosullari' | 'kvkk' | 'gizlilik' | 'cerez-politikasi' | 'iletisim';

// Yasal metinler web sitesinde tek yerde tutulur; uygulama içi tarayıcıda açılır.
export function openLegal(page: LegalPage) {
    return WebBrowser.openBrowserAsync(`${PUBLIC_WEB_URL}/html/${page}.html`).catch(() => undefined);
}
