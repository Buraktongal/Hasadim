// Sunucunun döndürdüğü veri tipleri (Hasadim.Application sözleşmeleriyle aynı adlar, camelCase).
export type CategoryId = 'Meyve' | 'Tahil' | 'Yem' | 'Bal' | 'Kuruyemis' | 'Arazi';

export interface Photo { id: string; url: string; photoUrl?: string | null }

export interface Listing {
    id: string; ownerId: string; ownerName: string; listingNumber: number;
    baslik: string; kategori: string; birim: string; meyveTuru: string; cesit: string;
    miktarKg: number; kilogramFiyati: number; oncekiKilogramFiyati?: number | null;
    il: string; ilce: string; aciklama: string; telefon?: string | null; showPhone?: boolean;
    ambalaj?: string | null; teslimat?: string | null; minAlimKg?: number | null; hasatTarihi?: string | null;
    olusturulmaTarihi: string; publishedAt?: string | null; expiresAt?: string | null;
    islemTipi?: string | null; imarDurumu?: string | null; tapuDurumu?: string | null; sulama?: string | null;
    ada?: string | null; parsel?: string | null; elektrik?: boolean | null; yolCephesi?: boolean | null;
    enlem?: number | null; boylam?: number | null;
    status: number; statusText?: string; reviewNote?: string | null; active: boolean; hidden: boolean;
    isMine?: boolean; favorite?: boolean; viewCount?: number; favoriteCount?: number;
    photoUrl?: string | null; photos?: Photo[]; version: string;
}

export interface Paged<T> { items: T[]; total: number; page: number; pageSize: number }
export interface CategoryCount { meyveTuru: string; count: number; kategori: string }

export interface User { id: string; displayName: string; email?: string; twoFactorEnabled?: boolean; isAdmin?: boolean; hasPassword?: boolean }

export interface Message {
    id: string; listingId: string; listingTitle: string; senderId: string; recipientId: string;
    senderName: string; recipientName: string; body: string; createdAt: string; readAt?: string | null;
}

export interface Offer {
    id: string; listingId: string; listingTitle: string; listingNumber: number; kategori: string; birim: string;
    listingPrice: number; buyerId: string; buyerName: string; sellerId: string; sellerName: string;
    amount: number; quantity?: number | null; note?: string | null; reply?: string | null;
    status: 0 | 1 | 2 | 3; createdAt: string; respondedAt?: string | null; sent: boolean;
}

export interface Notification { id: string; kind: string; title: string; body: string; link?: string | null; data?: string | null; createdAt: string; readAt?: string | null }
export interface SavedSearch { id: string; name: string; query: string; notify: boolean; createdAt: string }
export interface Block { userId: string; displayName: string; createdAt: string }
export interface Settings { language: 'tr' | 'en'; theme: 'system' | 'light' | 'dark'; notifyMessages: boolean; notifyOffers: boolean; notifySavedSearches: boolean; notifyPriceDrops: boolean }

export interface MapData {
    iller: { il: string; count: number }[];
    noktalar: { id: string; baslik: string; kategori: string; meyveTuru: string; il: string; ilce: string; kilogramFiyati: number; birim: string; miktarKg: number; enlem?: number | null; boylam?: number | null }[];
}

export interface PublicProfile {
    id: string; displayName: string; accountType: string; activity: string; businessName?: string | null;
    city: string; district: string; about: string; phone?: string | null; photoUrl?: string | null;
    memberSince?: string | null; emailVerified: boolean; activeListingCount: number;
}
export interface MyProfile extends PublicProfile { email: string; showPhone: boolean; completion: number; version: string; phoneVerified?: boolean; businessName: string; phone: string }

export interface SecurityInfo {
    email: string; emailConfirmed: boolean; phone?: string | null; phoneConfirmed: boolean; hasPassword: boolean;
    twoFactorEnabled: boolean; twoFactorAvailable: boolean;
    logins: { provider: string; name: string }[];
    sessions: { id: string; method: string; device: string; createdAt: string; lastSeenAt: string; current: boolean }[];
    history: { at: string; success: boolean; method: string; device: string; reason?: string | null }[];
}
