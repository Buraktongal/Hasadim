'use strict';

// QR kod ile giriş: giriş sayfasının sağ sütununda QR sürekli görünür; kullanıcı Hasadım mobil uygulamasında
// Hesap → "Bilgisayarda giriş (QR)" ile okutup onaylar. Gizli anahtar HttpOnly çerezde durur;
// bu dosya yalnızca QR'ı çizer ve durumu sorar. Sunucu: QrLoginController.
(() => {
    const panel = document.querySelector('#qrLoginPanel');
    if (!panel || typeof qrcode !== 'function') return;
    // Telefon ekranında QR gösterilmez (kişi kendi ekranını okutamaz); geniş ekrana geçilirse başlar.
    // Telefon/tablet (dokunmatik ekran veya mobil tarayıcı) ise QR hiç oluşturulmaz.
    const mobileAgent = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
    const wide = matchMedia('(min-width: 521px) and (pointer: fine)');
    // Sayfa açık bırakılırsa kod en fazla bu kadar kez kendiliğinden yenilenir; sonra düğmeyle yenilenir.
    const AUTO_RENEWALS = 5;
    let renewals = 0;
    const params = new URLSearchParams(location.search);
    const destination = () => window.HasadimReturn?.resolve(params.get('returnUrl')) || '/';
    const box = panel.querySelector('.qr-box');
    const state = panel.querySelector('[data-qr-state]');
    const timer = panel.querySelector('[data-qr-timer]');
    const svgNs = 'http://www.w3.org/2000/svg';
    let poll = null, tick = null, expiresAt = 0, active = false;

    let csrf = null;
    async function call(path) {
        if (!csrf) {
            const r = await fetch('/api/csrf', { credentials: 'same-origin' });
            if (!r.ok) throw new Error('Oturum başlatılamadı.');
            csrf = (await r.json()).token;
        }
        const res = await fetch('/api/account/qr/' + path, { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF-TOKEN': csrf } });
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.mesaj || (res.status === 429 ? 'Çok fazla deneme. Bir dakika sonra tekrar dene.' : 'QR kod oluşturulamadı.'));
        return body;
    }

    // QR, CSP'ye uygun olarak (data: adresi veya satır içi stil olmadan) SVG öğeleriyle çizilir.
    function draw(text) {
        const q = qrcode(0, 'M');
        q.addData(text);
        q.make();
        const n = q.getModuleCount(), pad = 4, size = n + pad * 2;
        const svg = document.createElementNS(svgNs, 'svg');
        svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
        svg.setAttribute('shape-rendering', 'crispEdges');
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', 'Hasadım uygulamasıyla okutulacak giriş QR kodu');
        const bg = document.createElementNS(svgNs, 'rect');
        bg.setAttribute('width', size); bg.setAttribute('height', size); bg.setAttribute('fill', '#fff');
        let d = '';
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + pad} ${r + pad}h1v1h-1z`;
        const path = document.createElementNS(svgNs, 'path');
        path.setAttribute('d', d); path.setAttribute('fill', '#16301f');
        svg.append(bg, path);
        box.replaceChildren(svg);
    }

    function setState(kind, text) {
        panel.dataset.state = kind;
        state.textContent = text;
    }

    function stop() { clearInterval(poll); clearInterval(tick); poll = tick = null; }

    async function start() {
        stop();
        setState('loading', 'QR kod hazırlanıyor…');
        box.replaceChildren();
        timer.textContent = '';
        try {
            const r = await call('start');
            // QR içeriği: sitenin kendi adresi + tek kullanımlık kod. Telefonun kendi kamerasıyla okutulursa
            // açılan sayfa, kodun Hasadım uygulamasından okutulması gerektiğini anlatır.
            draw(`${location.origin}/html/qr.html#c=${r.code}`);
            expiresAt = Date.now() + r.lifetimeSeconds * 1000;
            setState('pending', 'Telefonunda Hasadım uygulamasını aç ve bu kodu okut.');
            tick = setInterval(countdown, 1000); countdown();
            poll = setInterval(check, 2000);
        } catch (e) { setState('error', e.message); }
    }

    function countdown() {
        const left = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
        timer.textContent = left ? `Kod ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')} içinde yenilenir` : '';
        if (!left) renew();
    }

    // Süresi dolan kod yenilenir; çok uzun süre açık kalan sayfada sunucuya boşuna istek gitmesin diye sınırlıdır.
    function renew() {
        if (++renewals > AUTO_RENEWALS) { stop(); box.replaceChildren(); timer.textContent = ''; setState('idle', 'Kodun süresi doldu.'); call('cancel').catch(() => { }); return; }
        start();
    }

    let checking = false;
    async function check() {
        if (checking || document.hidden) return;
        checking = true;
        try {
            const r = await call('poll');
            if (r.status === 'scanned') setState('scanned', 'Kod okutuldu. Telefonundaki “Giriş yap” düğmesiyle onayla.');
            else if (r.status === 'rejected') { stop(); setState('rejected', 'Giriş isteği telefondan reddedildi.'); }
            else if (r.status === 'expired') renew();
            else if (r.status === 'signed-in') { stop(); setState('done', 'Giriş yapıldı, yönlendiriliyorsun…'); location.replace(destination()); }
        } catch (e) { stop(); setState('error', e.message); }
        finally { checking = false; }
    }

    function activate() {
        const show = wide.matches && !mobileAgent;
        document.querySelector('.auth-qr')?.toggleAttribute('hidden', !show);
        if (show && !active) { active = true; renewals = 0; start(); }
        else if (!show && active) { active = false; stop(); call('cancel').catch(() => { }); }
    }
    panel.querySelector('[data-qr-retry]').addEventListener('click', () => { renewals = 0; start(); });
    wide.addEventListener('change', activate);
    activate();
    // Sekme arka plandayken sorgu durur; geri gelince hemen bakılır.
    document.addEventListener('visibilitychange', () => { if (active && !document.hidden && poll) check(); });
})();
