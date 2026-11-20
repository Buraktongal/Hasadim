// Türkçe sayı, para ve tarih biçimleri (Intl'e bağımlı değil; her cihazda aynı sonuç).
import type { Listing } from './types';

function group(intPart: string) { return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

export function number(value: number, maxDecimals = 2): string {
    if (!Number.isFinite(value)) return '–';
    const negative = value < 0;
    const fixed = Math.abs(value).toFixed(maxDecimals);
    let [i, d = ''] = fixed.split('.');
    d = d.replace(/0+$/, '');
    return (negative ? '-' : '') + group(i) + (d ? ',' + d : '');
}

export function money(value: number, decimals = 2): string {
    if (!Number.isFinite(value)) return '–';
    const [i, d] = Math.abs(value).toFixed(decimals).split('.');
    return (value < 0 ? '-' : '') + '₺' + group(i) + (d ? ',' + d : '');
}

export function compact(value: number): string {
    if (value >= 1_000_000) return number(value / 1_000_000, 1) + ' Mn';
    if (value >= 10_000) return number(value / 1000, 0) + ' B';
    return number(value, value < 100 ? 2 : 0);
}

const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthNames = (lang: string) => (lang === 'en' ? MONTHS_EN : MONTHS_TR);

export function date(value?: string | null, lang = 'tr'): string {
    if (!value) return lang === 'en' ? 'Not specified' : 'Belirtilmedi';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return lang === 'en' ? 'Not specified' : 'Belirtilmedi';
    return lang === 'en' ? `${monthNames('en')[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}` : `${d.getDate()} ${MONTHS_TR[d.getMonth()]} ${d.getFullYear()}`;
}

export function shortDate(value?: string | null): string {
    if (!value) return '';
    const d = new Date(value);
    return [d.getDate(), d.getMonth() + 1, d.getFullYear()].map((n, i) => String(n).padStart(i < 2 ? 2 : 4, '0')).join('.');
}

export function timeAgo(value: string, lang = 'tr'): string {
    const diff = Math.max(0, Date.now() - new Date(value).getTime()) / 1000;
    const en = lang === 'en';
    if (diff < 60) return en ? 'just now' : 'az önce';
    if (diff < 3600) return Math.floor(diff / 60) + (en ? ' min ago' : ' dk önce');
    if (diff < 86400) return Math.floor(diff / 3600) + (en ? ' h ago' : ' sa önce');
    if (diff < 86400 * 7) return Math.floor(diff / 86400) + (en ? ' d ago' : ' gün önce');
    return shortDate(value);
}

export const clock = (value: string) => { const d = new Date(value); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };

// İlan yardımcıları (web ile aynı kurallar).
export const unitLabel = (unit?: string | null) => ({ kg: 'kg', balya: 'balya', m2: 'm²' } as Record<string, string>)[unit ?? 'kg'] ?? 'kg';
export const isLand = (x?: { kategori?: string } | null) => x?.kategori === 'Arazi';
export const isRent = (x?: { kategori?: string; islemTipi?: string | null } | null) => isLand(x) && x?.islemTipi === 'Kiralik';

export function priceText(x: Pick<Listing, 'kategori' | 'birim' | 'kilogramFiyati' | 'islemTipi'>): string {
    if (isLand(x)) return money(x.kilogramFiyati, 0) + (isRent(x) ? ' / yıl' : '');
    return money(x.kilogramFiyati) + ' / ' + unitLabel(x.birim);
}

export function unitPriceText(x: Pick<Listing, 'kategori' | 'kilogramFiyati' | 'miktarKg' | 'islemTipi'>): string | null {
    if (!isLand(x) || !(x.miktarKg > 0)) return null;
    return isRent(x) ? money(x.kilogramFiyati / x.miktarKg * 1000, 0) + ' / dönüm · yıllık' : money(x.kilogramFiyati / x.miktarKg) + ' / m²';
}

export function qtyText(x: Pick<Listing, 'kategori' | 'birim' | 'miktarKg'>): string {
    if (isLand(x)) return number(x.miktarKg) + ' m² · ' + number(x.miktarKg / 1000, 1) + ' dönüm';
    return number(x.miktarKg) + ' ' + unitLabel(x.birim);
}

export function discount(x: Pick<Listing, 'kilogramFiyati' | 'oncekiKilogramFiyati'>): number | null {
    if (!x.oncekiKilogramFiyati || !(x.oncekiKilogramFiyati > x.kilogramFiyati) || !(x.kilogramFiyati > 0)) return null;
    return Math.round((1 - x.kilogramFiyati / x.oncekiKilogramFiyati) * 1000) / 10;
}

export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]!.toLocaleUpperCase('tr')).join('') || '?';
