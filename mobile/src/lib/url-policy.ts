// Yalnızca geliştirmede ve yalnızca yerel ağ adreslerinde şifresiz (http) bağlantıya izin verilir.
// Yayın sürümünde HTTPS zorunludur; aksi hâlde uygulama hiçbir istek göndermez.
const PRIVATE_HOST = /^(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/;

export function checkBaseUrl(url: string, dev: boolean): string | null {
    let parsed: URL;
    try { parsed = new URL(url); } catch { return 'Sunucu adresi geçersiz.'; }
    if (parsed.username || parsed.password) return 'Sunucu adresinde kullanıcı bilgisi olamaz.';
    if (parsed.pathname !== '/' && parsed.pathname !== '') return 'Sunucu adresi yalnızca alan adı olmalıdır.';
    if (parsed.protocol === 'https:') return null;
    if (parsed.protocol === 'http:' && dev && PRIVATE_HOST.test(parsed.hostname)) return null;
    return 'Güvenlik için sunucu adresi https:// ile başlamalıdır.';
}

