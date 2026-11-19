'use strict';
// Sitenin kendi onay penceresi (tarayıcının düz confirm kutusu yerine).
// Kullanım: if (await HasadimConfirm('Çıkış yapılsın mı?', { okText: 'Çıkış yap' })) { ... }
window.HasadimConfirm = (message, { title = 'Emin misin?', okText = 'Evet', cancelText = 'Vazgeç', danger = false } = {}) => {
    if (typeof HTMLDialogElement !== 'function') return Promise.resolve(confirm(message));
    return new Promise(resolve => {
        const dialog = document.createElement('dialog');
        dialog.className = 'confirm-dialog';
        dialog.setAttribute('aria-labelledby', 'confirmTitle');
        const heading = document.createElement('h2'); heading.id = 'confirmTitle'; heading.textContent = title;
        const text = document.createElement('p'); text.textContent = message;
        const actions = document.createElement('div'); actions.className = 'confirm-actions';
        const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'secondary'; cancel.textContent = cancelText;
        const ok = document.createElement('button'); ok.type = 'button'; ok.className = danger ? 'danger' : 'primary'; ok.textContent = okText;
        actions.append(cancel, ok);
        dialog.append(heading, text, actions);
        let answer = false;
        const finish = value => { answer = value; dialog.close(); };
        cancel.onclick = () => finish(false);
        ok.onclick = () => finish(true);
        dialog.addEventListener('click', e => { if (e.target === dialog) finish(false); });
        dialog.addEventListener('close', () => { dialog.remove(); resolve(answer); });
        document.body.append(dialog);
        dialog.showModal();
        cancel.focus();
    });
};

// Tek satırlık metin isteyen pencere. Vazgeçilirse null döner.
// Kullanım: const name = await HasadimPrompt('Arama adı', { value: 'Elma · Isparta' });
window.HasadimPrompt = (message, { title = 'Bilgi gir', value = '', okText = 'Kaydet', cancelText = 'Vazgeç', maxLength = 80 } = {}) => {
    if (typeof HTMLDialogElement !== 'function') return Promise.resolve(prompt(message, value));
    return new Promise(resolve => {
        const dialog = document.createElement('dialog');
        dialog.className = 'confirm-dialog';
        dialog.setAttribute('aria-labelledby', 'promptTitle');
        const heading = document.createElement('h2'); heading.id = 'promptTitle'; heading.textContent = title;
        const form = document.createElement('form');
        const label = document.createElement('label'); label.textContent = message;
        const input = document.createElement('input'); input.value = value; input.maxLength = maxLength; input.required = true;
        label.append(input);
        const actions = document.createElement('div'); actions.className = 'confirm-actions';
        const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'secondary'; cancel.textContent = cancelText;
        const ok = document.createElement('button'); ok.type = 'submit'; ok.className = 'primary'; ok.textContent = okText;
        actions.append(cancel, ok);
        form.append(label, actions);
        dialog.append(heading, form);
        let answer = null;
        cancel.onclick = () => dialog.close();
        form.onsubmit = e => { e.preventDefault(); answer = input.value.trim(); dialog.close(); };
        dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
        dialog.addEventListener('close', () => { dialog.remove(); resolve(answer); });
        document.body.append(dialog);
        dialog.showModal();
        input.focus(); input.select?.();
    });
};
