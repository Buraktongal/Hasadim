'use strict';
window.RegistrationPhone = (() => {
    function digits(value) {
        let text = value.replace(/\D/g, '');
        if (text.startsWith('90') && text.length > 10) text = text.slice(2);
        if (text.startsWith('0')) text = text.slice(1);
        return text.slice(0, 10);
    }
    function format(input, event) {
        const previous = input.value;
        const selection = input.selectionStart;
        const raw = previous.replace(/\D/g, '');
        const value = digits(previous);
        const removedPrefix = raw.startsWith('90') && raw.length > 10 ? 2 : raw.startsWith('0') ? 1 : 0;
        const before = Math.max(0, previous.slice(0, selection ?? previous.length).replace(/\D/g, '').length - removedPrefix);
        input.value = [value.slice(0, 3), value.slice(3, 6), value.slice(6, 8), value.slice(8, 10)].filter(Boolean).join(' ');
        input.setCustomValidity(/^5\d{9}$/.test(value) ? '' : '5 ile başlayan 10 haneli cep telefonu numaranı gir. Örnek: 555 555 55 55');
        if (selection !== null && selection !== undefined && event) {
            let position = 0, count = 0;
            while (position < input.value.length && count < before) {
                if (/\d/.test(input.value[position])) count++;
                position++;
            }
            if (!event.inputType?.startsWith('delete')) while (input.value[position] === ' ') position++;
            input.setSelectionRange(position, position);
        }
        return /^5\d{9}$/.test(value);
    }
    function bind(input) {
        input.addEventListener('input', event => { if (!event.isComposing) format(input, event); });
        input.addEventListener('blur', () => format(input));
        format(input);
    }
    return { bind, format, digits };
})();
