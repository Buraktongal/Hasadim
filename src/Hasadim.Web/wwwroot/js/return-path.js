'use strict';
window.HasadimReturn = {
    resolve(value) {
        if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
        try {
            const url = new URL(value, 'https://hasadim.invalid');
            if (url.origin !== 'https://hasadim.invalid' || !['/', '/html/index.html', '/html/ilan.html', '/html/profilim.html', '/html/hesabim.html'].includes(url.pathname)) return '/';
            return url.pathname + url.search;
        } catch { return '/'; }
    }
};
