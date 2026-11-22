import { prefGet, prefSet, secureDelete } from './storage';

// İlan verme taslağı: ekran yanlışlıkla kapatılırsa (aşağı kaydırma, geri tuşu) girilen bilgiler kaybolmaz.
// Bellekte tutulur; metin alanları ayrıca cihazda saklanır (uygulama kapanıp açılınca da geri gelir).
// Fotoğraflar yalnızca uygulama açıkken korunur (geçici dosyalar sistem tarafından silinebilir).
const KEY = 'hasadim.ilanTaslagi';
export type ListingDraft<F, P> = { form: F; step: number; photos: P[]; savedAt: number };
let memory: ListingDraft<unknown, unknown> | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

export async function loadDraft<F, P>(): Promise<ListingDraft<F, P> | null> {
    if (memory) return memory as ListingDraft<F, P>;
    try {
        const raw = await prefGet(KEY);
        if (!raw) return null;
        const d = JSON.parse(raw) as ListingDraft<F, P>;
        // Bir haftadan eski taslaklar atılır.
        if (!d || typeof d !== 'object' || Date.now() - d.savedAt > 7 * 864e5) { await secureDelete(KEY); return null; }
        return { ...d, photos: [] };
    } catch { return null; }
}

export function saveDraft<F, P>(draft: Omit<ListingDraft<F, P>, 'savedAt'>) {
    memory = { ...draft, savedAt: Date.now() };
    clearTimeout(timer);
    timer = setTimeout(() => {
        const { photos: _photos, ...rest } = memory ?? { photos: [] };
        if (memory) void prefSet(KEY, JSON.stringify({ ...rest, photos: [] })).catch(() => undefined);
    }, 600);
}

export function clearDraft() {
    memory = null;
    clearTimeout(timer);
    void secureDelete(KEY);
}
