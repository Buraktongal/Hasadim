'use strict';
window.MarketTools = (() => {
    const node = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
    function filterSummary(form, reload) {
        const root = document.querySelector('#activeFilters'); if (!root) return;
        root.replaceChildren();
        const labels = { q: 'Arama', meyveTuru: 'Meyve', cesit: 'Çeşit', il: 'İl', ilce: 'İlçe', minFiyat: 'En az TL/kg', maxFiyat: 'En çok TL/kg', minMiktar: 'En az kg', maxMiktar: 'En çok kg', ambalaj: 'Ambalaj', teslimat: 'Teslimat' };
        for (const [key, label] of Object.entries(labels)) {
            const field = form.elements.namedItem(key); if (!field?.value.trim()) continue;
            const chip = node('button', label + ': ' + field.value + ' ×', 'filter-chip'); chip.type = 'button';
            chip.setAttribute('aria-label', label + ' filtresini kaldır');
            chip.onclick = () => { field.value = ''; reload(); }; root.append(chip);
        }
        root.hidden = !root.children.length;
    }
    // Geniş ekranda "Detaylı arama" başlığa tıklayınca açılıp kapanır. İlk açılışta kapalıdır (yan sütun kısa kalır,
    // listeyle üst üste binmez); adreste fiyat, miktar, il gibi bir ayrıntılı filtre varsa açık başlar. Seçim oturum boyunca hatırlanır.
    function collapsible(form) {
        const heading = form.querySelector('.filter-heading');
        const title = heading?.querySelector('h3');
        if (!heading || !title || heading.querySelector('.filter-toggle')) return;
        const button = node('button', undefined, 'filter-toggle');
        button.type = 'button';
        button.setAttribute('aria-controls', form.id);
        button.append(node('span', title.textContent), node('span', undefined, 'filter-caret'));
        title.replaceChildren(button);
        const set = open => {
            form.classList.toggle('is-collapsed', !open);
            button.setAttribute('aria-expanded', String(open));
            try { sessionStorage.setItem('hasadim.detayliArama', open ? '1' : '0'); } catch { /* gizli sekme */ }
        };
        button.onclick = () => set(form.classList.contains('is-collapsed'));
        setTimeout(() => {
            const detailed = ['q', 'cesit', 'il', 'ilce', 'minFiyat', 'maxFiyat', 'minMiktar', 'maxMiktar', 'ambalaj', 'teslimat']
                .some(n => String(form.elements.namedItem(n)?.value || '').trim());
            let saved = null;
            try { saved = sessionStorage.getItem('hasadim.detayliArama'); } catch { /* gizli sekme */ }
            set(detailed || saved === '1');
        });
    }
    function bindFilters(form, reload) {
        const toggle = document.querySelector('#toggleFilters');
        if (toggle) toggle.onclick = () => {
            const open = toggle.getAttribute('aria-expanded') !== 'true';
            toggle.setAttribute('aria-expanded', String(open)); form.classList.toggle('filters-open', open);
        };
        collapsible(form);
        const quick = document.querySelector('#quickFruits');
        if (quick) for (const fruit of ['Elma', 'Armut', 'Mandalina', 'Nar', 'Üzüm', 'Avokado']) {
            const b = node('button', fruit, 'quick-fruit'); b.type = 'button';
            b.onclick = () => { form.elements.namedItem('meyveTuru').value = fruit; reload(); }; quick.append(b);
        }
    }
    function detailActions(x, { api, requireLogin, onFavorite }) {
        const root = node('div', undefined, 'detail-tools');
        const favorite = node('button', x.favorite ? '♥ Favorilerimde' : '♡ Favorilere ekle', 'secondary'); favorite.type = 'button';
        favorite.setAttribute('aria-pressed', String(Boolean(x.favorite)));
        const feedback = node('span', '', 'muted'); feedback.setAttribute('role', 'status');
        favorite.onclick = async () => {
            if (!requireLogin()) return; favorite.disabled = true;
            try {
                await api('/api/meyve-ilanlari/' + x.id + '/favorite', x.favorite ? 'DELETE' : 'POST');
                x.favoriteCount = Math.max(0, (x.favoriteCount || 0) + (x.favorite ? -1 : 1));
                x.favorite = !x.favorite; onFavorite?.(); favorite.textContent = x.favorite ? '♥ Favorilerimde' : '♡ Favorilere ekle';
                favorite.setAttribute('aria-pressed', String(x.favorite)); feedback.textContent = x.favorite ? 'İlan favorilerine eklendi.' : 'İlan favorilerinden çıkarıldı.';
            } catch (e) { feedback.textContent = e.message; }
            finally { favorite.disabled = false; }
        };
        const share = node('button', 'Bağlantıyı kopyala', 'secondary'); share.type = 'button';
        share.onclick = async () => {
            const link = new URL('/html/ilan.html?id=' + encodeURIComponent(x.id), location.href).href;
            try { await navigator.clipboard.writeText(link); feedback.textContent = 'İlan bağlantısı kopyalandı.'; }
            catch {
                feedback.replaceChildren();
                const field = node('input'); field.value = link; field.readOnly = true; field.setAttribute('aria-label', 'Kopyalanacak ilan bağlantısı');
                feedback.append(field); field.focus(); field.select?.();
            }
        };
        if (!x.isMine) root.append(favorite);
        root.append(share, feedback); return root;
    }
    return { bindFilters, filterSummary, detailActions };
})();
