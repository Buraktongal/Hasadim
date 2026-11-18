'use strict';
// Hesap güvenliği: iki adımlı doğrulamayı açma / kapatma.
// account.js'teki api, token ve status yardımcılarını kullanır.
window.HasadimSecurity = (() => {
    const q = s => document.querySelector(s);
    const parts = {
        badge: q('#twoFactorBadge'), off: q('#twoFactorOff'), on: q('#twoFactorOn'), setup: q('#twoFactorSetup'),
        setupForm: q('#setupForm'), key: q('#setupKey'), recovery: q('#recoveryBox')
    };
    let downloadUrl = null;

    function setStep(step) {
        for (const item of document.querySelectorAll('[data-setup-step]')) {
            const n = Number(item.dataset.setupStep);
            item.classList.toggle('is-current', n === step);
            item.classList.toggle('is-done', n < step);
        }
        parts.setupForm.hidden = step !== 1;
        parts.key.hidden = step !== 2;
        parts.recovery.hidden = step !== 3;
    }

    function show(state, left = 0) {
        // state: 'off' | 'setup' | 'on'
        parts.badge.textContent = state === 'on' ? 'Açık' : state === 'setup' ? 'Kuruluyor' : 'Kapalı';
        parts.badge.className = 'state-pill ' + (state === 'on' ? 'is-on' : state === 'setup' ? 'is-pending' : 'is-off');
        parts.off.hidden = state !== 'off';
        parts.setup.hidden = state !== 'setup';
        parts.on.hidden = state !== 'on';
        if (state === 'on') q('#recoveryLeft').textContent = left
            ? 'Kullanılmamış ' + left + ' kurtarma kodun var. Telefonuna ulaşamazsan girişte bunlardan birini kullanabilirsin.'
            : 'Kullanılmamış kurtarma kodun kalmadı. Kodları yenilemek için doğrulamayı kapatıp yeniden aç.';
    }

    async function load() {
        try {
            const s = await api('2fa/status');
            show(s.enabled ? 'on' : 'off', s.recoveryCodesLeft);
        } catch (e) { status(e.message, true); }
    }

    function copy(text, button) {
        const done = () => { const t = button.textContent; button.textContent = 'Kopyalandı ✓'; setTimeout(() => { button.textContent = t; }, 1600); };
        navigator.clipboard?.writeText(text).then(done).catch(() => status('Kopyalanamadı; metni seçip kopyalayabilirsin.', true));
    }

    q('#startTwoFactor').onclick = () => {
        show('setup'); setStep(1); status('');
        parts.setupForm.reset(); parts.setupForm.elements.namedItem('password').focus();
    };
    for (const b of document.querySelectorAll('[data-cancel-setup]')) b.onclick = () => { status(''); load(); };

    function guard(form, task) {
        form.addEventListener('submit', async e => {
            e.preventDefault();
            const b = form.querySelector('[type="submit"]');
            if (b.disabled || !form.reportValidity()) return;
            b.disabled = true; status('');
            try { await task(Object.fromEntries(new FormData(form))); }
            catch (err) { status(err.message, true); }
            finally { b.disabled = false; }
        });
    }

    // 1) Şifreyi onayla → anahtar üretilir.
    guard(parts.setupForm, async d => {
        const r = await api('2fa/setup', d);
        await token();
        parts.setupForm.reset();
        const key = String(r.key || '');
        q('#authenticatorKey').textContent = key.replace(/(.{4})/g, '$1 ').trim();
        q('#copyKey').onclick = () => copy(key, q('#copyKey'));
        const label = encodeURIComponent('Hasadım:' + (r.email || ''));
        q('#authenticatorLink').href = 'otpauth://totp/' + label + '?secret=' + encodeURIComponent(key) + '&issuer=' + encodeURIComponent('Hasadım') + '&digits=6';
        setStep(2);
        q('#enableForm').reset();
        q('#enableForm [name=code]').focus();
    });

    // 2) Uygulamadaki kodu doğrula → doğrulama açılır, kurtarma kodları gösterilir.
    guard(q('#enableForm'), async d => {
        const r = await api('2fa/enable', d);
        await token();
        const codes = (r.codes || []).join('\n');
        q('#recoveryCodes').textContent = codes;
        q('#copyCodes').onclick = () => copy(codes, q('#copyCodes'));
        if (downloadUrl) URL.revokeObjectURL(downloadUrl);
        downloadUrl = URL.createObjectURL(new Blob(['Hasadım kurtarma kodları\n\n' + codes + '\n'], { type: 'text/plain' }));
        q('#downloadCodes').href = downloadUrl;
        q('#authenticatorKey').textContent = '';
        parts.badge.textContent = 'Açık'; parts.badge.className = 'state-pill is-on';
        setStep(3);
        status('İki adımlı doğrulama açıldı. Kurtarma kodlarını şimdi kaydet.');
    });

    // 3) Kodlar kaydedildi → özet görünüm.
    q('#finishSetup').onclick = () => {
        q('#recoveryCodes').textContent = '';
        if (downloadUrl) { URL.revokeObjectURL(downloadUrl); downloadUrl = null; }
        status('');
        load();
    };

    // Kapatma: şifre ister.
    guard(q('#disableForm'), async d => {
        const r = await api('2fa/disable', d);
        await token();
        q('#disableForm').reset();
        await load();
        status(r.mesaj);
    });

    return { load };
})();
