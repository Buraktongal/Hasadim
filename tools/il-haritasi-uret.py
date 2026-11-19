"""Türkiye il sınırlarından (GeoJSON) il haritası için SVG yolları üretir.

Kaynak: tools/veri/tr-iller-osm.json — github.com/cihadturhan/tr-geojson,
OpenStreetMap verisinden üretilmiştir, ODbL lisanslıdır (© OpenStreetMap katkıcıları).
Çıktı: src/Hasadim.Web/wwwroot/js/turkiye-iller.js
Kullanım: python tools/il-haritasi-uret.py
"""
import json, math, pathlib

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE / "veri" / "tr-iller-osm.json"
OUT = HERE.parent / "src" / "Hasadim.Web" / "wwwroot" / "js" / "turkiye-iller.js"
NAMES = {"Afyon": "Afyonkarahisar"}
LON0, LAT0, K = 25.55, 42.15, 60.0
COS = math.cos(math.radians(39))
TOL = 0.35          # sadeleştirme toleransı (SVG birimi)
MIN_AREA = 3.0      # bundan küçük adacıklar atılır (ilin en büyük parçası hariç)


def project(lon, lat):
    return ((lon - LON0) * K * COS, (LAT0 - lat) * K)


def simplify(points, tol):
    if len(points) < 4:
        return points
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        a, b = stack.pop()
        (x1, y1), (x2, y2) = points[a], points[b]
        dx, dy = x2 - x1, y2 - y1
        norm = math.hypot(dx, dy) or 1e-9
        best, idx = -1.0, -1
        for i in range(a + 1, b):
            x, y = points[i]
            d = abs(dy * x - dx * y + x2 * y1 - y2 * x1) / norm if (dx or dy) else math.hypot(x - x1, y - y1)
            if d > best:
                best, idx = d, i
        if best > tol and idx > 0:
            keep[idx] = True
            stack += [(a, idx), (idx, b)]
    return [p for p, k in zip(points, keep) if k]


def area(ring):
    return abs(sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]))) / 2


def dist_to_ring(px, py, ring):
    best = float("inf")
    for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
        dx, dy = x2 - x1, y2 - y1
        t = max(0, min(1, ((px - x1) * dx + (py - y1) * dy) / ((dx * dx + dy * dy) or 1e-9)))
        best = min(best, math.hypot(px - x1 - t * dx, py - y1 - t * dy))
    return best


def inside(px, py, ring):
    c = False
    for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
        if (y1 > py) != (y2 > py) and px < (x2 - x1) * (py - y1) / (y2 - y1) + x1:
            c = not c
    return c


def label_point(ring):
    """Etiket için ilin içinde, kenarlara en uzak nokta (kaba ızgara + iyileştirme)."""
    xs, ys = [p[0] for p in ring], [p[1] for p in ring]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    best, bx, by = -1, (x0 + x1) / 2, (y0 + y1) / 2
    step = max(x1 - x0, y1 - y0) / 24
    for _ in range(4):
        cx, cy = bx, by
        for i in range(-24, 25):
            for j in range(-24, 25):
                px, py = cx + i * step, cy + j * step
                if x0 <= px <= x1 and y0 <= py <= y1 and inside(px, py, ring):
                    d = dist_to_ring(px, py, ring)
                    if d > best:
                        best, bx, by = d, px, py
        step /= 6
    return bx, by, best


def fmt(v):
    s = f"{v:.1f}"
    return s[:-2] if s.endswith(".0") else s


def main():
    data = json.loads(SRC.read_text(encoding="utf-8"))
    out, max_x, max_y = [], 0, 0
    for f in data["features"]:
        name = NAMES.get(f["properties"]["name"], f["properties"]["name"])
        geom = f["geometry"]
        polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
        rings = []
        for poly in polys:
            for k, ring in enumerate(poly):
                pts = simplify([project(*p[:2]) for p in ring], TOL)
                if len(pts) >= 4:
                    rings.append((k == 0, pts))
        outer = [r for o, r in rings if o]
        biggest = max(outer, key=area)
        kept = [(o, r) for o, r in rings if r is biggest or area(r) >= MIN_AREA]
        d = ""
        for _, r in kept:
            d += "M" + "L".join(fmt(x) + " " + fmt(y) for x, y in r[:-1] if True) + "Z"
            for x, y in r:
                max_x, max_y = max(max_x, x), max(max_y, y)
        lx, ly, room = label_point(biggest[:-1])
        out.append([name, d, round(lx, 1), round(ly, 1), round(room, 1)])
    out.sort(key=lambda r: r[0])
    js = ("'use strict';\n\n// Türkiye il sınırları (SVG yolları). tools/il-haritasi-uret.py ile üretilir; elle düzenlemeyin.\n"
          "// Veri: © OpenStreetMap katkıcıları, ODbL (github.com/cihadturhan/tr-geojson).\n"
          "// Her il: [ad, yol, etiketX, etiketY, etiket için boşluk yarıçapı]\n"
          f"window.TurkiyeIller = {{ width: {math.ceil(max_x) + 2}, height: {math.ceil(max_y) + 2}, iller: "
          + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + " };\n")
    OUT.write_text(js, encoding="utf-8")
    print(OUT, len(js) // 1024, "KB,", len(out), "il")


main()
