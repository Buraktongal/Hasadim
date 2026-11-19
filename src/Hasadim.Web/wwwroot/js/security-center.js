'use strict';

// Hesap güvenliği: güvenlik durumu, açık oturumlar, giriş yöntemleri ve son girişler.
(() => {
    const api = window.HasadimApi;
    const $ = s => document.querySelector(s);
    const node = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
    const button = (text, cls, fn) => { const b = node('button', text, cls); b.type = 'button'; b.onclick = fn; return b; };
    const confirmAction = (message, options) => window.HasadimConfirm ? window.HasadimConfirm(message, options) : Promise.resolve(confirm(message));
    const toDate = v => new Date(/(?:Z|[+-]\d{2}:\d{2})$/i.test(v) ? v : v + 'Z');
    const ago = v => {
        const m = Math.round((Date.now() - toDate(v)) / 60000);
        if (m < 1) return 'şu an';
        if (m < 60) return m + ' dk önce';
        if (m < 1440) return Math.round(m / 60) + ' saat önce';
        return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(toDate(v));
    };
    const deviceIcon = d => /iPhone|Android|iPad/.test(d) ? '📱' : /uygulama/.test(d) ? '📲' : '💻';
    let toastTimer;
    const toast = text => { const t = $('#toast') || $('#accountStatus'); if (!t) return; t.textContent = text; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { if (t.id === 'toast') t.hidden = true; }, 5000); };

    function summary(s) {
        const google = s.logins.some(l => l.provider === 'google'), apple = s.logins.some(l => l.provider === 'apple');
        const items = [
            { ok: s.emailConfirmed, title: 'E-posta doğrulandı', text: s.emailConfirmed ? s.email : 'E-posta adresin doğrulanmamış.', weight: 25 },
            { ok: s.phoneConfirmed, title: 'Telefon doğrulandı', text: s.phoneConfirmed ? s.phone + ' — SMS ile giriş ve hesap kurtarma için' : 'Telefonunu doğrula; SMS ile giriş ve hesap kurtarma için gerekli.', link: s.phoneConfirmed ? null : ['/html/profilim.html', 'Doğrula'], weight: 25 },
            s.hasPassword
                ? { ok: true, title: 'Şifre belirlenmiş', text: 'Düzenli aralıklarla değiştirmen önerilir.', link: ['/html/ayarlar.html#sifre', 'Değiştir'], weight: 25 }
                : { ok: google || apple, title: 'Güvenli giriş', text: 'Şifresiz giriş yapıyorsun (' + [google && 'Google', apple && 'Apple'].filter(Boolean).join(', ') + ').', weight: 25 },
            { ok: s.twoFactorEnabled, title: 'İki adımlı doğrulama', text: s.twoFactorEnabled ? 'Açık — girişte ek kod isteniyor.' : s.twoFactorAvailable ? 'Kapalı. Açman önerilir.' : 'Yakında kullanılabilir olacak.', soon: !s.twoFactorAvailable && !s.twoFactorEnabled, weight: 25 }
        ];
        const scored = items.filter(i => !i.soon);
        const score = Math.round(scored.filter(i => i.ok).reduce((a, i) => a + i.weight, 0) / scored.reduce((a, i) => a + i.weight, 0) * 100);
        const ring = $('#scoreRing');
        ring.style.setProperty('--score', String(score));
        ring.classList.toggle('is-good', score >= 99);
        ring.classList.toggle('is-mid', score >= 60 && score < 99);
        $('#scoreValue').textContent = '%' + score;
        $('#scoreText').textContent = score >= 99 ? 'Hesabın iyi korunuyor.' : score >= 60 ? 'İyi durumda; aşağıdaki eksikleri tamamlayarak güçlendirebilirsin.' : 'Hesabını korumak için aşağıdaki adımları tamamla.';
        const list = $('#securityChecklist');
        list.replaceChildren();
        for (const i of items) {
            const li = node('li', undefined, i.soon ? 'is-soon' : i.ok ? 'is-ok' : 'is-missing');
            const mark = node('span', i.soon ? '…' : i.ok ? '✓' : '!', 'check-mark'); mark.setAttribute('aria-hidden', 'true');
            const text = node('span', undefined, 'check-text');
            text.append(node('strong', i.title), node('small', i.text));
            li.append(mark, text);
            if (i.link) { const a = node('a', i.link[1], 'secondary'); a.href = i.link[0]; li.append(a); }
            list.append(li);
        }
    }

    function sessionsList(s) {
        const list = $('#sessionList');
        list.replaceChildren();
        const others = s.sessions.filter(x => !x.current);
        $('#endOthers').hidden = !others.length;
        if (!s.sessions.length) list.append(node('li', 'Açık oturum bilgisi yok.', 'muted'));
        for (const x of s.sessions) {
            const li = node('li', undefined, 'session-item' + (x.current ? ' is-current' : ''));
            const icon = node('span', deviceIcon(x.device), 'session-icon'); icon.setAttribute('aria-hidden', 'true');
            const info = node('span', undefined, 'session-info');
            const title = node('strong', x.device);
            if (x.current) title.append(node('span', 'Bu cihaz', 'badge current-badge'));
            info.append(title, node('small', x.method + ' · Giriş: ' + ago(x.createdAt) + ' · Son işlem: ' + ago(x.lastSeenAt)));
            li.append(icon, info);
            if (!x.current) li.append(button('Oturumu kapat', 'secondary', async () => {
                if (!await confirmAction(x.device + ' cihazındaki oturum kapatılacak. O cihazda tekrar giriş yapılması gerekecek.', { title: 'Oturum kapatılsın mı?', okText: 'Kapat', danger: true })) return;
                try { const r = await api('/api/account/sessions/' + x.id, 'DELETE'); toast(r?.mesaj || 'Oturum kapatıldı.'); void load(); } catch (e) { toast(e.message); }
            }));
            list.append(li);
        }
    }

    function methods(s) {
        const list = $('#loginMethods');
        list.replaceChildren();
        const has = p => s.logins.find(l => l.provider === p);
        const rows = [
            ['✉️', 'E-posta ve şifre', s.hasPassword ? s.email : 'Şifre belirlenmemiş', s.hasPassword, s.hasPassword ? ['/html/ayarlar.html#sifre', 'Şifreyi değiştir'] : null],
            ['📱', 'Telefon (SMS kodu)', s.phoneConfirmed ? s.phone : 'Telefon doğrulanmamış', s.phoneConfirmed, s.phoneConfirmed ? null : ['/html/profilim.html', 'Telefonu doğrula']],
            ['G', 'Google', has('google') ? 'Bağlı' : 'Bağlı değil', Boolean(has('google')), null, has('google') ? 'google' : null],
            ['A', 'Apple', has('apple') ? 'Bağlı' : 'Bağlı değil', Boolean(has('apple')), null, has('apple') ? 'apple' : null]
        ];
        const active = rows.filter(r => r[3]).length;
        for (const [icon, title, text, on, link, provider] of rows) {
            const li = node('li', undefined, 'method-item' + (on ? ' is-on' : ''));
            const ic = node('span', icon, 'session-icon method-icon'); ic.setAttribute('aria-hidden', 'true');
            const info = node('span', undefined, 'session-info');
            info.append(node('strong', title), node('small', text));
            li.append(ic, info, node('span', on ? 'Açık' : 'Kapalı', 'state-pill ' + (on ? 'state-1' : 'state-3')));
            if (link) { const a = node('a', link[1], 'textbtn'); a.href = link[0]; li.append(a); }
            if (provider) {
                const remove = button('Bağlantıyı kaldır', 'textbtn danger-text', async () => {
                    if (!await confirmAction(title + ' ile giriş kapatılacak. Diğer yöntemlerle girmeye devam edebilirsin.', { title: title + ' bağlantısı kaldırılsın mı?', okText: 'Kaldır', danger: true })) return;
                    try { const r = await api('/api/account/logins/' + provider, 'DELETE'); toast(r?.mesaj || 'Bağlantı kaldırıldı.'); void load(); } catch (e) { toast(e.message); }
                });
                remove.disabled = active <= 1;
                if (active <= 1) remove.title = 'Hesabına girmenin tek yolu bu; önce başka bir yöntem ekle.';
                li.append(remove);
            }
            list.append(li);
        }
    }

    function history(s) {
        const list = $('#loginHistory');
        list.replaceChildren();
        if (!s.history.length) list.append(node('li', 'Henüz kayıtlı giriş hareketi yok.', 'muted'));
        for (const h of s.history) {
            const li = node('li', undefined, h.success ? 'is-ok' : 'is-failed');
            const mark = node('span', h.success ? '✓' : '✕', 'check-mark'); mark.setAttribute('aria-hidden', 'true');
            const info = node('span', undefined, 'session-info');
            info.append(node('strong', h.success ? 'Başarılı giriş' : 'Başarısız deneme' + (h.reason ? ' — ' + h.reason : '')), node('small', h.device + ' · ' + h.method));
            li.append(mark, info, node('time', ago(h.at), 'muted'));
            list.append(li);
        }
    }

    async function load() {
        try {
            const s = await api('/api/account/security');
            summary(s); sessionsList(s); methods(s); history(s);
            const all = $('#logoutAllPanel');
            if (all) all.hidden = !s.hasPassword;
        } catch (e) {
            if (e.status === 401) { location.href = api.loginUrl(); return; }
            $('#scoreText').textContent = e.message;
        }
    }

    $('#endOthers').onclick = async () => {
        if (!await confirmAction('Bu cihaz dışındaki tüm oturumlar kapatılacak.', { title: 'Diğer oturumlar kapatılsın mı?', okText: 'Kapat', danger: true })) return;
        try { const r = await api('/api/account/sessions/end-others', 'POST'); toast(r?.mesaj || 'Oturumlar kapatıldı.'); void load(); } catch (e) { toast(e.message); }
    };
    void load();
})();
