'use strict';
// Giriş, kayıt ve şifre sayfalarının ortak davranışları:
// dönüş bağlantıları, şifre göster/gizle, şifre kuralları ve şifre tekrarı.
(() => {
    const destination = window.HasadimReturn.resolve(new URLSearchParams(location.search).get('returnUrl'));

    // Kayıt ↔ giriş arasında gezinirken kullanıcının geldiği sayfa korunur.
    for (const link of document.querySelectorAll('[data-auth-link]')) {
        if (destination !== '/') link.href += '?returnUrl=' + encodeURIComponent(destination);
    }
    // Üstteki geri bağlantısı, kullanıcı bir ilandan geldiyse oraya döner.
    for (const link of document.querySelectorAll('[data-return-link]')) {
        if (destination === '/') continue;
        link.href = destination;
        link.textContent = destination.startsWith('/html/ilan.html') ? '← İlana geri dön' : '← Kaldığın sayfaya dön';
    }

    for (const input of document.querySelectorAll('input[type="password"]')) {
        const wrapper = document.createElement('div'); wrapper.className = 'password-control';
        input.parentNode.insertBefore(wrapper, input); wrapper.append(input);
        const toggle = document.createElement('button'); toggle.type = 'button'; toggle.textContent = 'Göster';
        toggle.setAttribute('aria-label', 'Şifreyi göster'); toggle.setAttribute('aria-pressed', 'false');
        toggle.onclick = () => {
            const visible = input.type === 'password'; input.type = visible ? 'text' : 'password';
            toggle.textContent = visible ? 'Gizle' : 'Göster';
            toggle.setAttribute('aria-pressed', String(visible)); toggle.setAttribute('aria-label', visible ? 'Şifreyi gizle' : 'Şifreyi göster');
        };
        wrapper.append(toggle);
        const caps = document.createElement('small'); caps.textContent = 'Caps Lock açık.'; caps.hidden = true; caps.className = 'caps-warning';
        wrapper.parentNode.append(caps);
        input.addEventListener('keyup', event => { caps.hidden = !event.getModifierState?.('CapsLock'); });
        input.addEventListener('blur', () => { caps.hidden = true; });
    }

    // Şifre kuralları: her listenin bulunduğu formdaki "password" alanına bağlanır.
    for (const list of document.querySelectorAll('.password-rules')) {
        const password = list.closest('form')?.elements.namedItem('password');
        if (!password) continue;
        const checks = [...list.querySelectorAll('[data-password-rule]')];
        const update = () => {
            const value = password.value;
            const rules = { length: value.length >= 12, upper: /[A-ZÇĞİÖŞÜ]/.test(value), lower: /[a-zçğıöşü]/.test(value), digit: /[0-9]/.test(value) };
            for (const item of checks) {
                const valid = rules[item.dataset.passwordRule]; item.classList.toggle('met', valid);
                item.setAttribute('aria-label', item.textContent + (valid ? ': tamam' : ': gerekli'));
            }
        };
        password.addEventListener('input', update); update();
    }

    // Şifre tekrarı: iki alan aynı olmadan form gönderilmez.
    for (const confirm of document.querySelectorAll('[data-match]')) {
        const form = confirm.closest('form');
        const original = form?.elements.namedItem(confirm.dataset.match);
        if (!original) continue;
        const hint = form.querySelector(`[data-match-hint="${confirm.name}"]`);
        const update = () => {
            const filled = confirm.value.length > 0;
            const same = confirm.value === original.value;
            confirm.setCustomValidity(filled && !same ? 'Şifreler eşleşmiyor.' : '');
            if (!hint) return;
            hint.textContent = !filled ? '' : same ? '✓ Şifreler eşleşiyor' : 'Şifreler eşleşmiyor';
            hint.className = 'match-hint' + (!filled ? '' : same ? ' ok' : ' bad');
        };
        confirm.addEventListener('input', update);
        original.addEventListener('input', update);
        form.addEventListener('reset', () => setTimeout(update));
    }
})();
