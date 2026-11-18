'use strict';
// İlan düzenlerken mevcut fotoğraflar: kapak yap ve kaldır.
// İşlemler hemen kaydedilir; ardından formdaki ilan sürümü yenilenir.
window.ListingPhotos = (() => {
    const node = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
    let current = null, deps = null, notice = '';

    async function refresh() {
        const fresh = await deps.api('/api/meyve-ilanlari/' + current.id);
        const form = document.querySelector('#editorForm');
        form.elements.namedItem('version').value = fresh.version;
        form.dataset.photoCount = String(fresh.photos?.length || 0);
        form.elements.namedItem('photo').required = !fresh.photos?.length;
        current = fresh;
        deps.onChange?.(fresh);
        draw();
    }

    async function run(button, task, message) {
        button.disabled = true;
        try { await task(); notice = message; await refresh(); }
        catch (error) { notice = error.message; button.disabled = false; draw(); }
    }

    function draw() {
        const root = document.querySelector('#existingPhotos');
        if (!root) return;
        const photos = current?.photos || [];
        root.hidden = !photos.length;
        root.replaceChildren();
        if (!photos.length) return;
        root.append(node('h4', 'İlandaki fotoğraflar (' + photos.length + '/10)'),
            node('p', 'Kapak ve kaldırma işlemleri hemen kaydedilir. Yeni fotoğraf eklemek için yukarıdan seç.', 'muted'));
        if (notice) { const n = node('p', notice, 'photo-status'); n.setAttribute('role', 'status'); root.append(n); }
        const grid = node('div', undefined, 'existing-grid');
        photos.forEach((photo, index) => {
            const item = node('figure', undefined, 'existing-photo' + (index === 0 ? ' is-cover' : ''));
            const img = node('img'); img.src = photo.photoUrl; img.alt = 'Fotoğraf ' + (index + 1); img.loading = 'lazy';
            item.append(img);
            if (index === 0) item.append(node('span', 'Kapak', 'cover-badge'));
            const actions = node('figcaption');
            if (index > 0) {
                const cover = node('button', 'Kapak yap', 'textbtn'); cover.type = 'button';
                cover.onclick = () => run(cover, () => deps.api('/api/meyve-ilanlari/' + current.id + '/photos/' + photo.id + '/cover', 'POST'), 'Kapak fotoğrafı güncellendi.');
                actions.append(cover);
            }
            const remove = node('button', 'Kaldır', 'textbtn danger-text'); remove.type = 'button';
            remove.disabled = photos.length <= 1;
            if (photos.length <= 1) remove.title = 'İlanda en az bir fotoğraf kalmalı.';
            remove.onclick = async () => {
                const ok = window.HasadimConfirm
                    ? await window.HasadimConfirm('Bu fotoğraf ilandan kaldırılsın mı?', { okText: 'Kaldır', danger: true })
                    : confirm('Bu fotoğraf ilandan kaldırılsın mı?');
                if (!ok) return;
                await run(remove, () => deps.api('/api/meyve-ilanlari/' + current.id + '/photos/' + photo.id, 'DELETE'), 'Fotoğraf kaldırıldı.');
            };
            actions.append(remove);
            item.append(actions);
            grid.append(item);
        });
        root.append(grid);
    }

    // x: düzenlenen ilan (yeni ilanda null). dependencies: { api, toast, onChange }
    function render(x, dependencies) {
        deps = dependencies;
        current = x && x.id ? x : null;
        notice = '';
        draw();
    }

    return { render };
})();
