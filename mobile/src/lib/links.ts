import { router } from 'expo-router';

// Bildirimlerdeki web bağlantılarını uygulama ekranlarına çevirir. Yalnızca bilinen sayfalar
// açılır; tanınmayan veya dış adresler yok sayılır (açık yönlendirme / kimlik avı riski yok).
const GUID = /^[0-9a-f-]{36}$/i;
export function openAppLink(link?: string | null) {
    if (!link || !link.startsWith('/') || link.startsWith('//')) return;
    const [path, query = ''] = link.split('?');
    const param = (k: string) => query.split('&').map(p => p.split('=')).find(([key]) => key === k)?.[1];
    switch (path) {
        case '/html/ilan.html': { const id = param('id'); if (id && GUID.test(id)) router.push({ pathname: '/ilan/[id]', params: { id } }); return; }
        case '/html/tekliflerim.html': router.push('/tekliflerim'); return;
        case '/html/hesabim.html': router.push('/guvenlik'); return;
        case '/html/kayitli-aramalar.html': router.push('/kayitli-aramalar'); return;
        case '/html/bildirimler.html': router.push('/bildirimler'); return;
        case '/': if (param('view') === 'messages') router.push('/mesajlar'); else router.push('/'); return;
        default: return;
    }
}
