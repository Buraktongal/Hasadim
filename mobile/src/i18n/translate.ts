import { HasadimEn } from './en';
import { extraEn, extraPatterns } from './extra';

// Türkçe metin → İngilizce. Web uygulamasıyla aynı sözlük ve kalıplar kullanılır
// (src/i18n/en.ts web'den üretilir); yalnızca mobile özgü metinler extra.ts içindedir.
const words: Record<string, string> = { ...HasadimEn.words, ...extraEn };

export function translate(text: string, lang: string): string {
    if (lang !== 'en' || !text) return text;
    const t = text.replace(/\s+/g, ' ').trim();
    if (Object.hasOwn(words, t)) return words[t]!;
    for (const [re, out] of extraPatterns) if (re.test(t)) return t.replace(re, out).replace('/ balya', '/ bale');
    for (const [re, out] of HasadimEn.patterns) {
        const m = t.match(re);
        if (!m) continue;
        // Kalıp işlevi null döndürürse bu metin o kalıpla çevrilmez; sıradaki kalıba geçilir.
        const result = typeof out === 'function' ? out(m, s => translate(s, lang)) : t.replace(re, out);
        if (result != null) return result;
    }
    return text;
}
