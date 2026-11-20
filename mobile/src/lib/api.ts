import { API_BASE, API_BASE_ERROR, USER_AGENT } from './config';
import { askHuman, type HumanChallenge, humanPurpose, normalizeAnswer, solve } from './human';
import { secureDelete, secureGet, secureSet } from './storage';

// Sunucu istemcisi.
// - Yalnızca yapılandırılmış sunucuya ve yalnızca /api/ yollarına istek gönderilir; anahtar
//   başka bir adrese asla eklenmez.
// - Erişim anahtarı yalnızca bellekte, yenileme anahtarı güvenli depoda tutulur.
// - 401 alınınca anahtar bir kez (aynı anda tek istekle) yenilenir ve istek tekrarlanır.
// - Çerez gönderilmez (credentials: 'omit'); kimlik yalnızca Authorization başlığıyla taşınır.

const REFRESH_KEY = 'hasadim.refresh.v1';
const TIMEOUT_MS = 20000;

export class ApiError extends Error {
    constructor(public status: number, message: string, public code?: string) { super(message); }
}

type Tokens = { accessToken: string; accessExpiresAt: string; refreshToken: string; refreshExpiresAt: string };

let accessToken: string | null = null;
let accessExpires = 0;
let refreshing: Promise<boolean> | null = null;
const signedOutListeners = new Set<(reason?: string) => void>();

export function onSignedOut(listener: (reason?: string) => void) {
    signedOutListeners.add(listener);
    return () => { signedOutListeners.delete(listener); };
}

export async function saveTokens(t: Tokens) {
    accessToken = t.accessToken;
    accessExpires = Date.parse(t.accessExpiresAt) || Date.now() + 10 * 60_000;
    await secureSet(REFRESH_KEY, t.refreshToken);
}

export async function clearTokens() {
    accessToken = null;
    accessExpires = 0;
    await secureDelete(REFRESH_KEY);
}

export const hasStoredSession = async () => Boolean(await secureGet(REFRESH_KEY));
export const isSignedIn = () => Boolean(accessToken);

function url(path: string) {
    if (API_BASE_ERROR) throw new ApiError(0, API_BASE_ERROR);
    if (!/^\/api\/[A-Za-z0-9\-._~!$&'()*+,;=:@/?%]*$/.test(path) || path.includes('..')) throw new ApiError(0, 'Geçersiz istek adresi.');
    return API_BASE + path;
}

// Fotoğraf gibi korumalı dosyalar için: yalnızca kendi sunucumuzun /api/ adreslerine anahtar eklenir.
export function imageSource(path?: string | null) {
    if (!path) return undefined;
    if (/^\/(api|seed)\//.test(path) && !API_BASE_ERROR) {
        return { uri: API_BASE + path, headers: path.startsWith('/api/') && accessToken ? { Authorization: 'Bearer ' + accessToken } : undefined };
    }
    return undefined;
}

async function send(path: string, init: RequestInit & { json?: unknown; extra?: Record<string, string> }, auth: boolean) {
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'X-Hasadim-Client': 'mobile',
        'User-Agent': USER_AGENT,
        ...init.extra
    };
    let body = init.body;
    if (init.json !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(init.json); }
    if (auth && accessToken) headers.Authorization = 'Bearer ' + accessToken;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        return await fetch(url(path), { method: init.method ?? 'GET', headers, body, credentials: 'omit', signal: controller.signal });
    } catch (e) {
        if (e instanceof ApiError) throw e;
        throw new ApiError(0, controller.signal.aborted ? 'Sunucu yanıt vermedi. Bağlantını kontrol edip tekrar dene.' : 'Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.');
    } finally { clearTimeout(timer); }
}

async function readError(r: Response): Promise<ApiError> {
    let message = r.status === 429 ? 'Çok fazla istek gönderildi. Biraz bekleyip tekrar dene.'
        : r.status === 403 ? 'Bu işlem için yetkin yok.'
        : r.status === 404 ? 'Aranan kayıt bulunamadı.'
        : r.status >= 500 ? 'Sunucuda bir sorun oluştu. Daha sonra tekrar dene.'
        : 'İşlem tamamlanamadı.';
    let code: string | undefined;
    try {
        const data = await r.json();
        if (typeof data?.mesaj === 'string') message = data.mesaj;
        else if (data?.errors && typeof data.errors === 'object') {
            const first = Object.values(data.errors as Record<string, string[]>).flat()[0];
            if (typeof first === 'string') message = first;
        }
        if (typeof data?.code === 'string') code = data.code;
    } catch { /* gövde JSON değil */ }
    return new ApiError(r.status, message, code);
}

// Yenileme: aynı anda birden fazla istek 401 alırsa sunucuya tek yenileme isteği gider.
// (Aynı yenileme anahtarının iki kez kullanılması sunucuda saldırı olarak algılanır.)
export function refreshSession(): Promise<boolean> {
    if (!refreshing) refreshing = (async () => {
        try {
            const refreshToken = await secureGet(REFRESH_KEY);
            if (!refreshToken) return false;
            const r = await send('/api/mobile/auth/refresh', { method: 'POST', json: { refreshToken } }, false);
            if (!r.ok) {
                const error = await readError(r);
                if (r.status === 401 || r.status === 400) {
                    await clearTokens();
                    signedOutListeners.forEach(l => l(error.code === 'token_reused' ? error.message : undefined));
                }
                return false;
            }
            await saveTokens(await r.json());
            return true;
        } catch { return false; }
        finally { refreshing = null; }
    })();
    return refreshing;
}

type ApiOptions = { method?: string; json?: unknown; body?: FormData; auth?: boolean };

// Korunan isteklerde (giriş, kayıt, SMS, şifre sıfırlama, ilan verme, geri bildirim) robot doğrulaması eklenir.
// Sunucu 428 döndürürse (bilet geçersiz, kod yanlış veya görsel kod gerekli) yeni biletle en fazla 3 kez tekrar denenir.
async function sendHuman(path: string, options: ApiOptions, auth: boolean, purpose: string): Promise<Response> {
    let message: string | null = null;
    for (let attempt = 0; attempt < 4; attempt++) {
        const challenge = async () => {
            const r = await send('/api/human/challenge?purpose=' + purpose, {}, auth);
            if (!r.ok) throw await readError(r);
            return (await r.json()) as HumanChallenge;
        };
        let c = await challenge();
        let answer = '';
        if (c.image) {
            let current = c;
            const typed = await askHuman(c.image, message, async () => { current = await challenge(); return current.image ?? ''; });
            if (typed === null) throw new ApiError(0, 'Güvenlik doğrulaması tamamlanmadı.', 'human_cancelled');
            c = current;
            answer = normalizeAnswer(typed);
        }
        const nonce = await solve(c.salt, c.difficulty);
        const extra: Record<string, string> = { 'X-Human-Token': c.token, 'X-Human-Nonce': String(nonce) };
        if (answer) extra['X-Human-Answer'] = answer;
        const r = await send(path, { method: options.method, json: options.json, body: options.body, extra }, auth);
        if (r.status !== 428) return r;
        message = (await readError(r)).message;
    }
    throw new ApiError(428, 'Güvenlik doğrulaması tamamlanamadı. Biraz sonra tekrar dene.', 'human_required');
}

export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
    const auth = options.auth !== false;
    const purpose = humanPurpose(options.method, path);
    const go = () => purpose ? sendHuman(path, options, auth, purpose) : send(path, { method: options.method, json: options.json, body: options.body }, auth);
    // Süresi dolmak üzere olan anahtarı istekten önce yenile.
    if (auth && accessToken && accessExpires - Date.now() < 60_000) await refreshSession();
    if (auth && !accessToken && (await secureGet(REFRESH_KEY))) await refreshSession();
    let r = await go();
    if (r.status === 401 && auth && accessToken !== null) {
        if (await refreshSession()) r = await go();
    }
    if (!r.ok) throw await readError(r);
    if (r.status === 204) return undefined as T;
    const text = await r.text();
    return (text ? JSON.parse(text) : undefined) as T;
}

export const get = <T>(path: string) => api<T>(path);
export const post = <T>(path: string, json?: unknown) => api<T>(path, { method: 'POST', json: json ?? {} });
export const put = <T>(path: string, json?: unknown) => api<T>(path, { method: 'PUT', json });
export const del = <T>(path: string) => api<T>(path, { method: 'DELETE' });
