import { get } from './api';
import type { Message } from './types';

import { type Conversation, conversations } from './conversations';

export { type Conversation, conversations };

// Son mesajlar (en fazla 4 sayfa = 200 mesaj).
export async function loadMessages(pages = 4): Promise<Message[]> {
    const all: Message[] = [];
    for (let page = 1; page <= pages; page++) {
        const r = await get<{ items: Message[]; hasMore: boolean }>('/api/messages?page=' + page);
        all.push(...r.items);
        if (!r.hasMore) break;
    }
    return all;
}
