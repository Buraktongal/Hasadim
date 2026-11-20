import type { Message } from './types';

export interface Conversation { key: string; listingId: string; listingTitle: string; otherId: string; otherName: string; last: Message; unread: number; messages: Message[] }

// Mesajları ilan + karşı taraf bazında konuşmalara ayırır (en yeni konuşma üstte).
export function conversations(items: Message[], me: string): Conversation[] {
    const map = new Map<string, Conversation>();
    for (const m of [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
        const mine = m.senderId === me;
        const otherId = mine ? m.recipientId : m.senderId;
        const key = m.listingId + '_' + otherId;
        const conv = map.get(key) ?? { key, listingId: m.listingId, listingTitle: m.listingTitle, otherId, otherName: mine ? m.recipientName : m.senderName, last: m, unread: 0, messages: [] };
        conv.messages.push(m); conv.last = m;
        if (!mine && !m.readAt) conv.unread++;
        map.set(key, conv);
    }
    return [...map.values()].sort((a, b) => b.last.createdAt.localeCompare(a.last.createdAt));
}

