'use strict';

// Robot / insan doğrulaması (sunucu tarafı: HumanCheck + RequireHuman).
// Korunan isteklere (giriş, kayıt, SMS kodu, şifre sıfırlama, ilan verme, geri bildirim)
// otomatik olarak doğrulama eklenir; sayfa kodlarının değişmesi gerekmez:
//   1) /api/human/challenge'dan tek kullanımlık bilet alınır.
//   2) İş kanıtı arka planda çözülür (SHA-256, ~0,1–1 sn; kullanıcı fark etmez).
//   3) Sunucu görsel kod istediyse kullanıcıya küçük bir pencerede sorulur.
//   4) İstek X-Human-* başlıklarıyla gönderilir; sunucu reddederse yeni biletle tekrar denenir.
window.HasadimHuman = (() => {
    const RULES = [
        [/^\/api\/account\/login$/, 'login'],
        [/^\/api\/account\/register$/, 'register'],
        [/^\/api\/account\/phone\/start$/, 'phone'],
        [/^\/api\/account\/(forgot-password|resend-confirmation)$/, 'forgot'],
        [/^\/api\/meyve-ilanlari\/with-photos$/, 'listing'],
        [/^\/api\/feedback$/, 'feedback']
    ];
    const lang = () => (window.HasadimTheme?.language?.() === 'en' ? 'en' : 'tr');
    const T = (tr, en) => (lang() === 'en' ? en : tr);

    function purposeOf(input, init) {
        const method = String(init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
        if (method !== 'POST') return null;
        let path;
        try { path = new URL(typeof input === 'string' ? input : input.url, location.origin).pathname; } catch { return null; }
        return RULES.find(([re]) => re.test(path))?.[1] ?? null;
    }

    // ---------- SHA-256 (iş kanıtı için, bağımlılıksız) ----------
    const K = new Uint32Array([
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
        0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
        0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
        0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
    const W = new Uint32Array(64);
    // Yalnızca ASCII metin için; ilk 32 bitlik kelimeyi (H0) döndürmek yeterli olmadığından tüm özet döner.
    function sha256(text) {
        const bytes = new Uint8Array(((text.length + 9 + 63) >> 6) << 6);
        for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i);
        bytes[text.length] = 0x80;
        const bits = text.length * 8;
        bytes[bytes.length - 4] = bits >>> 24; bytes[bytes.length - 3] = bits >>> 16; bytes[bytes.length - 2] = bits >>> 8; bytes[bytes.length - 1] = bits;
        let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a, h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
        for (let off = 0; off < bytes.length; off += 64) {
            for (let i = 0; i < 16; i++) W[i] = (bytes[off + i * 4] << 24) | (bytes[off + i * 4 + 1] << 16) | (bytes[off + i * 4 + 2] << 8) | bytes[off + i * 4 + 3];
            for (let i = 16; i < 64; i++) {
                const a = W[i - 15], b = W[i - 2];
                const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
                const s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
                W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0;
            }
            let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
            for (let i = 0; i < 64; i++) {
                const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
                const t1 = (h + S1 + ((e & f) ^ (~e & g)) + K[i] + W[i]) | 0;
                const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
                const t2 = (S0 + ((a & b) ^ (a & c) ^ (b & c))) | 0;
                h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
            }
            h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0; h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
        }
        return [h0, h1, h2, h3, h4, h5, h6, h7].map(x => x >>> 0);
    }
    const leadingZeros = words => { let n = 0; for (const w of words) { if (w === 0) { n += 32; continue; } return n + Math.clz32(w); } return n; };

    // Arayüzü kilitlememek için parça parça çözülür.
    async function solve(salt, difficulty) {
        let nonce = 0;
        for (;;) {
            const end = nonce + 5000;
            for (; nonce < end; nonce++) if (leadingZeros(sha256(salt + ':' + nonce)) >= difficulty) return nonce;
            await new Promise(r => setTimeout(r, 0));
        }
    }

    // ---------- Görsel kod penceresi ----------
    let dialog = null;
    function build() {
        dialog = document.createElement('dialog');
        dialog.className = 'human-dialog';
        dialog.setAttribute('aria-labelledby', 'humanTitle');
        dialog.innerHTML = `
            <form method="dialog" class="human-form" novalidate>
                <div class="human-head"><span class="human-badge" aria-hidden="true"></span><div><p class="eyebrow">Güvenlik</p><h2 id="humanTitle">Robot olmadığını doğrula</h2></div></div>
                <p class="human-text"></p>
                <div class="human-image"><img alt="Doğrulama kodu görseli"><button type="button" class="textbtn human-refresh">↻ Yeni kod</button></div>
                <label>Gördüğün kod<input name="answer" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="8" inputmode="text" required></label>
                <p class="human-error" role="alert"></p>
                <div class="human-actions"><button type="button" class="secondary human-cancel">Vazgeç</button><button type="submit" class="primary">Doğrula</button></div>
            </form>`;
        document.body.append(dialog);
        return dialog;
    }

    function showImage(svg) {
        const img = dialog.querySelector('img');
        if (img.src) URL.revokeObjectURL(img.src);
        img.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    }

    // Kullanıcıdan kodu ister; vazgeçerse null döner. refresh: yeni görsel almak için.
    function askImage(svg, message, refresh) {
        const d = dialog || build();
        const input = d.querySelector('input'), error = d.querySelector('.human-error');
        d.querySelector('.human-text').textContent = T('Gördüğün 5 karakteri yaz. Büyük/küçük harf fark etmez.', 'Type the 5 characters you see. Case doesn’t matter.');
        error.textContent = message || '';
        input.value = '';
        showImage(svg);
        return new Promise(resolve => {
            const finish = value => { d.close(); resolve(value); };
            d.querySelector('.human-cancel').onclick = () => finish(null);
            d.onclose = () => resolve(null);
            d.querySelector('.human-refresh').onclick = async () => {
                try { const next = await refresh(); showImage(next); error.textContent = ''; input.value = ''; input.focus(); }
                catch { error.textContent = T('Yeni kod alınamadı.', 'Could not get a new code.'); }
            };
            d.querySelector('form').onsubmit = e => {
                e.preventDefault();
                const value = input.value.toLocaleUpperCase('tr-TR').replace(/İ/g, 'I').replace(/[^A-Z0-9]/g, '');
                if (value.length < 4) { error.textContent = T('Kodu eksiksiz yaz.', 'Enter the full code.'); input.focus(); return; }
                d.onclose = null;
                finish(value);
            };
            if (!d.open) d.showModal();
            input.focus();
        });
    }

    // ---------- İstek sarmalayıcı ----------
    const original = window.fetch.bind(window);
    async function challenge(purpose) {
        const r = await original('/api/human/challenge?purpose=' + encodeURIComponent(purpose), { credentials: 'same-origin', headers: { Accept: 'application/json' } });
        if (!r.ok) throw new Error(r.status === 429 ? T('Çok fazla deneme. Bir dakika sonra tekrar dene.', 'Too many attempts. Try again in a minute.') : T('Güvenlik doğrulaması başlatılamadı.', 'Security check could not start.'));
        return r.json();
    }

    window.fetch = async (input, init = {}) => {
        const purpose = purposeOf(input, init);
        if (!purpose) return original(input, init);
        let message = null;
        for (let attempt = 0; attempt < 4; attempt++) {
            let c = await challenge(purpose);
            let answer = '';
            if (c.image) {
                let current = c;
                answer = await askImage(c.image, message, async () => { current = await challenge(purpose); return current.image; });
                c = current;
                if (answer === null) throw new Error(T('Güvenlik doğrulaması tamamlanmadı.', 'Security check was not completed.'));
            }
            const nonce = await solve(c.salt, c.difficulty);
            const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
            headers.set('X-Human-Token', c.token);
            headers.set('X-Human-Nonce', String(nonce));
            if (answer) headers.set('X-Human-Answer', answer);
            const response = await original(input, { ...init, headers });
            if (response.status !== 428) return response;
            const body = await response.clone().json().catch(() => null);
            message = body?.mesaj || null;
        }
        throw new Error(T('Güvenlik doğrulaması tamamlanamadı. Sayfayı yenileyip tekrar dene.', 'Security check failed. Refresh the page and try again.'));
    };

    return { sha256, solve, purposeOf };
})();
