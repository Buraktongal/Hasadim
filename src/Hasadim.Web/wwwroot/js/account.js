"use strict";
// Giriş, kayıt, şifre ve hesap güvenliği sayfalarının API işlemleri.
const $ = s => document.querySelector(s);
let csrf = "";
const params = new URLSearchParams(location.search);
const email = params.get("email"), linkToken = params.get("token");
// E-posta bağlantısındaki token adres çubuğunda ve geçmişte kalmasın.
if (linkToken) history.replaceState(null, "", location.pathname);

const NOTICE_KEY = "hasadim-auth-notice";
const returnTo = () => window.HasadimReturn?.resolve(params.get("returnUrl")) || "/";
const loginUrl = () => "/html/giris.html" + (returnTo() !== "/" ? "?returnUrl=" + encodeURIComponent(returnTo()) : "");

function status(text, error = false) {
    $("#accountStatus").textContent = text;
    $("#accountStatus").className = error ? "form-error" : "success";
}

// Sonraki sayfada gösterilecek kısa bilgi (ör. "Hesabın oluşturuldu").
function leaveNotice(message, address = "") {
    try { sessionStorage.setItem(NOTICE_KEY, JSON.stringify({ message, email: address })); } catch { }
}
function takeNotice() {
    try {
        const raw = sessionStorage.getItem(NOTICE_KEY);
        sessionStorage.removeItem(NOTICE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}
function goToLogin(message, address = "", delay = 0) {
    leaveNotice(message, address);
    const go = () => location.replace(loginUrl());
    if (delay) setTimeout(go, delay); else go();
}

async function token() {
    const r = await fetch("/api/csrf");
    if (!r.ok) throw Error("Oturum başlatılamadı.");
    csrf = (await r.json()).token;
}
async function api(path, data) {
    const method = data === undefined ? "GET" : "POST";
    if (method === "POST" && !csrf) await token();
    const r = await fetch("/api/account/" + path, {
        method,
        headers: method === "POST" ? { "Content-Type": "application/json", "X-CSRF-TOKEN": csrf } : {},
        body: data === undefined ? undefined : JSON.stringify(data)
    });
    const text = await r.text();
    let body;
    try { body = text ? JSON.parse(text) : null; } catch { }
    if (!r.ok) throw Error(body?.mesaj || (body?.errors ? Object.values(body.errors).flat().join(" ")
        : r.status === 429 ? "Çok fazla deneme. Bir dakika sonra tekrar deneyin." : "İşlem tamamlanamadı."));
    return body;
}

// Şifre tekrar alanları eşleşmiyorsa isteği göndermeden durdurur.
function checkMatches(form) {
    for (const confirm of form.querySelectorAll("[data-match]")) {
        const original = form.elements.namedItem(confirm.dataset.match);
        if (original && original.value !== confirm.value) {
            confirm.focus();
            throw Error("Şifreler eşleşmiyor. Aynı şifreyi iki kez yaz.");
        }
    }
}

function bind(id, action) {
    const f = $("#" + id);
    if (!f) return;
    f.addEventListener("submit", async e => {
        e.preventDefault();
        const b = f.querySelector('[type="submit"]') || f.querySelector("button");
        if (b.disabled) return;
        b.disabled = true;
        status("");
        try {
            checkMatches(f);
            await action(Object.fromEntries(new FormData(f)), f);
        } catch (e) { status(e.message || "Sunucuya ulaşılamadı.", true); }
        finally { b.disabled = false; }
    });
}

bind("loginForm", async d => {
    const r = await api("login", d);
    if (r.requiresTwoFactor) {
        $("#loginForm").hidden = true;
        $("#twoFactorForm").hidden = false;
        $("#loginForm [name=password]").value = "";
        await token();
        status("Doğrulayıcı uygulamandaki kodu gir.");
        return;
    }
    location.replace(returnTo());
});
bind("twoFactorForm", async d => {
    d.recovery = d.recovery === "on";
    await api("two-factor-login", d);
    location.replace(returnTo());
});
bind("forgotForm", async d => status((await api("forgot-password", d)).mesaj));
if ($("#resendConfirmation")) $("#resendConfirmation").onclick = async () => {
    const f = $("#forgotForm");
    if (!f.reportValidity()) return;
    try { status((await api("resend-confirmation", Object.fromEntries(new FormData(f)))).mesaj); }
    catch (e) { status(e.message, true); }
};
bind("resetForm", async d => {
    if (!email || !linkToken) throw Error("E-postadaki bağlantıyı kullanın.");
    await api("reset-password", { ...d, email, token: linkToken });
    $("#resetForm").hidden = true;
    status("Şifren değiştirildi. Giriş sayfasına yönlendiriliyorsun…");
    goToLogin("Şifren değiştirildi. Yeni şifrenle giriş yapabilirsin.", email, 2000);
});
bind("confirmForm", async () => {
    if (!email || !linkToken) throw Error("E-postadaki bağlantıyı kullanın.");
    await api("confirm-email", { email, token: linkToken });
    $("#confirmForm").hidden = true;
    status("E-postan doğrulandı. Giriş sayfasına yönlendiriliyorsun…");
    goToLogin("E-postan doğrulandı. Giriş yapabilirsin.", email, 2000);
});
bind("setupForm", async (d, f) => {
    const r = await api("2fa/setup", d);
    await token();
    f.reset();
    $("#authenticatorKey").textContent = r.email + "\n" + r.key;
    $("#setupKey").hidden = false;
    status("Anahtarı doğrulayıcı uygulamana ekle.");
});
bind("enableForm", async d => {
    const r = await api("2fa/enable", d);
    $("#setupKey").hidden = true;
    $("#authenticatorKey").textContent = "";
    $("#setupForm").hidden = true;
    $("#recoveryBox").hidden = false;
    $("#recoveryCodes").textContent = r.codes.join("\n");
    $("#twoFactorStatus").textContent = "İki adımlı doğrulama etkin.";
    await token();
    status("Kurtarma kodlarını güvenli bir yerde sakla.");
});
bind("changeForm", async d => {
    await api("change-password", d);
    goToLogin("Şifren değiştirildi. Yeni şifrenle tekrar giriş yap.");
});
bind("logoutAllForm", async d => {
    await api("logout-all", d);
    goToLogin("Tüm cihazlardaki oturumların kapatıldı.");
});

(async () => {
    try {
        const page = document.body.dataset.page;
        // Önceki sayfadan bırakılan bilgi notu (kayıt, şifre yenileme vb.).
        const notice = takeNotice();
        if (notice && $("#authNotice")) {
            $("#authNotice").textContent = notice.message;
            $("#authNotice").hidden = false;
            const field = $("#loginForm [name=email]");
            if (field && notice.email) { field.value = notice.email; $("#loginForm [name=password]")?.focus(); }
        }
        await token();
        if (page === "login" || page === "register") {
            // Zaten giriş yapmış kullanıcı giriş/kayıt formunu görmez.
            const u = await api("me");
            if (u) location.replace(returnTo());
        }
        if (page === "security") {
            const u = await api("me");
            if (!u) { location.replace("/html/giris.html?returnUrl=" + encodeURIComponent("/html/hesabim.html")); return; }
            $("#twoFactorStatus").textContent = u.twoFactorEnabled ? "İki adımlı doğrulama etkin." : "İki adımlı doğrulama henüz açık değil.";
            $("#setupForm").hidden = u.twoFactorEnabled;
        }
    } catch (e) { status(e.message, true); }
})();
