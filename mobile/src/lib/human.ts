// Robot / insan doğrulaması (sunucu: HumanCheck + RequireHuman). Web'deki js/insan-dogrulama.js ile aynı kurallar.
// 1) /api/human/challenge'dan tek kullanımlık bilet alınır.
// 2) İş kanıtı cihazda çözülür (SHA-256; kullanıcı fark etmez).
// 3) Sunucu görsel kod isterse HumanHost penceresi kodu sorar.

export type HumanPurpose = 'login' | 'register' | 'phone' | 'forgot' | 'listing' | 'feedback';
export type HumanChallenge = { token: string; salt: string; difficulty: number; image: string | null };

const RULES: [RegExp, HumanPurpose][] = [
    [/^\/api\/mobile\/auth\/login$/, 'login'],
    [/^\/api\/account\/login$/, 'login'],
    [/^\/api\/account\/register$/, 'register'],
    [/^\/api\/account\/phone\/start$/, 'phone'],
    [/^\/api\/account\/(forgot-password|resend-confirmation)$/, 'forgot'],
    [/^\/api\/meyve-ilanlari\/with-photos$/, 'listing'],
    [/^\/api\/feedback$/, 'feedback']
];

export function humanPurpose(method: string | undefined, path: string): HumanPurpose | null {
    if ((method ?? 'GET').toUpperCase() !== 'POST') return null;
    const clean = path.split('?')[0];
    return RULES.find(([re]) => re.test(clean))?.[1] ?? null;
}

const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
const W = new Uint32Array(64);

// Yalnızca ASCII metin (tuz onaltılık, nonce sayı) için SHA-256; 8 adet 32 bitlik kelime döner.
export function sha256(text: string): number[] {
    const bytes = new Uint8Array(((text.length + 9 + 63) >> 6) << 6);
    for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i) & 0xff;
    bytes[text.length] = 0x80;
    const bits = text.length * 8;
    bytes[bytes.length - 4] = bits >>> 24; bytes[bytes.length - 3] = bits >>> 16; bytes[bytes.length - 2] = bits >>> 8; bytes[bytes.length - 1] = bits;
    let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a, h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
    for (let off = 0; off < bytes.length; off += 64) {
        for (let i = 0; i < 16; i++) W[i] = (bytes[off + i * 4] << 24) | (bytes[off + i * 4 + 1] << 16) | (bytes[off + i * 4 + 2] << 8) | bytes[off + i * 4 + 3];
        for (let i = 16; i < 64; i++) {
            const a = W[i - 15], b = W[i - 2];
            const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
            const s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
            W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0;
        }
        let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
        for (let i = 0; i < 64; i++) {
            const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
            const t1 = (h + S1 + ((e & f) ^ (~e & g)) + K[i] + W[i]) | 0;
            const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
            const t2 = (S0 + ((a & b) ^ (a & c) ^ (b & c))) | 0;
            h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
        }
        h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0; h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
    }
    return [h0, h1, h2, h3, h4, h5, h6, h7].map(x => x >>> 0);
}

export function leadingZeroBits(words: number[]): number {
    let n = 0;
    for (const w of words) { if (w === 0) { n += 32; continue; } return n + Math.clz32(w); }
    return n;
}

// Arayüzü kilitlememek için parça parça çözülür.
export async function solve(salt: string, difficulty: number): Promise<number> {
    let nonce = 0;
    for (;;) {
        const end = nonce + 3000;
        for (; nonce < end; nonce++) if (leadingZeroBits(sha256(salt + ':' + nonce)) >= difficulty) return nonce;
        await new Promise(r => setTimeout(r, 0));
    }
}

// Kullanıcının yazdığı kod: boşluksuz, büyük harf, yalnızca A-Z ve 0-9.
export const normalizeAnswer = (value: string) => value.toLocaleUpperCase('tr-TR').replace(/İ/g, 'I').replace(/[^A-Z0-9]/g, '');

// Görsel kod penceresi (HumanHost) kendini buraya bağlar.
export type HumanAsk = (svg: string, message: string | null, refresh: () => Promise<string>) => Promise<string | null>;
let asker: HumanAsk | null = null;
export function setHumanAsker(fn: HumanAsk | null) { asker = fn; }
export const askHuman: HumanAsk = (svg, message, refresh) => asker ? asker(svg, message, refresh) : Promise.resolve(null);
