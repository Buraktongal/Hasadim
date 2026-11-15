'use strict';
(() => {
    const form = document.querySelector('#registerForm');
    if (!form) return;
    const codeForm = document.querySelector('#registrationCodeForm');
    const submit = form.querySelector('[type="submit"]') || form.querySelector('button');
    const confirm = document.querySelector('#completeRegistration');
    const restart = document.querySelector('#restartRegistration');
    const timer = document.querySelector('#registrationTimer');
    const phone = form.elements.namedItem('phone');
    window.RegistrationPhone.bind(phone);
    let ticket = null, timerId = null, sending = false, confirming = false;
    function updateTimer() {
        const seconds = ticket ? Math.max(0, Math.ceil((ticket.deadline - Date.now()) / 1000)) : 0;
        timer.textContent = seconds ? `Kalan süre: ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
            : 'Kodun süresi doldu. Yeni kod iste.';
        confirm.disabled = !seconds || confirming;
        if (!seconds) clearInterval(timerId);
    }
    form.addEventListener('submit', async event => {
        event.preventDefault();
        const validPhone = window.RegistrationPhone.format(phone);
        if (sending || !form.reportValidity() || !validPhone) return;
        sending = true; submit.disabled = true; status('Kod gönderiliyor…');
        try {
            const data = Object.fromEntries(new FormData(form));
            // API stores the national 11-digit form; the input shows 555 555 55 55.
            data.phone = '0' + window.RegistrationPhone.digits(phone.value);
            const response = await api('register', data);
            ticket = { id: response.challengeId, deadline: Date.parse(response.expiresAt) };
            form.elements.namedItem('password').value = '';
            form.hidden = true; codeForm.hidden = false; codeForm.reset();
            document.querySelector('#registrationEmail').textContent = data.email + ' adresine gönderilen kodu gir.';
            clearInterval(timerId); updateTimer(); timerId = setInterval(updateTimer, 1000);
            codeForm.elements.namedItem('code').focus();
            status(response.mesaj);
        } catch (error) { status(error.message, true); }
        finally { sending = false; submit.disabled = false; }
    });
    codeForm.addEventListener('submit', async event => {
        event.preventDefault();
        if (!ticket || confirming || confirm.disabled || !codeForm.reportValidity()) return;
        confirming = true; confirm.disabled = true; restart.disabled = true;
        try {
            const response = await api('register/confirm', { challengeId: ticket.id, code: codeForm.elements.namedItem('code').value });
            ticket = null; clearInterval(timerId); codeForm.reset(); codeForm.hidden = true; form.reset();
            status(response.mesaj);
        } catch (error) { status(error.message, true); }
        finally { confirming = false; restart.disabled = false; if (ticket) updateTimer(); }
    });
    restart.onclick = () => {
        if (confirming) return;
        clearInterval(timerId); ticket = null; codeForm.hidden = true; codeForm.reset(); form.hidden = false;
        status('Bilgilerini kontrol edip şifreni yeniden gir. Yeni kod isteği önceki kodu geçersiz kılar.');
        form.elements.namedItem('password').focus();
    };
})();
