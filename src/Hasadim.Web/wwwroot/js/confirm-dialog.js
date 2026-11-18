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
