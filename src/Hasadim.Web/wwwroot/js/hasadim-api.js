'use strict';

// Ortak API çağrısı: CSRF anahtarı, JSON gövde ve Türkçe hata mesajları.
// Yeni sayfalar (teklifler, bildirimler, ayarlar, harita) bunu kullanır.
window.HasadimApi = (() => {
    let csrf = '';
    async function token() {
        const r = await fetch('/api/csrf');
        if (!r.ok) throw Error('Oturum başlatılamadı.');
        csrf = (await r.json()).token;
    }
    async function call(path, method = 'GET', data) {
        const headers = {};
        if (method !== 'GET') { if (!csrf) await token(); headers['X-CSRF-TOKEN'] = csrf; }
        let body;
        if (data !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(data); }
        let r;
        try { r = await fetch(path, { method, headers, body }); }
        catch { throw Error('Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.'); }
        const text = await r.text();
        let result = null;
        try { result = text ? JSON.parse(text) : null; } catch { result = null; }
        if (!r.ok) {
            const message = result?.mesaj || (result?.errors ? Object.values(result.errors).flat().join(' ') : null);
            const error = Error(message || (r.status === 401 ? 'Devam etmek için giriş yap.' : r.status === 403 ? 'Bu işlem için yetkin yok.'
                : r.status === 404 ? 'Kayıt bulunamadı.' : r.status === 429 ? 'Çok fazla istek. Bir dakika sonra tekrar dene.' : 'İşlem tamamlanamadı.'));
            error.status = r.status;
            throw error;
        }
        return result;
    }
    call.loginUrl = () => '/html/giris.html?returnUrl=' + encodeURIComponent(location.pathname + location.search);
    return call;
})();
