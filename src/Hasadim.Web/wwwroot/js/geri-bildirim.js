'use strict';

// Öneri ve geri bildirim kutusu: gönderme ve kullanıcının önceki bildirimleri.
(() => {
    const api = window.HasadimApi;
    const $ = s => document.querySelector(s);
    const node = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
    const KINDS = { Oneri: ['💡', 'Öneri'], Hata: ['🐞', 'Hata bildirimi'], Diger: ['💬', 'Diğer'] };
    const STATUS = [['Yeni', 'new'], ['İnceleniyor', 'review'], ['Planlandı', 'planned'], ['Çözüldü', 'done'], ['Kapatıldı', 'closed']];
    const form = $('#feedbackForm');
    const areaName = value => form.elements.area.querySelector(`option[value="${CSS.escape(value)}"]`)?.textContent || value;
    const date = v => new Date(v).toLocaleDateString(document.documentElement.lang === 'en' ? 'en-GB' : 'tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

    // Geldiği sayfa (yalnızca site içi yol) isteğe bağlı eklenir.
    let fromPage = null;
    try {
        const ref = document.referrer ? new URL(document.referrer) : null;
        if (ref && ref.origin === location.origin && !ref.pathname.includes('geri-bildirim')) fromPage = (ref.pathname + ref.search).slice(0, 300);
    } catch { fromPage = null; }
    if (fromPage) { $('[data-page-row]').hidden = false; $('[data-page-url]').textContent = fromPage; }

    const body = form.elements.body;
    body.addEventListener('input', () => { $('[data-count]').textContent = body.value.length; });
    form.addEventListener('change', e => {
        if (e.target.name !== 'kind') return;
        const bug = e.target.value === 'Hata';
        $('[data-body-label]').textContent = bug ? 'Ne oldu?' : 'Açıklama';
        body.placeholder = bug ? 'Ne yaptın, ne bekledin, ne oldu? Mümkünse adım adım yaz. Hangi cihaz ve tarayıcıyı kullandığını da ekle.'
            : e.target.value === 'Oneri' ? 'Fikrini anlat: neyi, neden ve nasıl iyileştirelim?' : 'Mesajını yaz.';
    });

    function render(items) {
        const list = $('#feedbackList');
        list.replaceChildren();
        $('#centerStatus').textContent = items.length ? '' : 'Henüz geri bildirim göndermedin.';
        for (const f of items) {
            const card = node('article', undefined, 'center-card feedback-card');
            const head = node('div', undefined, 'feedback-card-head');
            const [icon, kind] = KINDS[f.kind] || KINDS.Diger;
            const [statusText, statusClass] = STATUS[f.status] || STATUS[0];
            head.append(node('span', icon, 'fk-icon'), node('strong', '#' + f.number + ' · ' + f.title), node('span', statusText, 'status-pill status-' + statusClass));
            const meta = node('p', kind + ' · ' + areaName(f.area) + ' · ' + date(f.createdAt), 'muted');
            const text = node('p', f.body, 'feedback-body');
            card.append(head, meta, text);
            if (f.reply) {
                const reply = node('div', undefined, 'feedback-reply');
                reply.append(node('strong', 'Hasadım ekibinin yanıtı'), node('p', f.reply));
                card.append(reply);
            }
            list.append(card);
        }
    }

    async function load() {
        try { render(await api('/api/feedback/mine')); }
        catch (e) {
            if (e.status === 401) {
                form.hidden = true;
                $('#feedbackLogin').hidden = false;
                $('#feedbackLoginLink').href = api.loginUrl();
                $('#centerStatus').textContent = 'Giriş yaptıktan sonra gönderdiğin bildirimler burada görünür.';
                return;
            }
            $('#centerStatus').textContent = e.message;
        }
    }

    form.addEventListener('submit', async e => {
        e.preventDefault();
        const error = form.querySelector('.form-error');
        const button = form.querySelector('[type=submit]');
        const data = Object.fromEntries(new FormData(form));
        error.textContent = '';
        if (!data.area) { error.textContent = 'Uygulamanın hangi bölümüyle ilgili olduğunu seç.'; form.elements.area.focus(); return; }
        if ((data.title || '').trim().length < 5) { error.textContent = 'Başlık en az 5 karakter olmalı.'; form.elements.title.focus(); return; }
        if ((data.body || '').trim().length < 15) { error.textContent = 'Açıklama en az 15 karakter olmalı.'; body.focus(); return; }
        button.disabled = true;
        try {
            const r = await api('/api/feedback', 'POST', { kind: data.kind, area: data.area, title: data.title.trim(), body: data.body.trim(), pageUrl: data.includePage && fromPage ? fromPage : null });
            form.reset();
            $('[data-count]').textContent = '0';
            window.HasadimToast?.(r.mesaj) ?? (() => { const t = $('#toast'); if (t) { t.textContent = r.mesaj; t.hidden = false; setTimeout(() => { t.hidden = true; }, 4000); } })();
            void load();
        } catch (err) {
            if (err.status === 401) location.href = api.loginUrl();
            error.textContent = err.message;
        } finally { button.disabled = false; }
    });

    void load();
})();
