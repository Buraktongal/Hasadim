'use strict';

// Ayarlar: tema, dil, bildirim tercihleri ve hesap silme.
(() => {
    const api = window.HasadimApi;
    const $ = s => document.querySelector(s);
    let user = null;
    let saving = Promise.resolve();
    const status = text => { const s = $('#settingsStatus'); if (s) s.textContent = text; };

    function current() {
        const value = name => document.querySelector(`input[name="${name}"]:checked`)?.value;
        const form = $('#notifyForm');
        const check = name => Boolean(form?.elements.namedItem(name)?.checked);
        const follow = $('#themeFollow')?.checked;
        return {
            theme: follow ? 'system' : (value('theme') || 'light'), language: value('language') || 'tr',
            notifyMessages: check('notifyMessages'), notifyOffers: check('notifyOffers'),
            notifySavedSearches: check('notifySavedSearches'), notifyPriceDrops: check('notifyPriceDrops')
        };
    }

    // "Cihaza göre" açıkken açık/koyu seçimi pasif görünür ve cihazın şu anki modunu gösterir.
    function syncThemeControls(theme) {
        const follow = theme === 'system';
        const toggle = $('#themeFollow');
        if (toggle) toggle.checked = follow;
        const shown = follow ? (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light') : theme;
        const radio = document.querySelector(`input[name="theme"][value="${shown}"]`);
        if (radio) radio.checked = true;
        const choices = $('#themeChoices');
        if (choices) {
            choices.classList.toggle('is-following', follow);
            for (const input of choices.querySelectorAll('input')) input.disabled = follow;
        }
    }

    function fill(s) {
        syncThemeControls(s.theme || 'system');
        for (const [name, value] of [['language', s.language]]) {
            const input = document.querySelector(`input[name="${name}"][value="${value}"]`);
            if (input) input.checked = true;
        }
        const form = $('#notifyForm');
        for (const key of ['notifyMessages', 'notifyOffers', 'notifySavedSearches', 'notifyPriceDrops']) {
            const field = form?.elements.namedItem(key);
            if (field) field.checked = s[key] !== false;
        }
    }

    // Değişiklik hemen uygulanır; giriş yapılmışsa sunucuya da kaydedilir.
    function save() {
        const s = current();
        window.HasadimTheme?.set(s.theme);
        syncThemeControls(s.theme);
        const languageChanged = s.language !== (window.HasadimTheme?.language() || 'tr');
        if (languageChanged) {
            window.HasadimTheme?.setLanguage(s.language);
            window.HasadimI18n?.setLanguage(s.language);
        }
        if (!user) { status('Tercihin bu cihazda kaydedildi. Giriş yaparsan tüm cihazlarında geçerli olur.'); return; }
        saving = saving.then(async () => {
            try { await api('/api/me/settings', 'PUT', s); status('Ayarların kaydedildi.'); }
            catch (e) { status(e.message); }
        });
    }

    async function init() {
        fill({ theme: window.HasadimTheme?.get() || 'system', language: window.HasadimTheme?.language() || 'tr' });
        for (const input of document.querySelectorAll('#themeFollow, input[name="theme"], input[name="language"], #notifyForm input')) input.addEventListener('change', save);
        try { user = await api('/api/account/me'); } catch { user = null; }
        for (const section of document.querySelectorAll('[data-auth-only]')) section.hidden = !user;
        if (!user) return;
        try {
            const s = await api('/api/me/settings');
            fill(s);
            // Sunucudaki tercih tüm cihazlarda geçerlidir.
            window.HasadimTheme?.set(s.theme);
            if ((s.language || 'tr') !== (window.HasadimTheme?.language() || 'tr')) {
                window.HasadimTheme?.setLanguage(s.language || 'tr');
                window.HasadimI18n?.setLanguage(s.language || 'tr');
            }
        } catch (e) { status(e.message); }
        const passwordField = $('[data-password-field]');
        if (passwordField) {
            passwordField.hidden = !user.hasPassword;
            const input = passwordField.querySelector('input');
            if (input) { input.required = Boolean(user.hasPassword); input.disabled = !user.hasPassword; }
        }
        const form = $('#deleteForm');
        form.onsubmit = async event => {
            event.preventDefault();
            const error = form.querySelector('.form-error');
            error.textContent = '';
            const confirmText = form.elements.namedItem('confirm').value.trim();
            if (confirmText !== 'HESABIMI SİL' && confirmText.toUpperCase() !== 'DELETE MY ACCOUNT') {
                error.textContent = 'Onay için kutuya HESABIMI SİL yaz.';
                return;
            }
            const ok = window.HasadimConfirm
                ? await window.HasadimConfirm('Hesabın ve tüm ilanların kalıcı olarak silinecek. Bu işlem geri alınamaz.', { title: 'Hesabın silinsin mi?', okText: 'Evet, hesabımı sil', danger: true })
                : confirm('Hesabın kalıcı olarak silinecek.');
            if (!ok) return;
            const submit = form.querySelector('[type="submit"]');
            submit.disabled = true;
            try {
                await api('/api/account/delete', 'POST', { password: form.elements.namedItem('password')?.value || null, confirm: confirmText });
                try { sessionStorage.clear(); } catch { }
                location.href = '/?hesap=silindi';
            } catch (e) { error.textContent = e.message; submit.disabled = false; }
        };
    }

    void init();
})();
