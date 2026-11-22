'use strict';

// Birden çok seçilebilen seçenekler (ör. Teslimat: Yerinden teslim + Kargo).
// <input type="hidden" name="teslimat" data-multi="A|B|C"> → işaretlenebilir çipler çizilir.
// Değer, gizli alanda ", " ile birleştirilmiş olarak tutulur; kodla değer verilince çipler de güncellenir.
window.MultiChoice = (() => {
    const native = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    function enhance(input) {
        if (input.dataset.multiReady) return;
        input.dataset.multiReady = '1';
        const options = input.dataset.multi.split('|');
        const box = document.createElement('div');
        box.className = 'multi-choice';
        box.setAttribute('role', 'group');
        if (input.getAttribute('aria-label')) box.setAttribute('aria-label', input.getAttribute('aria-label'));
        const chips = options.map(text => {
            const b = document.createElement('button');
            b.type = 'button'; b.className = 'multi-chip'; b.textContent = text; b.dataset.value = text;
            b.setAttribute('aria-pressed', 'false');
            b.onclick = () => {
                const set = new Set(read());
                if (set.has(text)) set.delete(text); else set.add(text);
                native.set.call(input, options.filter(o => set.has(o)).join(', '));
                paint();
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            };
            return b;
        });
        box.append(...chips);
        input.after(box);
        const read = () => native.get.call(input).split(',').map(s => s.trim()).filter(Boolean);
        const paint = () => {
            const on = new Set(read());
            for (const c of chips) { const v = on.has(c.dataset.value); c.classList.toggle('on', v); c.setAttribute('aria-pressed', String(v)); c.disabled = input.disabled; }
        };
        Object.defineProperty(input, 'value', { configurable: true, get() { return native.get.call(this); }, set(v) { native.set.call(this, v ?? ''); paint(); } });
        const disabled = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'disabled');
        Object.defineProperty(input, 'disabled', { configurable: true, get() { return disabled.get.call(this); }, set(v) { disabled.set.call(this, v); paint(); } });
        input.form?.addEventListener('reset', () => setTimeout(() => { native.set.call(input, ''); paint(); }));
        paint();
    }
    const scan = (root = document) => root.querySelectorAll?.('input[data-multi]').forEach(enhance);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => scan()); else scan();
    new MutationObserver(list => { for (const m of list) for (const n of m.addedNodes) if (n.nodeType === 1) scan(n); }).observe(document.documentElement, { childList: true, subtree: true });
    return { enhance };
})();
