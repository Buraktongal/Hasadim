'use strict';

window.HasadimMessages = (() => {
    const el = (tag, text, cls) => {
        const n = document.createElement(tag);
        if (text !== undefined) n.textContent = text;
        if (cls) n.className = cls;
        return n;
    };
    const button = (text, cls, action) => {
        const n = el('button', text, cls); n.type = 'button'; n.onclick = action; return n;
    };
    const timestamp = value => {
        const d = new Date(/Z$|[+-]\d\d:\d\d$/.test(value) ? value : value + 'Z');
        return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    };
    function create({ root, more, api, currentUser }) {
        let owner, items = [], page = 1, selected = '', search = '', request = 0, loading = false, hasMore = false;
        const drafts = new Map();
        const sending = new Set(), feedback = new Map();
        const key = m => m.listingId + ':' + (m.senderId === owner ? m.recipientId : m.senderId);
        function groups() {
            const grouped = new Map();
            for (const m of items) {
                const id = key(m);
                if (!grouped.has(id)) grouped.set(id, { id, listingId: m.listingId, title: m.listingTitle,
                    personId: m.senderId === owner ? m.recipientId : m.senderId,
                    person: m.senderId === owner ? m.recipientName : m.senderName, messages: [] });
                grouped.get(id).messages.push(m);
            }
            for (const group of grouped.values()) group.messages.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
            return [...grouped.values()].sort((a, b) => b.messages.at(-1).createdAt.localeCompare(a.messages.at(-1).createdAt));
        }
        function render() {
            const showConversation = root.className.split(' ').includes('show-conversation');
            root.replaceChildren(); root.className = 'message-center' + (showConversation ? ' show-conversation' : '');
            const conversations = groups();
            if (!conversations.length) {
                root.append(el('div', 'Henüz konuşman yok. Bir ilanı açıp “Satıcıya soru sor” ile başlayabilirsin.', 'inbox-empty'));
                return;
            }
            if (!conversations.some(g => g.id === selected)) selected = conversations[0].id;
            const sidebar = el('aside', undefined, 'conversation-sidebar');
            sidebar.setAttribute('aria-label', 'Konuşmalar');
            const filter = el('input'); filter.type = 'search'; filter.value = search;
            filter.placeholder = 'Kişi veya ilan ara'; filter.setAttribute('aria-label', 'Yüklenen konuşmalarda ara');
            const list = el('div', undefined, 'conversation-list');
            const fillList = () => {
                list.replaceChildren();
                const filtered = conversations.filter(g => (g.person + ' ' + g.title).toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR')));
                for (const g of filtered) {
                    const last = g.messages.at(-1);
                    const item = button('', 'conversation-item' + (g.id === selected ? ' selected' : ''), () => {
                        selected = g.id; root.classList.add('show-conversation'); render();
                    });
                    item.setAttribute('aria-pressed', String(g.id === selected));
                    item.append(el('strong', g.person), el('span', g.title, 'conversation-product'),
                        el('p', (last.senderId === owner ? 'Sen: ' : '') + last.body, 'conversation-preview'), el('small', timestamp(last.createdAt)));
                    list.append(item);
                }
                if (!filtered.length) list.append(el('p', 'Yüklenen konuşmalarda sonuç yok.', 'muted'));
            };
            filter.oninput = () => { search = filter.value; fillList(); };
            fillList(); sidebar.append(el('h3', 'Konuşmalar'), filter, list);
            const g = conversations.find(x => x.id === selected);
            const panel = el('section', undefined, 'conversation-panel');
            panel.setAttribute('aria-label', g.person + ' ile ' + g.title + ' konuşması');
            const header = el('header', undefined, 'conversation-heading');
            const back = button('← Konuşmalar', 'textbtn conversation-back', () => root.classList.remove('show-conversation'));
            const listing = el('a', g.title + ' ↗', 'conversation-listing');
            listing.href = '/html/ilan.html?id=' + encodeURIComponent(g.listingId) + '&from=messages';
            const person = el('a', g.person, 'conversation-person');
            person.href = '/html/satici.html?id=' + encodeURIComponent(g.personId);
            header.append(back, person, listing);
            const history = el('div', undefined, 'conversation-history');
            if (hasMore) history.append(el('p', 'Eski konuşmalar ve önceki mesajlar için aşağıdaki yükleme düğmesini kullan.', 'history-note'));
            for (const m of g.messages) {
                const bubble = el('article', undefined, 'message-bubble ' + (m.senderId === owner ? 'outgoing' : 'incoming'));
                bubble.append(el('small', m.senderId === owner ? 'Sen' : g.person), el('p', m.body), el('time', timestamp(m.createdAt)));
                history.append(bubble);
            }
            const form = el('form', undefined, 'conversation-reply');
            const label = el('label', 'Yanıtın');
            const body = el('textarea'); body.name = 'body'; body.required = true; body.maxLength = 2000; body.rows = 3;
            body.value = drafts.get(g.id) || ''; body.placeholder = 'Bu ilan hakkında mesajını yaz…';
            body.oninput = () => drafts.set(g.id, body.value);
            label.append(body);
            const error = el('p', feedback.get(g.id) || '', 'form-error'); error.setAttribute('role', 'status');
            const send = el('button', 'Gönder', 'primary'); send.type = 'submit';
            send.disabled = body.disabled = sending.has(g.id);
            form.append(label, error, send);
            form.onsubmit = async event => {
                event.preventDefault(); if (sending.has(g.id)) return;
                const text = body.value.trim();
                if (!text || text.length > 2000) { error.textContent = '1–2000 karakter arasında bir mesaj yaz.'; return; }
                drafts.set(g.id, body.value); sending.add(g.id); feedback.delete(g.id);
                send.disabled = true; body.disabled = true; error.textContent = '';
                try {
                    await api('/api/messages', 'POST', { listingId: g.listingId, recipientId: g.personId, body: text });
                    drafts.delete(g.id); body.value = ''; feedback.set(g.id, 'Mesaj gönderildi.');
                    await load();
                } catch (e) { feedback.set(g.id, e.message); error.textContent = e.message; }
                finally {
                    sending.delete(g.id); send.disabled = false; body.disabled = false;
                    if (selected === g.id) {
                        const current = root.querySelector('.conversation-reply');
                        if (current) {
                            current.querySelector('textarea').disabled = false;
                            current.querySelector('button').disabled = false;
                            current.querySelector('.form-error').textContent = feedback.get(g.id) || '';
                        }
                    }
                }
            };
            panel.append(header, history, form); root.append(sidebar, panel);
            history.scrollTop = history.scrollHeight;
        }
        async function load(append = false) {
            if (append && loading) return;
            const user = currentUser(); if (!user) return;
            if (owner !== user.id) { items = []; drafts.clear(); feedback.clear(); sending.clear(); selected = ''; search = ''; owner = user.id; }
            const version = ++request; loading = true; more.disabled = true;
            if (!items.length) root.replaceChildren(el('p', 'Konuşmalar yükleniyor…'));
            try {
                const next = append ? page + 1 : 1;
                const data = await api('/api/messages?page=' + next);
                if (version !== request || currentUser()?.id !== owner) return;
                const unique = new Map((append ? items : []).map(m => [m.id, m]));
                for (const m of data.items) unique.set(m.id, m);
                items = [...unique.values()]; page = next; hasMore = data.hasMore;
                more.hidden = !hasMore; render();
            } catch (e) {
                if (version !== request) return;
                const notice = el('p', e.message, 'form-error'); notice.setAttribute('role', 'alert'); root.append(notice);
            } finally { if (version === request) { loading = false; more.disabled = false; } }
        }
        return { load };
    }
    function questions(x, ask) {
        const section = el('section', undefined, 'listing-questions');
        section.append(el('p', 'ÜRÜN HAKKINDA MERAK ETTİKLERİN', 'eyebrow'), el('h3', 'Satıcıya soru sor'),
            el('p', 'Sorun yalnızca satıcıya özel mesaj olarak ulaşır. Yanıtları Mesajlarım bölümünden takip edebilirsin.', 'muted'));
        const choices = el('div', undefined, 'question-choices');
        for (const [label, text] of [['Ürün mevcut mu?', 'Merhaba, ilandaki ürün hâlâ mevcut mu?'], ['Teslimat nasıl?', 'Merhaba, teslimat ve nakliye koşullarınız nelerdir?'], ['Hasat durumu', 'Merhaba, ürünün hasat durumu ve teslim alınabileceği tarih nedir?'], ['Fiyat ve miktar', 'Merhaba, minimum alım miktarınız nedir? Miktara göre fiyat değişiyor mu?']]) {
            choices.append(button(label, 'secondary', () => ask(text)));
        }
        section.append(choices, button('Kendi sorunu yaz', 'primary', () => ask('')));
        return section;
    }
    return { create, questions };
})();
