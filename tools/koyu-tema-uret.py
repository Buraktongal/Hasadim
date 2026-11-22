#!/usr/bin/env python3
"""Koyu tema stil dosyasını (css/tema-koyu.css) diğer stil dosyalarından üretir.

Açık yüzey renkleri koyulaştırılır, koyu yazı renkleri açılır; marka yeşili
ve turuncu gibi orta tonlar (beyaz yazılı düğmeler) korunur.
Kullanım (depo kökünden):  python3 tools/koyu-tema-uret.py
Yeni bir stil eklendiğinde komutu tekrar çalıştırın.
"""
import colorsys
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent / "src" / "Hasadim.Web" / "wwwroot" / "css"
SOURCES = ["styles.css", "tema.css", "market-presentation.css", "market-header.css", "messages.css", "market-experience.css",
           "listing-form.css", "listing-editor.css", "listing-workflow.css", "profile.css", "auth-experience.css", "hesap.css",
           "ticaret.css", "hesap-merkezi.css", "yonetim.css", "satici.css"]
PREFIX = 'html[data-theme="dark"]'

HEADER = """@charset "UTF-8";
/* KOYU TEMA — tools/koyu-tema-uret.py tarafından üretilir; elle düzenlemeyin.
   Önce değişkenler, ardından açık renkli yüzey ve koyu yazı kurallarının karşılıkları. */
html[data-theme="dark"] {
    color-scheme: dark;
    --paper: #0f1612; --ink: #e3ebe4; --muted: #9fb0a2; --line: #2c3a31; --sage: #1b261f; --surface: #18221c;
    --t-green-soft: #1d2a22; --t-ink: #e3ebe4; --t-muted: #9fb0a2; --t-line: #2c3a31; --t-bg: #0f1612; --t-panel: #18221c;
    --t-accent: #e2762f; --t-accent-dark: #f39a5c;
}
"""

# Üretilen kurallardan sonra gelir; elle ince ayar.
TAIL = """
/* ---- elle ince ayar ---- */
html[data-theme="dark"] body { background: var(--t-bg); color: var(--t-ink); }
html[data-theme="dark"] img.avatar, html[data-theme="dark"] .card-media img { filter: brightness(.92); }
html[data-theme="dark"] .hmap-tile { filter: brightness(.78) contrast(1.05) saturate(.85); }
html[data-theme="dark"] .hmap-zoom, html[data-theme="dark"] .hmap-credit { background: #24302a; color: #e3ebe4; }
html[data-theme="dark"] .hmap-credit a { color: #cfe3d4; }
html[data-theme="dark"] .site-logo img { filter: brightness(1.15) saturate(.95); }
html[data-theme="dark"] input, html[data-theme="dark"] select, html[data-theme="dark"] textarea { background-color: #121b16; color: #e3ebe4; border-color: #34443a; }
html[data-theme="dark"] ::placeholder { color: #7d8f81; }
html[data-theme="dark"] dialog { background: #18221c; color: #e3ebe4; }
html[data-theme="dark"] .main-category-tile.selected, html[data-theme="dark"] .category-tile.selected,
html[data-theme="dark"] .choice-card:has(input:checked), html[data-theme="dark"] .deal-option input:checked + span { background: #2a2018; }
html[data-theme="dark"] .settings-danger .settings-icon { background: #3a1d1a; color: #f2a39b; }
html[data-theme="dark"] .settings-danger strong { color: #f2a39b; }
html[data-theme="dark"] {
    --map-0: #223029; --map-1: #2c4a35; --map-2: #36693f; --map-3: #4f8f4f; --map-4: #79b65f; --map-5: #b6dd7a;
    --map-border: #121a15; --map-label: #e3ebe4; --map-badge: #121a15; --map-badge-ink: #e3ebe4; --map-sea: #16201a;
}
html[data-theme="dark"] .tr-name { stroke: #121a15b3; }
html[data-theme="dark"] select:not(.ss-native):not([multiple]) { background-image: url("/images/secim-ok-acik.svg") !important; }
html[data-theme="dark"] .ss-caret { background-image: url("/images/secim-ok-acik.svg"); }
html[data-theme="dark"] select:not(.ss-native) option { color: #e3ebe4; background: #18221c; }
html[data-theme="dark"] input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1); }
html[data-theme="dark"] .camera-head { border-color: #2c3a31; }
html[data-theme="dark"] .tr-label.on-strong .tr-name { fill: #0f1a13; stroke: #e3ebe4aa; }
html[data-theme="dark"] .tr-badge rect { stroke: #e3ebe455; }
/* Takvim: hasat dönemi kehribar (çizgili), yoğun hasat parlak yeşil; koyu zeminde net ayrışır. */
html[data-theme="dark"] .crop-calendar td.season::before,
html[data-theme="dark"] .calendar-legend i.season {
    background: repeating-linear-gradient(135deg, #b8862b 0 5px, #8f6a24 5px 10px);
}
html[data-theme="dark"] .crop-calendar td.peak::before,
html[data-theme="dark"] .calendar-legend i.peak { background: #4fd17f; box-shadow: 0 0 0 1px #8ff0b0 inset; }
html[data-theme="dark"] .crop-calendar td.this-month { background: #e2762f1f; }
html[data-theme="dark"] .crop-calendar thead th.this-month { background: #3a2617; color: #f6a868; }
html[data-theme="dark"] .sample-light { background: linear-gradient(180deg, #fff 0 34%, #f3f5f1 34%); border-color: #3a4a40; }
html[data-theme="dark"] .sample-dark { background: linear-gradient(180deg, #1b241e 0 34%, #0b110d 34%); border-color: #3a4a40; }
html[data-theme="dark"] .crop-calendar .group-row th { background: #22332a; color: #a5d9b3; }
html[data-theme="dark"] .map-price-pin { background: #18221c; color: #e3ebe4; }
/* Yönetim paneli ve doğrulama penceresi */
html[data-theme="dark"] .admin-body { background: #0f1612; color: #e3ebe4; }
html[data-theme="dark"] .admin-top { background: #0b120e; }
html[data-theme="dark"] .admin-nav button[aria-current] { background: #2b6a48; color: #fff; }
html[data-theme="dark"] .admin-stat strong { color: #a5d9b3; }
html[data-theme="dark"] .admin-stat.alert strong { color: #f6a868; }
html[data-theme="dark"] .human-image img { background: #f6f3e8; }
html[data-theme="dark"] .status-pill { filter: brightness(.9); }
"""

# Yazı rengi olarak kullanıldığında açılacak marka değişkenleri.
TEXT_VARS = {
    "var(--t-green)": "#8fd0a3", "var(--t-green-2)": "#7fc796", "var(--green)": "#8fd0a3", "var(--green2)": "#a5d9b3",
}
COLOR_PROPS = {"color", "fill", "stroke", "-webkit-text-fill-color", "caret-color", "text-decoration-color"}
BG_PROPS = {"background", "background-color"}
BORDER_PROPS = {"border", "border-top", "border-right", "border-bottom", "border-left", "border-color",
                "border-top-color", "border-right-color", "border-bottom-color", "border-left-color", "outline", "outline-color"}
HEX = re.compile(r"#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b")
NAMED = {"white": "#ffffff", "black": "#000000"}


def parse_hex(h):
    h = h.lstrip("#")
    if len(h) in (3, 4):
        h = "".join(c * 2 for c in h)
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    a = h[6:8] if len(h) == 8 else ""
    return r, g, b, a


def to_hex(r, g, b, a=""):
    return "#" + "".join(f"{max(0, min(255, round(v * 255))):02x}" for v in (r, g, b)) + a


def luminance(r, g, b):
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def remap(value, kind):
    def swap(m):
        r, g, b, a = parse_hex(m.group(0))
        lum = luminance(r, g, b)
        h, l, s = colorsys.rgb_to_hls(r, g, b)
        if kind == "bg" and lum > 0.62:
            l2, s2 = 0.085 + (1 - l) * 0.62, s * 0.55
        elif kind == "border" and lum > 0.62:
            l2, s2 = 0.2 + (1 - l) * 0.45, s * 0.45
        elif kind == "text" and lum < 0.42:
            l2, s2 = 0.93 - l * 0.55, min(s, 0.55)
        else:
            return m.group(0)
        return to_hex(*colorsys.hls_to_rgb(h, max(0, min(1, l2)), max(0, min(1, s2))), a)

    out = HEX.sub(swap, value)
    for name, hexv in NAMED.items():
        out = re.sub(rf"(?<![\w-]){name}(?![\w-])", lambda m: HEX.sub(swap, hexv) if HEX.sub(swap, hexv) != hexv else m.group(0), out)
    if kind == "bg":
        out = re.sub(r"rgba\(\s*255\s*,\s*255\s*,\s*255\s*,", "rgba(24, 34, 28,", out)
    if kind == "text":
        for var, light in TEXT_VARS.items():
            out = out.replace(var, light)
    return out


def strip_comments(css):
    return re.sub(r"/\*.*?\*/", "", css, flags=re.S)


def blocks(css):
    """(prelude, body) çiftleri; iç içe bloklar için body ham metindir."""
    i, n = 0, len(css)
    while i < n:
        j = css.find("{", i)
        if j < 0:
            return
        prelude = css[i:j].strip()
        depth, k = 1, j + 1
        while k < n and depth:
            if css[k] == "{":
                depth += 1
            elif css[k] == "}":
                depth -= 1
            k += 1
        body = css[j + 1:k - 1]
        # @charset / @import gibi noktalı virgüllü önekleri at.
        prelude = prelude.split(";")[-1].strip()
        yield prelude, body
        i = k


def prefix(selectors):
    out = []
    for sel in selectors.split(","):
        sel = sel.strip()
        if not sel:
            continue
        if sel in (":root", "html"):
            out.append(PREFIX)
        elif sel.startswith("html"):
            out.append(PREFIX + sel[4:])
        else:
            out.append(PREFIX + " " + sel)
    return ",\n".join(out)


def rules(css, depth=0):
    lines = []
    for prelude, body in blocks(css):
        if prelude.startswith("@media") or prelude.startswith("@supports"):
            inner = rules(body, depth + 1)
            if inner:
                lines.append(prelude + " {\n" + inner + "}\n")
            continue
        if prelude.startswith("@") or "data-theme" in prelude:
            continue  # kaynakta zaten koyu tema için yazılmış kurallar olduğu gibi kalır
        decls = []
        for decl in body.split(";"):
            if ":" not in decl:
                continue
            prop, value = decl.split(":", 1)
            prop, value = prop.strip().lower(), value.strip()
            kind = "text" if prop in COLOR_PROPS else "bg" if prop in BG_PROPS else "border" if prop in BORDER_PROPS else None
            if prop == "box-shadow" and "inset" in value:
                kind = "border"
            if not kind:
                continue
            new = remap(value, kind)
            if new != value:
                decls.append(f"    {prop}: {new};")
        if decls:
            lines.append(prefix(prelude) + " {\n" + "\n".join(decls) + "\n}\n")
    return "".join(lines)


def main():
    parts = [HEADER]
    for name in SOURCES:
        path = ROOT / name
        if not path.exists():
            continue
        generated = rules(strip_comments(path.read_text(encoding="utf-8")))
        if generated:
            parts.append(f"\n/* ---- {name} ---- */\n" + generated)
    parts.append(TAIL)
    (ROOT / "tema-koyu.css").write_text("".join(parts), encoding="utf-8")
    print("css/tema-koyu.css üretildi:", sum(p.count("{") for p in parts), "kural")


if __name__ == "__main__":
    main()
