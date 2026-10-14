'use strict';

(() => {
    const input = document.querySelector(
        '#editorForm [name="telefon"]'
    );

    if (!input) return;

    const emptyMask = '05xx xxx xx xx';
    const warning =
        'Telefon numarası eksik. Örnek: 0511 111 11 11';

    // Sınırı biçimlendirme kodu uygular.
    input.removeAttribute('maxlength');
    input.defaultValue = emptyMask;

    function formatPhone(preserveCursor = false) {
        const previous = input.value;
        const cursor = input.selectionStart ?? previous.length;

        let cursorDigits = previous
            .slice(0, cursor)
            .replace(/\D/g, '')
            .length;

        let digits = previous.replace(/\D/g, '');

        if (digits.startsWith('905')) {
            digits = '0' + digits.slice(2);
            cursorDigits = Math.max(0, cursorDigits - 1);
        }

        if (!digits.startsWith('05')) {
            const remaining = digits.replace(/^0?5?/, '');
            const removed = digits.length - remaining.length;

            digits = '05' + remaining;
            cursorDigits += 2 - removed;
        }

        // Toplam 11 rakam: sabit 05 ve kullanıcıdan 9 rakam.
        digits = digits.slice(0, 11);

        const masked = digits.padEnd(11, 'x');

        input.value = [
            masked.slice(0, 4),
            masked.slice(4, 7),
            masked.slice(7, 9),
            masked.slice(9, 11)
        ].join(' ');

        input.setCustomValidity(
            digits.length === 11 ? '' : warning
        );

        if (!preserveCursor) return;

        const target = Math.min(
            digits.length,
            Math.max(2, cursorDigits)
        );

        let position = 0;
        let count = 0;

        while (position < input.value.length && count < target) {
            if (/\d/.test(input.value[position])) count++;
            position++;
        }

        // İmleci boşluktan sonraki giriş alanına taşı.
        while (input.value[position] === ' ') position++;

        input.setSelectionRange(position, position);
    }

    input.addEventListener('input', () => formatPhone(true));

    input.addEventListener('focus', () => {
        formatPhone();

        const firstEmpty = input.value.indexOf('x');
        const position = firstEmpty === -1
            ? input.value.length
            : firstEmpty;

        input.setSelectionRange(position, position);
    });

    input.form.addEventListener('reset', () => {
        input.setCustomValidity(warning);
    });

    window.formatListingPhone = () => formatPhone();

    formatPhone();
})();