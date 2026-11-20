'use strict';

// Hasadım yönetim paneli. Tüm yetki denetimi sunucudadır (AdminController);
// bu dosya yalnızca arayüzdür. Metinler her zaman textContent ile yazılır (XSS yok).
(() => {
    const api = window.HasadimApi;
    const $ = s => document.querySelector(s);
    const node = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined && text !== null) n.textContent = text; if (cls) n.className = cls; return n; };
    const btn = (text, cls, onClick) => { const b = node('button', text, cls); b.type = 'button'; b.onclick = onClick; return b; };
    const STATUSES = [['Yeni', 'new'], ['İnceleniyor', 'review'], ['Planlandı', 'planned'], ['Çözüldü', 'done'], ['Kapatıldı', 'closed']];
    const KINDS = { Oneri: '💡 Öneri', Hata: '🐞 Hata', Diger: '💬 Diğer' };
    const AREAS = {
        Pazar: 'Pazar yeri ve arama', IlanVerme: 'İlan verme', IlanDetayi: 'İlan detayı', Mesajlar: 'Mesajlar', Teklifler: 'Teklifler',
        Harita: 'Harita', UrunTakvimi: 'Ürün takvimi', Bildirimler: 'Bildirimler', Hesap: 'Hesap ve ayarlar', Giris: 'Giriş ve kayıt',
        MobilUygulama: 'Mobil uygulama', Diger: 'Diğer'
    };
    const ACTIONS = {
        'step-up': 'Şifreyle doğruladı', 'step-up-failed': 'Hatalı şifre (doğrulama)', 'user-view': 'Kullanıcı ayrıntısını açtı',
        'user-suspend': 'Kullanıcıyı askıya aldı', 'user-unsuspend': 'Askıyı kaldırdı', 'user-end-sessions': 'Oturumları kapattı',
        'admin-grant': 'Yönetici yetkisi verdi', 'admin-revoke': 'Yönetici yetkisini kaldırdı', 'feedback-update': 'Geri bildirimi güncelledi',
        'listing-approve': 'İlanı onayladı', 'listing-request-changes': 'İlana düzeltme istedi', 'listing-hide': 'İlanı gizledi',
        'listing-show': 'İlanı tekrar gösterdi', 'report-resolve': 'Şikâyeti kapattı'
    };
    const fmt = (v, withTime = true) => v ? new Intl.DateTimeFormat('tr-TR', withTime ? { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Istanbul' } : { dateStyle: 'medium', timeZone: 'Europe/Istanbul' }).format(new Date(v)) : '—';
    const num = v => new Intl.NumberFormat('tr-TR').format(v ?? 0);

    function toast(text) {
        const t = $('#toast');
        t.textContent = text; t.hidden = false;
        clearTimeout(toast.timer); toast.timer = setTimeout(() => { t.hidden = true; }, 4200);
    }

    // ---------- Şifreyle yeniden doğrulama ----------
    let stepUpUntil = 0;
    function showStepUp() {
        const left = stepUpUntil - Date.now();
        $('#stepUpBadge').hidden = left <= 0;
        if (left > 0) $('[data-stepup-left]').textContent = Math.ceil(left / 60000) + ' dk';
    }
    setInterval(showStepUp, 15000);
    function askPassword() {
        const d = $('#stepUpDialog'), f = $('#stepUpForm'), err = f.querySelector('.form-error');
        f.reset(); err.textContent = '';
        return new Promise(resolve => {
            d.onclose = () => resolve(false);
            f.onsubmit = async e => {
                e.preventDefault();
                const b = f.querySelector('[type=submit]'); b.disabled = true; err.textContent = '';
                try {
                    const r = await api('/api/admin/step-up', 'POST', { password: f.elements.password.value });
                    stepUpUntil = Date.now() + r.expiresInSeconds * 1000; showStepUp();
                    d.onclose = null; d.close(); resolve(true);
                } catch (x) { err.textContent = x.message; f.elements.password.select(); }
                finally { b.disabled = false; }
            };
            d.showModal(); f.elements.password.focus();
        });
    }
    // Hassas işlem: sunucu "step_up_required" derse şifre sorulur ve işlem bir kez tekrarlanır.
    async function sensitive(path, body) {
        try { return await api(path, 'POST', body); }
        catch (e) {
            if (e.code !== 'step_up_required') throw e;
            if (!await askPassword()) throw Object.assign(Error('İşlem iptal edildi.'), { cancelled: true });
            return api(path, 'POST', body);
        }
    }

    // ---------- Sekmeler ----------
    const loaders = {};
    let current = 'overview';
    function openTab(name, push = true) {
        if (!loaders[name]) name = 'overview';
        current = name;
        for (const b of document.querySelectorAll('[data-tab]')) { if (b.dataset.tab === name) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); }
        for (const p of document.querySelectorAll('[data-panel]')) p.hidden = p.dataset.panel !== name;
        if (push) history.replaceState(null, '', '#' + name);
        $('#adminMain').scrollTop = 0;
        return loaders[name]();
    }
    for (const b of document.querySelectorAll('[data-tab]')) b.onclick = () => openTab(b.dataset.tab);
    for (const b of document.querySelectorAll('[data-refresh]')) b.onclick = () => loaders[current]();
    for (const b of document.querySelectorAll('[data-close-dialog]')) b.onclick = () => b.closest('dialog').close();

    function pager(root, data, go) {
        root.replaceChildren();
        const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
        if (pages <= 1) { root.append(node('span', num(data.total) + ' kayıt', 'muted')); return; }
        const prev = btn('← Önceki', 'secondary', () => go(data.page - 1)), next = btn('Sonraki →', 'secondary', () => go(data.page + 1));
        prev.disabled = data.page <= 1; next.disabled = data.page >= pages;
        root.append(prev, node('span', data.page + ' / ' + pages + ' · ' + num(data.total) + ' kayıt', 'muted'), next);
    }
    const empty = (root, text) => root.replaceChildren(node('p', text, 'admin-empty'));
    const failed = (root, e) => root.replaceChildren(node('p', e.message, 'form-error'));
    const debounce = (fn, ms = 300) => { let t; return () => { clearTimeout(t); t = setTimeout(fn, ms); }; };

    // ---------- Özet ----------
    function setCount(name, value) { const b = $(`[data-count="${name}"]`); b.hidden = !value; b.textContent = value > 99 ? '99+' : value; }
    loaders.overview = async () => {
        const grid = $('#statsGrid');
        try {
            const s = await api('/api/admin/stats');
            setCount('feedback', s.newFeedback); setCount('listings', s.pendingListings); setCount('reports', s.openReports);
            const tiles = [
                ['Üyeler', s.users, `Son 7 gün: +${num(s.newUsers7d)}`, 'users'],
                ['Yayındaki ilanlar', s.liveListings, `Son 24 saatte ${num(s.listings24h)} yeni ilan`, null],
                ['İnceleme bekleyen', s.pendingListings, `${num(s.hiddenListings)} gizli ilan`, 'listings', s.pendingListings > 0],
                ['Açık şikâyet', s.openReports, 'Kapatılmayı bekliyor', 'reports', s.openReports > 0],
                ['Yeni geri bildirim', s.newFeedback, `${num(s.openFeedback)} açık kayıt`, 'feedback', s.newFeedback > 0],
                ['Askıdaki hesap', s.suspendedUsers, `${num(s.admins)} yönetici`, 'users'],
                ['Hatalı giriş (24 sa)', s.failedLogins24h, s.failedLogins24h > 50 ? 'Olağan dışı yüksek' : 'Olağan', null, s.failedLogins24h > 50],
                ['Mesaj (24 sa)', s.messages24h, 'Üyeler arası mesaj', null]
            ];
            grid.replaceChildren(...tiles.map(([label, value, sub, tab, alert]) => {
                const t = node(tab ? 'button' : 'div', undefined, 'admin-stat' + (alert ? ' alert' : ''));
                if (tab) { t.type = 'button'; t.onclick = () => openTab(tab); }
                t.append(node('span', label, 'admin-stat-label'), node('strong', num(value)), node('small', sub));
                return t;
            }));
        } catch (e) { failed(grid, e); }
    };

    // ---------- Geri bildirimler ----------
    const fbForm = $('#fbFilters');
    STATUSES.forEach(([t], i) => fbForm.elements.status.append(new Option(t, i)));
    Object.entries(AREAS).forEach(([v, t]) => fbForm.elements.area.append(new Option(t, v)));
    let fbPage = 1, fbItems = [];
    const pill = s => { const [t, c] = STATUSES[s] || STATUSES[0]; return node('span', t, 'status-pill status-' + c); };
    loaders.feedback = async (page = fbPage) => {
        fbPage = page;
        const list = $('#fbList');
        const p = new URLSearchParams({ page });
        for (const k of ['q', 'status', 'kind', 'area']) { const v = fbForm.elements[k].value.trim(); if (v) p.set(k, v); }
        try {
            const data = await api('/api/admin/feedback?' + p);
            fbItems = data.items;
            pager($('#fbPager'), data, n => loaders.feedback(n));
            if (!data.items.length) return empty(list, 'Bu filtreye uyan geri bildirim yok.');
            list.replaceChildren(...data.items.map(f => {
                const row = node('button', undefined, 'admin-row fb-row' + (f.status === 0 ? ' unread' : ''));
                row.type = 'button';
                row.onclick = () => openFeedback(f);
                const head = node('div', undefined, 'admin-row-head');
                head.append(node('span', KINDS[f.kind] || f.kind, 'admin-kind kind-' + f.kind.toLowerCase()), node('strong', '#' + f.number + ' ' + f.title), pill(f.status));
                row.append(head,
                    node('p', f.body.length > 180 ? f.body.slice(0, 180) + '…' : f.body, 'admin-row-body'),
                    node('p', [AREAS[f.area] || f.area, f.userName, f.client, fmt(f.createdAt)].filter(Boolean).join(' · '), 'muted admin-row-meta'));
                if (f.reply) row.append(node('span', '↩ Yanıtlandı', 'admin-tag'));
                return row;
            }));
        } catch (e) { failed(list, e); }
    };
    const fbReload = debounce(() => loaders.feedback(1));
    fbForm.addEventListener('input', fbReload);
    fbForm.addEventListener('submit', e => { e.preventDefault(); loaders.feedback(1); });

    function openFeedback(f) {
        $('#fdNo').textContent = '#' + f.number + ' · ' + (KINDS[f.kind] || f.kind);
        $('#fdTitle').textContent = f.title;
        $('#fdSub').textContent = (AREAS[f.area] || f.area) + ' · ' + fmt(f.createdAt);
        $('#fdBody').textContent = f.body;
        const meta = $('#fdMeta'); meta.replaceChildren();
        const add = (k, v) => { if (!v) return; meta.append(node('dt', k)); const dd = node('dd'); if (v instanceof Node) dd.append(v); else dd.textContent = v; meta.append(dd); };
        const who = node('button', f.userName + ' · ' + f.userEmail, 'textbtn'); who.type = 'button'; who.onclick = () => { $('#fbDrawer').close(); openUser(f.userId); };
        add('Gönderen', who);
        add('Uygulama', f.client);
        if (f.pageUrl) { const a = node('a', f.pageUrl); a.href = f.pageUrl; a.target = '_blank'; a.rel = 'noopener noreferrer'; add('Sayfa', a); }
        add('Son işlem', f.handledByName ? f.handledByName + ' · ' + fmt(f.updatedAt) : null);
        const form = $('#fdForm');
        form.elements.status.replaceChildren(...STATUSES.map(([t], i) => new Option(t, i)));
        form.elements.status.value = String(f.status === 0 ? 1 : f.status);
        form.elements.reply.value = f.reply || '';
        form.elements.adminNote.value = f.adminNote || '';
        form.querySelector('.form-error').textContent = '';
        form.onsubmit = async e => {
            e.preventDefault();
            const b = form.querySelector('[type=submit]'); b.disabled = true;
            try {
                const r = await api('/api/admin/feedback/' + f.id, 'PUT', { status: Number(form.elements.status.value), reply: form.elements.reply.value, adminNote: form.elements.adminNote.value });
                toast(r.mesaj); $('#fbDrawer').close(); void loaders.feedback(); void loaders.overview();
            } catch (x) { form.querySelector('.form-error').textContent = x.message; }
            finally { b.disabled = false; }
        };
        $('#fbDrawer').showModal();
    }

    // ---------- Kullanıcılar ----------
    const usForm = $('#usFilters');
    let usPage = 1;
    function userState(u) {
        if (u.deletedAt) return ['Silinmiş', 'closed'];
        if (u.suspendReason) return ['Askıda', 'danger'];
        if (u.isAdmin) return ['Yönetici', 'planned'];
        if (!u.emailConfirmed) return ['Doğrulanmamış', 'new'];
        return ['Etkin', 'done'];
    }
    loaders.users = async (page = usPage) => {
        usPage = page;
        const body = $('#usTable tbody');
        const p = new URLSearchParams({ page, filter: usForm.elements.filter.value });
        const q = usForm.elements.q.value.trim(); if (q) p.set('q', q);
        try {
            const data = await api('/api/admin/users?' + p);
            pager($('#usPager'), data, n => loaders.users(n));
            if (!data.items.length) { const tr = node('tr'); const td = node('td', 'Bu filtreye uyan kullanıcı yok.', 'admin-empty'); td.colSpan = 6; tr.append(td); body.replaceChildren(tr); return; }
            body.replaceChildren(...data.items.map(u => {
                const tr = node('tr');
                tr.tabIndex = 0;
                tr.onclick = () => openUser(u.id);
                tr.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openUser(u.id); } };
                const name = node('td'); name.append(node('strong', u.displayName));
                const contact = node('td'); contact.append(node('span', u.email + (u.emailConfirmed ? ' ✓' : ''), 'admin-cell-line'), node('small', u.phoneNumber ? u.phoneNumber + (u.phoneNumberConfirmed ? ' ✓' : '') : 'Telefon yok', 'muted'));
                const [st, cls] = userState(u);
                const state = node('td'); state.append(node('span', st, 'status-pill status-' + cls));
                tr.append(name, contact, node('td', num(u.liveListings) + ' / ' + num(u.listingCount)), node('td', fmt(u.createdAt, false)), node('td', fmt(u.lastSeenAt)), state);
                return tr;
            }));
        } catch (e) { const tr = node('tr'); const td = node('td', e.message, 'form-error'); td.colSpan = 6; tr.append(td); body.replaceChildren(tr); }
    };
    const usReload = debounce(() => loaders.users(1));
    usForm.addEventListener('input', usReload);
    usForm.addEventListener('submit', e => { e.preventDefault(); loaders.users(1); });

    let me = null;
    async function openUser(id) {
        const d = $('#userDrawer'), body = $('#udBody');
        $('#udName').textContent = 'Yükleniyor…'; $('#udSub').textContent = '';
        body.replaceChildren();
        if (!d.open) d.showModal();
        let data;
        try { data = await api('/api/admin/users/' + id); } catch (e) { $('#udName').textContent = 'Kullanıcı'; return failed(body, e); }
        const u = data.user;
        $('#udName').textContent = u.displayName;
        $('#udSub').textContent = u.email;
        const [st, cls] = userState(u);
        const dl = node('dl', undefined, 'admin-dl');
        const add = (k, v) => { dl.append(node('dt', k), node('dd', v)); };
        add('Durum', st + (u.suspendReason ? ' — ' + u.suspendReason + ' (' + fmt(u.suspendedAt) + ')' : ''));
        add('E-posta', u.email + (u.emailConfirmed ? ' (doğrulandı)' : ' (doğrulanmadı)'));
        add('Telefon', u.phoneNumber ? u.phoneNumber + (u.phoneNumberConfirmed ? ' (doğrulandı)' : ' (doğrulanmadı)') : '—');
        add('Katılım', fmt(u.createdAt)); add('Son görülme', fmt(u.lastSeenAt));
        add('İlanlar', num(u.liveListings) + ' yayında / ' + num(u.listingCount) + ' toplam');
        add('Açık oturum', num(data.openSessions)); add('Geri bildirim', num(data.feedback)); add('Hakkındaki şikâyet', num(data.reportsAgainst));
        const pill = node('span', st, 'status-pill status-' + cls);

        const actions = node('div', undefined, 'admin-user-actions');
        const self = me && me.id === u.id;
        const run = async (path, bodyData, okMsg) => {
            try { const r = await sensitive(path, bodyData); toast(r?.mesaj || okMsg); await openUser(id); void loaders.users(); void loaders.overview(); }
            catch (e) { if (!e.cancelled) toast(e.message); }
        };
        if (!u.deletedAt && !self) {
            if (u.suspendReason) actions.append(btn('Askıyı kaldır', 'primary', async () => {
                if (await HasadimConfirm(u.displayName + ' tekrar giriş yapabilecek.', { title: 'Askı kaldırılsın mı?', okText: 'Askıyı kaldır' })) await run(`/api/admin/users/${id}/unsuspend`);
            }));
            else if (!u.isAdmin) actions.append(btn('Hesabı askıya al', 'danger', async () => {
                const reason = await HasadimPrompt('Kullanıcı giriş yapmaya çalıştığında genel bir uyarı görür; gerekçe yalnızca yöneticilere görünür.', { title: 'Askıya alma gerekçesi', okText: 'Askıya al', maxLength: 300 });
                if (reason === null || reason === undefined) return;
                if (reason.trim().length < 5) return toast('Gerekçe en az 5 karakter olmalı.');
                await run(`/api/admin/users/${id}/suspend`, { reason: reason.trim() });
            }));
            if (data.openSessions > 0) actions.append(btn('Tüm oturumları kapat', 'secondary', async () => {
                if (await HasadimConfirm('Kullanıcı web ve mobilde yeniden giriş yapmak zorunda kalır.', { title: 'Oturumlar kapatılsın mı?', okText: 'Kapat', danger: true })) await run(`/api/admin/users/${id}/end-sessions`);
            }));
            if (!u.suspendReason) actions.append(btn(u.isAdmin ? 'Yönetici yetkisini kaldır' : 'Yönetici yap', 'secondary', async () => {
                const msg = u.isAdmin ? 'Bu kullanıcı yönetim paneline erişemeyecek.' : 'Bu kullanıcı tüm yönetim işlemlerini yapabilecek. Yalnızca güvendiğin kişilere ver.';
                if (await HasadimConfirm(msg, { title: u.isAdmin ? 'Yetki kaldırılsın mı?' : 'Yönetici yetkisi verilsin mi?', okText: 'Onayla', danger: !u.isAdmin })) await run(`/api/admin/users/${id}/admin?on=${!u.isAdmin}`);
            }));
        }
        if (self) actions.append(node('p', 'Kendi hesabında yönetim işlemi yapamazsın.', 'muted'));
        const profile = node('a', 'Satıcı profilini aç ↗', 'textbtn'); profile.href = '/html/satici.html?id=' + encodeURIComponent(u.id); profile.target = '_blank'; profile.rel = 'noopener';
        actions.append(profile);

        const logins = node('div', undefined, 'admin-logins');
        logins.append(node('h3', 'Son giriş denemeleri'));
        if (!data.logins.length) logins.append(node('p', 'Kayıt yok.', 'muted'));
        for (const l of data.logins) {
            const row = node('div', undefined, 'admin-login ' + (l.success ? 'ok' : 'fail'));
            row.append(node('span', l.success ? '✓' : '✕', 'admin-login-mark'), node('span', fmt(l.at)), node('span', l.method + ' · ' + l.device + (l.reason ? ' · ' + l.reason : ''), 'muted'));
            logins.append(row);
        }
        body.replaceChildren(pill, dl, actions, logins);
    }

    // ---------- İlan onayı ----------
    let lsPage = 1;
    loaders.listings = async (page = lsPage) => {
        lsPage = page;
        const list = $('#lsList');
        try {
            const data = await api('/api/admin/listings/pending?page=' + page);
            if (!data.items.length && page > 1) return loaders.listings(page - 1);
            setCount('listings', data.total);
            pager($('#lsPager'), data, n => loaders.listings(n));
            if (!data.items.length) return empty(list, 'İnceleme bekleyen ilan yok. 🎉');
            list.replaceChildren(...data.items.map(x => {
                const row = node('a', undefined, 'admin-row');
                row.href = '/html/ilan.html?id=' + encodeURIComponent(x.id) + '&from=admin';
                const head = node('div', undefined, 'admin-row-head');
                head.append(node('strong', x.baslik), node('span', x.status === 3 ? 'Yayın bekliyor' : 'İnceleme bekliyor', 'status-pill status-new'));
                row.append(head, node('p', 'İlan No: ' + x.listingNumber + ' · ' + (x.ownerName || '') + ' · ' + [x.il, x.ilce].filter(Boolean).join(' / '), 'muted admin-row-meta'));
                return row;
            }));
        } catch (e) { failed(list, e); }
    };

    // ---------- Şikâyetler ----------
    loaders.reports = async () => {
        const list = $('#rpList');
        try {
            const data = await api('/api/admin/reports');
            setCount('reports', data.length);
            if (!data.length) return empty(list, 'Açık şikâyet yok.');
            list.replaceChildren(...data.map(r => {
                const card = node('article', undefined, 'admin-row static');
                const head = node('div', undefined, 'admin-row-head');
                head.append(node('strong', r.baslik), r.hidden ? node('span', 'Gizli', 'status-pill status-closed') : node('span', 'Yayında', 'status-pill status-done'));
                const acts = node('div', undefined, 'admin-actions-inline');
                const view = node('a', 'İlanı incele', 'secondary'); view.href = '/html/ilan.html?id=' + encodeURIComponent(r.listingId) + '&from=admin';
                acts.append(view,
                    btn(r.hidden ? 'İlanı tekrar göster' : 'İlanı gizle', 'danger', async () => {
                        try { await api(`/api/admin/listings/${r.listingId}/visibility?hidden=${!r.hidden}`, 'POST'); toast(r.hidden ? 'İlan tekrar gösteriliyor.' : 'İlan gizlendi.'); await loaders.reports(); } catch (e) { toast(e.message); }
                    }),
                    btn('Şikâyeti kapat', 'primary', async () => {
                        try { const x = await api(`/api/admin/reports/${r.id}/resolve`, 'POST'); toast(x.mesaj); await loaders.reports(); } catch (e) { toast(e.message); }
                    }));
                card.append(head, node('p', r.reason, 'admin-row-body'), acts);
                return card;
            }));
        } catch (e) { failed(list, e); }
    };

    // ---------- Denetim kaydı ----------
    let auPage = 1;
    loaders.audit = async (page = auPage) => {
        auPage = page;
        const body = $('#auTable tbody');
        try {
            const data = await api('/api/admin/audit?page=' + page);
            pager($('#auPager'), data, n => loaders.audit(n));
            body.replaceChildren(...data.items.map(a => {
                const tr = node('tr', undefined, a.action.endsWith('failed') ? 'warn' : '');
                const target = a.targetType ? a.targetType + ' · ' + (a.targetId || '').slice(0, 8) : '—';
                tr.append(node('td', fmt(a.createdAt)), node('td', a.adminName), node('td', ACTIONS[a.action] || a.action), node('td', target), node('td', a.detail || '—'), node('td', a.ip || '—', 'muted'));
                return tr;
            }));
            if (!data.items.length) { const tr = node('tr'); const td = node('td', 'Henüz kayıt yok.', 'admin-empty'); td.colSpan = 6; tr.append(td); body.replaceChildren(tr); }
        } catch (e) { const tr = node('tr'); const td = node('td', e.message, 'form-error'); td.colSpan = 6; tr.append(td); body.replaceChildren(tr); }
    };

    // ---------- Açılış ----------
    const opening = (async () => {
        try {
            me = await api('/api/admin/me');
        } catch (e) {
            $('#adminDenied').hidden = false;
            $('#adminLogin').href = api.loginUrl();
            if (e.status === 403) { $('#adminDeniedText').textContent = 'Hesabının yönetici yetkisi yok.'; $('#adminLogin').hidden = true; }
            else if (e.status !== 401) $('#adminDeniedText').textContent = e.message;
            return;
        }
        $('#adminMe').textContent = me.displayName;
        if (me.steppedUp) { stepUpUntil = Date.now() + 5 * 60000; showStepUp(); }
        $('#adminShell').hidden = false;
        const start = location.hash.slice(1);
        await Promise.all([openTab(loaders[start] ? start : 'overview', false), start && start !== 'overview' ? loaders.overview() : null]);
    })();
    window.HasadimLoading?.track(opening);
})();
