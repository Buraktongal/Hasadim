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
        summaries();
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

    // Ayarlar alt alta bir liste olarak görünür; bir bölüme basınca yalnızca o bölüm
    // ayrı bir sayfa gibi açılır (adres: ayarlar.html#gorunum). Geri düğmesi listeye döner.
    const sections = () => Array.from(document.querySelectorAll('[data-settings-section]'));
    function route() {
        const id = decodeURIComponent(location.hash.slice(1));
        const target = sections().find(x => x.id === id && (user || !['bildirim-ayarlari', 'hesap-sil', 'sifre'].includes(x.id)) && (x.id !== 'sifre' || !user || user.hasPassword));
        for (const section of sections()) section.hidden = section !== target;
        const menu = $('#settingsMenu');
        if (menu) menu.hidden = Boolean(target);
        const head = document.querySelector('.account-head');
        if (head) head.hidden = Boolean(target);
        if (target) { target.querySelector('h2')?.focus?.(); window.scrollTo?.(0, 0); }
        summaries();
    }
    function addBackButtons() {
        for (const section of sections()) {
            if (section.querySelector('.settings-back')) continue;
            const back = document.createElement('a');
            back.href = '#';
            back.className = 'settings-back';
            back.textContent = '← Ayarlar';
            back.onclick = event => { event.preventDefault(); history.pushState(null, '', location.pathname); route(); };
            section.prepend(back);
            section.querySelector('h2')?.setAttribute('tabindex', '-1');
        }
    }
    function summaries() {
        const s = current();
        const set = (key, text) => { const n = document.querySelector(`[data-summary="${key}"]`); if (n) n.textContent = text; };
        set('gorunum', s.theme === 'system' ? 'Cihaza göre' : s.theme === 'dark' ? 'Koyu mod' : 'Açık mod');
        set('dil', s.language === 'en' ? 'English' : 'Türkçe');
        const on = ['notifyMessages', 'notifyOffers', 'notifySavedSearches', 'notifyPriceDrops'].filter(k => s[k]).length;
        if (user) set('bildirim-ayarlari', on === 4 ? 'Tüm bildirimler açık' : on === 0 ? 'Tüm bildirimler kapalı' : on + ' / 4 bildirim açık');
    }

    // Şifre değiştirme (Ayarlar sayfası ve menü aynı işlevi kullanır).
    function bindPassword(form) {
        if (!form || form.dataset.bound) return;
        form.dataset.bound = '1';
        form.onsubmit = async event => {
            event.preventDefault();
            const error = form.querySelector('.form-error');
            const data = Object.fromEntries(new FormData(form));
            error.textContent = '';
            if (data.newPassword !== data.newPasswordConfirm) { error.textContent = 'Yeni şifreler eşleşmiyor.'; return; }
            const submit = form.querySelector('[type="submit"]');
            submit.disabled = true;
            try {
                await window.HasadimApi('/api/account/change-password', 'POST', data);
                try { sessionStorage.setItem('hasadim-auth-notice', JSON.stringify({ message: 'Şifren değiştirildi. Yeni şifrenle tekrar giriş yap.', email: '' })); } catch { }
                location.replace('/html/giris.html');
            } catch (e) { error.textContent = e.message; submit.disabled = false; }
        };
    }
    window.HasadimPasswordForm = bindPassword;

    async function init() {
        addBackButtons();
        window.addEventListener('hashchange', route);
        window.addEventListener('popstate', route);
        route();
        fill({ theme: window.HasadimTheme?.get() || 'system', language: window.HasadimTheme?.language() || 'tr' });
        for (const input of document.querySelectorAll('#themeFollow, input[name="theme"], input[name="language"], #notifyForm input')) input.addEventListener('change', save);
        try { user = await api('/api/account/me'); } catch { user = null; }
        for (const item of document.querySelectorAll('#settingsMenu [data-auth-only]')) item.hidden = !user || (item.hasAttribute('data-password-only') && !user.hasPassword);
        bindPassword($('#passwordForm'));
        route();
        if (!user) return;
        try {
            const s = await api('/api/me/settings');
            fill(s);
            // Sunucudaki tercih tüm cihazlarda geçerlidir.
            window.HasadimTheme?.set(s.theme);
            summaries();
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
