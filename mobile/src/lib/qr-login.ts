// Bilgisayardaki Hasadım giriş sayfasında gösterilen QR'ın içeriği:
//   https://<site>/html/qr.html#c=<43 karakterlik tek kullanımlık kod>
// Yalnızca bu biçim kabul edilir; başka QR'lar (bağlantılar, metinler) yok sayılır.
export function parseQrLogin(data: string): string | null {
    const text = data.trim();
    const m = /^https?:\/\/[^/\s]+\/html\/qr\.html#c=([A-Za-z0-9_-]{43})$/.exec(text);
    return m ? m[1] : null;
}

// QR'ın hangi siteden geldiği (onay ekranında gösterilir).
export function qrHost(data: string): string | null {
    try { return new URL(data.trim()).host; } catch { return null; }
}
