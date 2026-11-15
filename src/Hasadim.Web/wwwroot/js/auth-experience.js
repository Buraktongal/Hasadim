'use strict';
(() => {
    const destination = window.HasadimReturn.resolve(new URLSearchParams(location.search).get('returnUrl'));
    for (const link of document.querySelectorAll('[data-auth-link]')) {
        if (destination !== '/') link.href += '?returnUrl=' + encodeURIComponent(destination);
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
    const password = document.querySelector('#registerForm [name="password"]');
    if (password) {
        const checks = [...document.querySelectorAll('[data-password-rule]')];
        const update = () => {
            const value = password.value;
            const rules = { length: value.length >= 12, upper: /[A-Z]/.test(value), lower: /[a-z]/.test(value), digit: /[0-9]/.test(value) };
            for (const item of checks) {
                const valid = rules[item.dataset.passwordRule]; item.classList.toggle('met', valid);
                item.setAttribute('aria-label', item.textContent + (valid ? ': tamam' : ': gerekli'));
            }
        };
        password.addEventListener('input', update); update();
    }
})();
