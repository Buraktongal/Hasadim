'use strict';
// Giriş/kayıt sayfası: Google, Apple ve telefonla giriş seçenekleri.
// Google ve Apple düğmeleri sağlayıcıların kendi resmi düğmeleridir; yalnızca
// sunucuda yapılandırıldıysa yüklenir. Kimlik belirteci API'ye gönderilir,
// doğrulama sunucuda yapılır (account.js'teki api/status/token kullanılır).
(() => {
    const root = document.querySelector('#authProviders');
    if (!root) return;
    const params = new URLSearchParams(location.search);
    const destination = () => window.HasadimReturn?.resolve(params.get('returnUrl')) || '/';
    const busy = text => status(text);

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src; s.async = true; s.onload = resolve; s.onerror = () => reject(new Error(src));
            document.head.append(s);
        });
    }

    async function finishExternal(provider, idToken, nonce, displayName) {
        busy(provider === 'google' ? 'Google hesabın doğrulanıyor…' : 'Apple hesabın doğrulanıyor…');
        try {
            const r = await api('external', { provider, idToken, nonce: nonce || null, displayName: displayName || null });
            if (r?.created) { try { sessionStorage.setItem('hasadim-auth-notice', JSON.stringify({ message: r.mesaj })); } catch { } }
            location.replace(r?.created ? '/html/profilim.html' : destination());
        } catch (e) { status(e.message, true); }
    }

    // Yapılandırılmamış sağlayıcı için bilgilendirici, pasif düğme (logo kullanılmaz).
    function placeholder(slot, label) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'provider-button is-unavailable'; b.disabled = true;
        b.textContent = label;
        b.title = 'Bu giriş yöntemi henüz etkin değil.';
        slot.replaceChildren(b);
    }

    async function setupGoogle(slot, cfg) {
        if (!cfg?.enabled) return placeholder(slot, 'Google ile devam et (yakında)');
        try {
            await loadScript('https://accounts.google.com/gsi/client');
            window.google.accounts.id.initialize({
                client_id: cfg.clientId,
                callback: response => finishExternal('google', response.credential),
                ux_mode: 'popup', context: document.body.dataset.page === 'register' ? 'signup' : 'signin',
                itp_support: true
            });
            slot.replaceChildren();
            window.google.accounts.id.renderButton(slot, {
                type: 'standard', theme: 'outline', size: 'large', shape: 'pill',
                text: 'continue_with', logo_alignment: 'center', locale: 'tr',
                width: Math.min(400, Math.max(240, slot.clientWidth || 320))
            });
        } catch { placeholder(slot, 'Google ile giriş yüklenemedi'); }
    }

    async function setupApple(slot, cfg) {
        if (!cfg?.enabled) return placeholder(slot, 'Apple ile devam et (yakında)');
        try {
            await loadScript('https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/tr_TR/appleid.auth.js');
            const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
            // Apple'ın resmi düğmesi bu kapsayıcıya çizilir.
            const button = document.createElement('div');
            button.id = 'appleid-signin';
            Object.assign(button.dataset, { color: 'black', border: 'false', type: 'continue', mode: 'center-align', borderRadius: '50', height: '44', width: '100%' });
            slot.replaceChildren(button);
            window.AppleID.auth.init({ clientId: cfg.clientId, scope: 'name email', redirectURI: cfg.redirectUri, usePopup: true, nonce });
            document.addEventListener('AppleIDSignInOnSuccess', event => {
                const detail = event.detail || {};
                const name = detail.user?.name ? [detail.user.name.firstName, detail.user.name.lastName].filter(Boolean).join(' ') : '';
                finishExternal('apple', detail.authorization?.id_token, nonce, name);
            });
            document.addEventListener('AppleIDSignInOnFailure', event => {
                if (event.detail?.error !== 'popup_closed_by_user') status('Apple ile giriş tamamlanamadı.', true);
            });
        } catch { placeholder(slot, 'Apple ile giriş yüklenemedi'); }
    }

    // ---- Telefonla giriş ----
    function setupPhone(enabled) {
        const toggle = document.querySelector('#phoneLoginToggle');
        const form = document.querySelector('#phoneLoginForm');
        const codeForm = document.querySelector('#phoneCodeForm');
        const emailForm = document.querySelector('#loginForm');
        if (!toggle || !form || !codeForm) return;
        if (!enabled) { toggle.disabled = true; toggle.textContent = 'Telefon numarasıyla giriş (yakında)'; return; }
        const phone = form.elements.namedItem('phone');
        window.RegistrationPhone?.bind(phone);
        let ticket = null, timer = null;
        const showEmail = () => { form.hidden = true; codeForm.hidden = true; emailForm.hidden = false; toggle.textContent = 'Telefon numarasıyla giriş'; toggle.setAttribute('aria-expanded', 'false'); };
        const showPhone = () => { form.hidden = false; codeForm.hidden = true; emailForm.hidden = true; toggle.textContent = 'E-posta ile giriş'; toggle.setAttribute('aria-expanded', 'true'); phone.focus(); };
        toggle.onclick = () => (form.hidden && codeForm.hidden ? showPhone() : showEmail());
        const tick = () => {
            const left = ticket ? Math.max(0, Math.ceil((ticket.deadline - Date.now()) / 1000)) : 0;
            document.querySelector('#phoneTimer').textContent = left ? `Kalan süre: ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : 'Kodun süresi doldu. Yeni kod iste.';
            if (!left) clearInterval(timer);
        };
        form.addEventListener('submit', async e => {
            e.preventDefault();
            const valid = window.RegistrationPhone ? window.RegistrationPhone.format(phone) : true;
            if (!form.reportValidity() || !valid) return;
            const button = form.querySelector('[type=submit]'); button.disabled = true; status('');
            try {
                const digits = window.RegistrationPhone ? '0' + window.RegistrationPhone.digits(phone.value) : phone.value;
                const r = await api('phone/start', { phone: digits });
                ticket = { id: r.challengeId, deadline: Date.parse(r.expiresAt) };
                form.hidden = true; codeForm.hidden = false; codeForm.reset();
                clearInterval(timer); tick(); timer = setInterval(tick, 1000);
                codeForm.elements.namedItem('code').focus();
                status(r.mesaj);
            } catch (err) { status(err.message, true); }
            finally { button.disabled = false; }
        });
        codeForm.addEventListener('submit', async e => {
            e.preventDefault();
            if (!ticket || !codeForm.reportValidity()) return;
            const button = codeForm.querySelector('[type=submit]'); button.disabled = true;
            try {
                await api('phone/confirm', { challengeId: ticket.id, code: codeForm.elements.namedItem('code').value });
                location.replace(destination());
            } catch (err) { status(err.message, true); button.disabled = false; }
        });
        document.querySelector('#phoneRestart').onclick = () => { clearInterval(timer); ticket = null; showPhone(); status(''); };
    }

    (async () => {
        let cfg = {};
        try { cfg = await api('providers') || {}; } catch { cfg = {}; }
        const google = root.querySelector('[data-provider="google"]');
        const apple = root.querySelector('[data-provider="apple"]');
        if (google) setupGoogle(google, cfg.google);
        if (apple) setupApple(apple, cfg.apple);
        setupPhone(Boolean(cfg.phone?.enabled));
    })();
})();
