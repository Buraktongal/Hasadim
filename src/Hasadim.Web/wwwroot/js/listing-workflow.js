'use strict';

(() => {
    const states = [
        'Taslak', 'İncelemede', 'Düzeltme bekliyor',
        'Onaylı · Yayın bekliyor', 'Yayında', 'Süresi doldu', 'Satıldı'
    ];
    let reviewPage = 1;
    let queueRequest = 0;

    function editable(x) {
        return x.isMine && !x.hidden && [0, 2].includes(x.status);
    }

    function appendStatus(parent, x) {
        if (!x.isMine && !user?.isAdmin) return;
        const box = el('section', undefined, 'listing-status');
        box.append(el('strong', x.hidden
            ? 'Yönetim tarafından gizlendi'
            : states[x.status] || x.statusText));
        if (x.reviewNote) {
            box.append(el('p', 'Düzeltme gerekçesi: ' + x.reviewNote));
        }
        if (x.status === 1) {
            box.append(el('p', 'İlanın kontrol ediliyor. Sonucu İlanlarım bölümünden takip edebilirsin.'));
        }
        if (x.status === 3)
            box.append(el('p', 'İlan daha önce onaylanmış. Yönetim 30 günlük yayını başlatabilir.'));
        if (x.publishedAt) box.append(el('p', 'Yayın başlangıcı: ' + displayDate(x.publishedAt)));
        if (x.expiresAt) box.append(el('p', 'Yayın bitişi: ' + displayDate(x.expiresAt)));
        if (x.status === 5)
            box.append(el('p', 'Yayın süresi doldu. İlanın Geçmiş ilanlar bölümünde saklanıyor.'));
        parent.append(box);
    }

    function displayDate(value) {
        const utc = /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : value + 'Z';
        return new Intl.DateTimeFormat('tr-TR', {
            dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Istanbul'
        }).format(new Date(utc));
    }

    async function loadQueue(page = reviewPage) {
        const root = document.querySelector('#reviewQueue');
        if (!root) return;
        const request = ++queueRequest;
        reviewPage = page;
        root.replaceChildren(el('p', 'İnceleme bekleyen ilanlar yükleniyor…'));
        try {
            const data = await api('/api/admin/listings/pending?page=' + page);
            if (request !== queueRequest) return;
            if (!data.items.length && page > 1) return loadQueue(page - 1);
            root.replaceChildren();
            if (!data.items.length) {
                root.append(el('p', 'İnceleme bekleyen ilan yok.'));
                return;
            }
            for (const x of data.items) {
                const card = el('article', undefined, 'review-card');
                card.append(el('h3', x.baslik),
                    el('p', 'İlan No: ' + x.listingNumber + ' · ' + x.ownerName),
                    el('p', x.il + ' / ' + x.ilce),
                    button('İlanı incele', 'secondary', () => openDetail(x.id)));
                root.append(card);
            }
            const navigation = el('div', undefined, 'pagination');
            const previous = button('← Önceki', 'secondary', () => loadQueue(page - 1));
            const next = button('Sonraki →', 'secondary', () => loadQueue(page + 1));
            previous.disabled = page <= 1;
            next.disabled = page * data.pageSize >= data.total;
            navigation.append(previous,
                el('span', page + ' / ' + Math.ceil(data.total / data.pageSize)), next);
            root.append(navigation);
        } catch (error) {
            if (request === queueRequest) root.replaceChildren(el('p', error.message, 'form-error'));
        }
    }

    function appendReviewActions(parent, x) {
        if (!user?.isAdmin || ![1, 3].includes(x.status) || x.hidden) return;
        const box = el('section', undefined, 'review-card');
        const form = el('form');
        const label = el('label', 'Eksik veya hatalı bilgi varsa gerekçesini yaz');
        const note = el('textarea');
        note.required = true;
        note.maxLength = 1000;
        note.rows = 4;
        label.append(note);
        const error = el('p', '', 'form-error');
        error.setAttribute('role', 'alert');
        const approve = button(x.status === 3 ? '30 günlük yayını başlat' : 'Onayla ve yayımla', 'primary', () => decide('approve'));
        const changes = el('button', 'Düzeltme iste', 'secondary');
        changes.type = 'submit';
        form.append(label, changes);
        form.hidden = x.status === 3;
        box.append(el('h3', 'İlan incelemesi'),
            el('p', 'Onaylanan ilan hemen yayımlanır. Yayın süresi 30 gündür.'),
            approve, form, error);
        parent.append(box);

        form.onsubmit = event => {
            event.preventDefault();
            if (!note.value.trim()) {
                error.textContent = 'Düzeltme gerekçesini yazın.';
                note.focus();
                return;
            }
            return decide('request-changes');
        };

        async function decide(action) {
            if (approve.disabled) return;
            approve.disabled = changes.disabled = true;
            error.textContent = '';
            try {
                const body = { version: x.version };
                if (action === 'request-changes') body.note = note.value.trim();
                await api('/api/admin/listings/' + x.id + '/' + action, 'POST', body);
            } catch (failure) {
                error.textContent = failure.message;
                approve.disabled = changes.disabled = false;
                return;
            }
            // Eski sürümle ikinci karar verilmesini engelle.
            await renderDetail(x.id);
        }
    }

    function bindEditor() {
        const form = document.querySelector('#editorForm');
        form.onsubmit = event => {
            event.preventDefault();
            if (!form.reportValidity()) return;
            return submit(form, async () => {
                const data = new FormData(form);
                const files = data.getAll('photo').filter(file => file.size);
                const id = data.get('id');
                if (!id && !files.length) throw Error('En az bir fotoğraf seçin.');
                if (files.length + Number(form.dataset.photoCount || 0) > 10)
                    throw Error('En fazla 10 fotoğraf yükleyebilirsiniz.');
                for (const file of files) {
                    if (file.size > 5_000_000) throw Error('Her fotoğraf en fazla 5 MB olabilir.');
                    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
                        throw Error('JPG, PNG veya WebP seçin.');
                }
                const body = {};
                for (const key of ['baslik', 'meyveTuru', 'cesit', 'il', 'ilce', 'aciklama'])
                    body[key] = String(data.get(key) || '').trim();
                body.miktarKg = Number(data.get('miktarKg'));
                body.kilogramFiyati = Number(data.get('kilogramFiyati'));
                body.hasatTarihi = data.get('hasatTarihi') || null;
                body.version = data.get('version') || null;

                let result;
                if (!id) {
                    const upload = new FormData();
                    upload.append('listing', JSON.stringify(body));
                    for (const file of files) upload.append('files', file);
                    result = await api('/api/meyve-ilanlari/with-photos', 'POST', upload);
                } else {
                    if (files.length) {
                        const before = await api('/api/meyve-ilanlari/' + id);
                        if (before.version !== body.version)
                            throw Error('İlan başka bir işlemle değişti. Sayfayı yenileyin.');
                        const upload = new FormData();
                        for (const file of files) upload.append('files', file);
                        await api('/api/meyve-ilanlari/' + id + '/photos', 'POST', upload);
                        resetSelectedPhotos();
                        const fresh = await api('/api/meyve-ilanlari/' + id);
                        form.elements.namedItem('version').value = fresh.version;
                        form.dataset.photoCount = String(fresh.photos.length);
                        form.elements.namedItem('photo').required = false;
                        body.version = fresh.version;
                    }
                    result = await api('/api/meyve-ilanlari/' + id, 'PUT', body);
                }
                close('editorDialog');
                if (isDetailPage()) {
                    await renderDetail(result.id);
                    return;
                }
                await changeView('mine');
                toast(result.mesaj || 'İlanın yayımlandı. 30 gün boyunca yayında kalacak.');
            });
        };
    }

    window.ListingWorkflow = {
        editable, appendStatus, loadQueue, appendReviewActions, bindEditor
    };
})();
