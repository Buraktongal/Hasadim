'use strict';

// İlan detayındaki "Teklif ver" penceresi. Ürünlerde birim fiyat + miktar,
// arazide toplam fiyat teklifi gönderilir.
window.OfferDialog = (() => {
    const node = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
    const money = (v, digits = 2) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: digits }).format(v);
    const unitOf = x => ({ kg: 'kg', balya: 'balya', m2: 'm²' })[x.birim] || 'kg';

    function field(label, input, hint) {
        const l = node('label', label);
        l.append(input);
        if (hint) l.append(node('small', hint, 'muted'));
        return l;
    }

    function open(x, { api, toast }) {
        const land = x.kategori === 'Arazi';
        const u = unitOf(x);
        const dialog = node('dialog', undefined, 'offer-dialog');
        dialog.setAttribute('aria-labelledby', 'offerTitle');
        const head = node('div', undefined, 'dialog-head');
        const title = node('h2', 'Teklif ver');
        title.id = 'offerTitle';
        const close = node('button', '×', 'close');
        close.type = 'button'; close.setAttribute('aria-label', 'Kapat');
        close.onclick = () => dialog.close();
        head.append(title, close);
        const context = node('p', x.baslik + ' · İlan fiyatı: ' + money(x.kilogramFiyati, land ? 0 : 2) + (land ? '' : ' / ' + u), 'muted');
        const form = node('form');
        const amount = node('input');
        amount.type = 'number'; amount.name = 'amount'; amount.required = true; amount.step = '0.01'; amount.min = '0.01';
        amount.max = land ? '10000000000' : '1000000'; amount.inputMode = 'decimal';
        amount.value = String(land ? Math.round(x.kilogramFiyati * 0.95) : Math.round(x.kilogramFiyati * 0.95 * 100) / 100);
        form.append(field(land ? 'Teklif ettiğin toplam fiyat (TL)' : 'Teklif ettiğin fiyat (TL/' + u + ')', amount));
        let quantity = null;
        if (!land) {
            quantity = node('input');
            quantity.type = 'number'; quantity.name = 'quantity'; quantity.required = true; quantity.step = '0.01';
            quantity.min = String(x.minAlimKg || 0.01); quantity.max = String(x.miktarKg); quantity.inputMode = 'decimal';
            quantity.value = String(Math.min(x.miktarKg, Math.max(x.minAlimKg || 0, Math.round(x.miktarKg / 4))));
            form.append(field('Almak istediğin miktar (' + u + ')', quantity,
                (x.minAlimKg ? 'En az ' + new Intl.NumberFormat('tr-TR').format(x.minAlimKg) + ' ' + u + ', ' : '') + 'en çok ' + new Intl.NumberFormat('tr-TR').format(x.miktarKg) + ' ' + u + '.'));
        }
        const total = node('p', '', 'offer-total');
        total.setAttribute('aria-live', 'polite');
        const update = () => {
            const a = Number(amount.value), q = Number(quantity?.value);
            const diff = x.kilogramFiyati ? Math.round((a - x.kilogramFiyati) / x.kilogramFiyati * 1000) / 10 : 0;
            const parts = [];
            if (!land && a > 0 && q > 0) parts.push('Toplam: ' + money(a * q));
            if (a > 0 && diff) parts.push('İlan fiyatına göre %' + new Intl.NumberFormat('tr-TR').format(Math.abs(diff)) + (diff < 0 ? ' düşük' : ' yüksek'));
            total.textContent = parts.join(' · ');
        };
        amount.addEventListener('input', update); quantity?.addEventListener('input', update); update();
        const note = node('textarea');
        note.name = 'note'; note.maxLength = 500; note.rows = 3;
        note.placeholder = land ? 'Ödeme planı, tapu devri tarihi…' : 'Teslim tarihi, ödeme şekli, nakliye…';
        form.append(field('Not (isteğe bağlı)', note));
        const error = node('p', '', 'form-error'); error.setAttribute('role', 'alert');
        const send = node('button', 'Teklifi gönder', 'primary full'); send.type = 'submit';
        form.append(total, error, send,
            node('small', 'Teklif bağlayıcı bir sipariş değildir. Satıcı kabul ederse mesajlaşarak satışı tamamlarsınız. Teklifini Tekliflerim sayfasından takip edebilirsin.', 'muted'));
        form.onsubmit = async event => {
            event.preventDefault();
            if (!form.reportValidity()) return;
            send.disabled = true; error.textContent = '';
            try {
                const result = await api('/api/offers', 'POST', {
                    listingId: x.id, amount: Number(amount.value), quantity: quantity ? Number(quantity.value) : null, note: note.value.trim() || null
                });
                dialog.close();
                toast?.(result?.mesaj || 'Teklifin satıcıya iletildi.');
            } catch (e) { error.textContent = e.message; }
            finally { send.disabled = false; }
        };
        dialog.append(head, context, form);
        dialog.addEventListener('close', () => dialog.remove());
        document.body.append(dialog);
        dialog.showModal();
        amount.focus?.();
    }

    return { open };
})();
