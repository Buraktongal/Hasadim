'use strict';

// Profil ve kapak fotoğraflarının kadrajı (odak noktası + yakınlaştırma) ve büyütülerek gösterimi.
//  ProfilePhoto.apply(img, frame)  → kaydedilen kadrajı bir <img>'e uygular (object-fit: cover ile).
//  ProfilePhoto.lightbox(url, alt) → fotoğrafı ekranı kaplayan pencerede kırpmadan gösterir.
//  ProfilePhoto.editor({...})      → sürükleyerek konumlandırma ve yakınlaştırma penceresi; sonucu döndürür.
window.ProfilePhoto = (() => {
    const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    function apply(img, frame) {
        const f = frame || { x: 50, y: 50, zoom: 100 };
        img.style.objectPosition = f.x + '% ' + f.y + '%';
        img.style.transformOrigin = f.x + '% ' + f.y + '%';
        img.style.transform = f.zoom > 100 ? 'scale(' + f.zoom / 100 + ')' : '';
    }

    let box = null;
    function lightbox(url, alt) {
        if (!url) return;
        box ??= (() => { const d = el('dialog', 'pp-lightbox'); document.body.append(d); d.addEventListener('click', () => d.close()); return d; })();
        const img = el('img'); img.src = url; img.alt = alt || '';
        const close = el('button', 'pp-close', '×'); close.type = 'button'; close.setAttribute('aria-label', 'Kapat');
        box.replaceChildren(img, close);
        box.setAttribute('aria-label', alt || 'Fotoğraf');
        box.showModal();
    }

    // shape: 'cover' (geniş bant) veya 'avatar' (yuvarlatılmış kare).
    function editor({ title, url, frame, shape, onSave, onRemove, onPick }) {
        const d = el('dialog', 'pp-editor pp-' + shape);
        document.body.append(d);
        const state = { x: frame?.x ?? 50, y: frame?.y ?? 50, zoom: frame?.zoom ?? 100 };
        let file = null;
        const head = el('div', 'pp-head'); head.append(el('h2', null, title));
        const x = el('button', 'pp-x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Kapat'); head.append(x);
        const stage = el('div', 'pp-stage');
        const img = el('img'); img.alt = ''; img.draggable = false;
        const empty = el('p', 'pp-empty', 'Henüz fotoğraf yok. Aşağıdan bir fotoğraf seç.');
        stage.append(img, empty, el('span', 'pp-grid'));
        const hint = el('p', 'pp-hint', 'Fotoğrafı sürükleyerek konumlandır, kaydırıcıyla yakınlaştır.');
        const zoomRow = el('div', 'pp-zoom');
        const zoom = el('input'); zoom.type = 'range'; zoom.min = 100; zoom.max = 300; zoom.step = 1; zoom.value = state.zoom;
        zoomRow.append(el('span', null, '−'), zoom, el('span', null, '+'));
        zoom.setAttribute('aria-label', 'Yakınlaştırma');
        const fileInput = el('input'); fileInput.type = 'file'; fileInput.accept = 'image/jpeg,image/png,image/webp'; fileInput.hidden = true;
        const actions = el('div', 'pp-actions');
        const pick = el('button', 'secondary', 'Fotoğraf seç'); pick.type = 'button';
        const remove = el('button', 'textbtn pp-remove', 'Kaldır'); remove.type = 'button';
        const save = el('button', 'primary', 'Kaydet'); save.type = 'button';
        actions.append(remove, pick, save);
        const error = el('p', 'form-error'); error.setAttribute('role', 'alert');
        d.append(head, stage, hint, zoomRow, error, actions, fileInput);

        const render = () => { apply(img, state); zoom.value = state.zoom; };
        const show = src => { img.src = src; img.hidden = !src; empty.hidden = Boolean(src); stage.classList.toggle('has-image', Boolean(src)); zoomRow.hidden = hint.hidden = !src; remove.hidden = !src || !onRemove || Boolean(file); render(); };
        show(url);

        // Sürükleme: imleç sağa gidince fotoğraf da sağa kayar (odak noktası sola).
        let drag = null;
        stage.addEventListener('pointerdown', e => { if (!img.src) return; drag = { x: e.clientX, y: e.clientY, sx: state.x, sy: state.y }; stage.setPointerCapture(e.pointerId); stage.classList.add('dragging'); });
        stage.addEventListener('pointermove', e => {
            if (!drag) return;
            const r = stage.getBoundingClientRect(), k = 100 / (state.zoom / 100);
            state.x = clamp(Math.round(drag.sx - (e.clientX - drag.x) / r.width * k), 0, 100);
            state.y = clamp(Math.round(drag.sy - (e.clientY - drag.y) / r.height * k), 0, 100);
            render();
        });
        const end = () => { drag = null; stage.classList.remove('dragging'); };
        stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
        stage.addEventListener('wheel', e => { if (!img.src) return; e.preventDefault(); state.zoom = clamp(state.zoom - Math.sign(e.deltaY) * 8, 100, 300); render(); }, { passive: false });
        stage.tabIndex = 0;
        stage.setAttribute('aria-label', 'Fotoğraf konumu. Ok tuşlarıyla kaydır, artı ve eksi ile yakınlaştır.');
        stage.addEventListener('keydown', e => {
            const m = { ArrowLeft: [-2, 0], ArrowRight: [2, 0], ArrowUp: [0, -2], ArrowDown: [0, 2] }[e.key];
            if (m) { e.preventDefault(); state.x = clamp(state.x + m[0], 0, 100); state.y = clamp(state.y + m[1], 0, 100); render(); }
            if (e.key === '+' || e.key === '=') { state.zoom = clamp(state.zoom + 10, 100, 300); render(); }
            if (e.key === '-') { state.zoom = clamp(state.zoom - 10, 100, 300); render(); }
        });
        zoom.oninput = () => { state.zoom = +zoom.value; render(); };

        pick.onclick = () => fileInput.click();
        fileInput.onchange = () => {
            const f = fileInput.files?.[0]; if (!f) return;
            const max = shape === 'cover' ? 6e6 : 3e6;
            if (f.size > max) { error.textContent = 'Fotoğraf en fazla ' + max / 1e6 + ' MB olmalı.'; return; }
            error.textContent = '';
            file = f; onPick?.(f);
            Object.assign(state, { x: 50, y: 50, zoom: 100 });
            show(URL.createObjectURL(f));
        };
        const close = () => { d.close(); d.remove(); };
        x.onclick = close;
        d.addEventListener('cancel', e => { if (e.target !== d) return; e.preventDefault(); close(); }); // dosya seçiminden vazgeçmek pencereyi kapatmasın
        save.onclick = async () => {
            save.disabled = true; error.textContent = '';
            try { await onSave({ file, frame: { ...state } }); close(); }
            catch (e) { error.textContent = e.message; }
            finally { save.disabled = false; }
        };
        remove.onclick = async () => {
            remove.disabled = true;
            try { await onRemove(); close(); } catch (e) { error.textContent = e.message; } finally { remove.disabled = false; }
        };
        d.showModal();
        if (!url) fileInput.click();
    }

    return { apply, lightbox, editor };
})();
