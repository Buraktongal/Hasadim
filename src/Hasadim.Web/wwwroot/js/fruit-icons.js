'use strict';

// Meyve simgeleri: emoji yerine sade, düz renkli SVG çizimler.
// Her simge 32×32'lik bir alanda çizilir ve istenen boyuta ölçeklenir.
window.FruitIcons = (() => {
    const NS = 'http://www.w3.org/2000/svg';
    const leaf = ['path', { d: 'M17 8.5c1.6-3.6 5.4-5 8.6-4.2-1 3.6-4.8 5.6-8.6 4.2z', fill: '#5f9e4b' }];
    const stem = (d = 'M16 10c0-2.2.6-4.2 1.8-5.8') => ['path', { d, fill: 'none', stroke: '#6b4a2b', 'stroke-width': '1.7', 'stroke-linecap': 'round' }];
    const shine = (cx, cy, rx = 1.5, ry = 2.4) => ['ellipse', { cx, cy, rx, ry, fill: '#fff', 'fill-opacity': '.35' }];
    const round = (body, blush) => [
        ['circle', { cx: 16, cy: 18.5, r: 10, fill: body }],
        ...(blush ? [['circle', { cx: 20, cy: 21, r: 6.2, fill: blush, 'fill-opacity': '.55' }]] : []),
        ['path', { d: 'M16 9.2c-1.9 3-2.4 7-1.5 11', fill: 'none', stroke: blush || '#00000033', 'stroke-width': '1.3', 'stroke-linecap': 'round', 'stroke-opacity': '.8' }],
        shine(11.2, 15.5), stem('M16 9.5c0-2 .5-3.6 1.4-5'), leaf
    ];
    const cherries = color => [
        ['path', { d: 'M11 18C12 12 15 7.5 19.5 4.5M21.5 17c-.3-5-1-9.5-2-12.5', fill: 'none', stroke: '#5b7d33', 'stroke-width': '1.5', 'stroke-linecap': 'round' }],
        ['circle', { cx: 10.5, cy: 22.5, r: 5.2, fill: color }],
        ['circle', { cx: 21.5, cy: 21.5, r: 5.2, fill: color }],
        shine(8.6, 20.8, 1.1, 1.7), shine(19.6, 19.8, 1.1, 1.7),
        ['path', { d: 'M19.5 4.5c2.6-1.4 5.8-.8 7.5 1.2-2.7 1.3-5.6.9-7.5-1.2z', fill: '#5f9e4b' }]
    ];
    const shapes = {
        Elma: [
            ['path', { d: 'M16 10.6c-2.2-1.5-6.3-1.9-8.5.7C4.9 14.4 5.6 19.6 8 23.5c1.6 2.6 3.7 4.4 5.6 4.1 1-.2 1.5-.7 2.4-.7s1.4.5 2.4.7c1.9.3 4-1.5 5.6-4.1 2.4-3.9 3.1-9.1.5-12.2-2.2-2.6-6.3-2.2-8.5-.7z', fill: '#e04b3f' }],
            shine(10.8, 16), stem(), leaf
        ],
        Armut: [
            ['path', { d: 'M16 8.5c-1.6 0-2.6 1.3-2.8 3.4-.2 2.2-1 3.4-2.6 5.3-1.8 2.2-2.6 4.3-2 6.7.9 3.6 4 5.6 7.4 5.6s6.5-2 7.4-5.6c.6-2.4-.2-4.5-2-6.7-1.6-1.9-2.4-3.1-2.6-5.3-.2-2.1-1.2-3.4-2.8-3.4z', fill: '#b5cc45' }],
            shine(12.3, 20.5, 1.4, 2.6), stem('M16 9c0-1.8.4-3.3 1.4-4.7'), leaf
        ],
        Portakal: [
            ['circle', { cx: 16, cy: 18.5, r: 10, fill: '#f39a2b' }],
            ['circle', { cx: 12, cy: 16, r: .7, fill: '#d9801a' }], ['circle', { cx: 19.5, cy: 21.5, r: .7, fill: '#d9801a' }],
            ['circle', { cx: 14.5, cy: 23.5, r: .7, fill: '#d9801a' }], ['circle', { cx: 21, cy: 15.5, r: .7, fill: '#d9801a' }],
            shine(11, 15.2), ['circle', { cx: 16, cy: 9.4, r: 1.1, fill: '#5f9e4b' }], leaf
        ],
        Mandalina: [
            ['ellipse', { cx: 16, cy: 19, rx: 11, ry: 8.8, fill: '#f6a12e' }],
            ['path', { d: 'M11 13.5c1.5-.8 3.2-1.2 5-1.2s3.5.4 5 1.2', fill: 'none', stroke: '#e0861c', 'stroke-width': '1.1', 'stroke-linecap': 'round' }],
            shine(10, 18, 1.6, 2.2),
            ['path', { d: 'M16 10.5c-2.6-2.8-6.4-2.8-8.6-1.2 2.4 2.2 6 2.6 8.6 1.2zM16 10.5c2.6-2.8 6.4-2.8 8.6-1.2-2.4 2.2-6 2.6-8.6 1.2z', fill: '#5f9e4b' }]
        ],
        Limon: [
            ['path', { d: 'M3.5 18.5c1.2-.6 1.8-1.4 2.4-2.6C8 12.1 11.6 9.5 16 9.5s8 2.6 10.1 6.4c.6 1.2 1.2 2 2.4 2.6-1.2.6-1.8 1.4-2.4 2.6-2.1 3.8-5.7 6.4-10.1 6.4s-8-2.6-10.1-6.4c-.6-1.2-1.2-2-2.4-2.6z', fill: '#f4d23c' }],
            shine(11, 16, 2.6, 1.3), ['path', { d: 'M17 9.6c1.8-3.4 5.6-4.6 8.6-3.6-1.2 3.4-5 5-8.6 3.6z', fill: '#5f9e4b' }]
        ],
        Üzüm: [
            ['path', { d: 'M16 7.5V3.8', fill: 'none', stroke: '#6b4a2b', 'stroke-width': '1.7', 'stroke-linecap': 'round' }],
            ['path', { d: 'M16 5.5c2.4-2.4 6.2-2.4 8.4-.6-2.4 2-6 2.2-8.4.6z', fill: '#5f9e4b' }],
            ...[[8.6, 11.8], [16, 11.8], [23.4, 11.8], [12.3, 18.3], [19.7, 18.3], [16, 24.8]]
                .map(([cx, cy]) => ['circle', { cx, cy, r: 3.9, fill: '#7e4ca6', stroke: '#653889', 'stroke-width': '.6' }]),
            shine(7.6, 10.6, 1, 1.4), shine(15, 10.6, 1, 1.4)
        ],
        Kiraz: cherries('#cc2a3c'),
        Vişne: cherries('#8f1d2e'),
        Şeftali: round('#f7aa80', '#ee7a5e'),
        Kayısı: round('#f7b84b', '#ef8d36'),
        Erik: [
            ['ellipse', { cx: 16, cy: 18.5, rx: 8.6, ry: 10, fill: '#6b3f92' }],
            ['path', { d: 'M16 8.8c-1.4 3.2-1.6 7-.6 10.6', fill: 'none', stroke: '#55307a', 'stroke-width': '1.2', 'stroke-linecap': 'round' }],
            shine(12, 15), stem('M16 9c0-2 .4-3.5 1.4-4.8'), leaf
        ],
        Nar: [
            ['circle', { cx: 16, cy: 19, r: 9.6, fill: '#c3392d' }],
            ['path', { d: 'M12.4 10.4l1.1-3.6 1.6 2.2.9-2.9.9 2.9 1.6-2.2 1.1 3.6z', fill: '#a12c22' }],
            shine(11.6, 16.5), ['circle', { cx: 19.5, cy: 22, r: 4.5, fill: '#e2584a', 'fill-opacity': '.45' }]
        ],
        Çilek: [
            ['path', { d: 'M16 28.5c-4.2-2-9.2-7.2-9.6-12.6C6.1 12 9.6 10.6 16 10.6s9.9 1.4 9.6 5.3c-.4 5.4-5.4 10.6-9.6 12.6z', fill: '#e43d3e' }],
            ...[[11.5, 15], [16, 14.6], [20.5, 15], [13.5, 19.5], [18.5, 19.5], [16, 24], [10.6, 19.8], [21.4, 19.8]]
                .map(([cx, cy]) => ['ellipse', { cx, cy, rx: .55, ry: .85, fill: '#ffd76a' }]),
            ['path', { d: 'M9.6 11.2c2 .4 3.6-.2 4.6-2 .6 1.4 1.1 1.8 1.8 1.8s1.2-.4 1.8-1.8c1 1.8 2.6 2.4 4.6 2-1.6 1.7-3.8 2.5-6.4 2.5s-4.8-.8-6.4-2.5z', fill: '#4f9a45' }],
            ['path', { d: 'M16 9.2V5.6', fill: 'none', stroke: '#4f9a45', 'stroke-width': '1.6', 'stroke-linecap': 'round' }]
        ],
        Karpuz: [
            ['path', { d: 'M3.5 13.5h25a12.5 12.5 0 0 1-25 0z', fill: '#2f8a42' }],
            ['path', { d: 'M5.8 13.5h20.4a10.2 10.2 0 0 1-20.4 0z', fill: '#f1585c' }],
            ...[[11, 17], [16, 19.5], [21, 17], [13.5, 21.5], [18.5, 21.5]]
                .map(([cx, cy]) => ['ellipse', { cx, cy, rx: .7, ry: 1.1, fill: '#3b2a26' }])
        ],
        Kavun: [
            ['ellipse', { cx: 16, cy: 18, rx: 12, ry: 9.2, fill: '#e8cf78' }],
            ['path', { d: 'M8 12.5c3 3.5 3 7.5 0 11M13 9.6c2 4 2 12 0 16.6M19 9.6c-2 4-2 12 0 16.6M24 12.5c-3 3.5-3 7.5 0 11', fill: 'none', stroke: '#c9ab52', 'stroke-width': '1.1', 'stroke-linecap': 'round' }],
            ['path', { d: 'M16 8.8V5.6', fill: 'none', stroke: '#6b4a2b', 'stroke-width': '1.7', 'stroke-linecap': 'round' }]
        ],
        Muz: [
            ['path', { d: 'M6.5 8.5c.8 9.5 6.4 16.2 14.8 17 3 .3 5.4-.4 6.9-1.6-1-.6-2-.7-3.4-.6-7.6.4-12.8-5.6-14.6-14.4-.4-1.8-3.8-2.4-3.7-.4z', fill: '#f4cf3a', stroke: '#d8ad22', 'stroke-width': '.9', 'stroke-linejoin': 'round' }],
            ['path', { d: 'M6.6 8.4l-.4-2.6 2.6.6', fill: 'none', stroke: '#6b4a2b', 'stroke-width': '1.4', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }]
        ],
        İncir: [
            ['path', { d: 'M16 6.5c2.2 3.2 9 8 9 14a9 9 0 0 1-18 0c0-6 6.8-10.8 9-14z', fill: '#7a4d7a' }],
            ['path', { d: 'M16 6.5V3.8', fill: 'none', stroke: '#5b7d33', 'stroke-width': '1.6', 'stroke-linecap': 'round' }],
            shine(12.2, 18, 1.4, 2.4)
        ],
        Avokado: [
            ['path', { d: 'M16 4.5c-3.2 0-4.6 3-5.4 6.4-.5 2.2-1.8 3.6-3 5.6-1.2 2.1-1.6 4.4-.9 6.6 1.2 3.8 4.9 5.9 9.3 5.9s8.1-2.1 9.3-5.9c.7-2.2.3-4.5-.9-6.6-1.2-2-2.5-3.4-3-5.6-.8-3.4-2.2-6.4-5.4-6.4z', fill: '#3f6d30' }],
            ['path', { d: 'M16 7.2c-2.2 0-3.2 2.4-3.8 5-.5 2-1.6 3.4-2.6 5.2-.9 1.6-1.2 3.4-.6 5 1 2.8 3.8 4.4 7 4.4s6-1.6 7-4.4c.6-1.6.3-3.4-.6-5-1-1.8-2.1-3.2-2.6-5.2-.6-2.6-1.6-5-3.8-5z', fill: '#d4e38f' }],
            ['circle', { cx: 16, cy: 20.5, r: 4.2, fill: '#8a5a33' }], shine(14.8, 19.2, 1, 1.3)
        ],
        Kivi: [
            ['circle', { cx: 16, cy: 16.5, r: 11, fill: '#8a6a3f' }],
            ['circle', { cx: 16, cy: 16.5, r: 9, fill: '#9cc63d' }],
            ['circle', { cx: 16, cy: 16.5, r: 3.2, fill: '#f2efc4' }],
            ...Array.from({ length: 10 }, (_, i) => {
                const a = i / 10 * Math.PI * 2;
                return ['ellipse', { cx: (16 + Math.cos(a) * 5.4).toFixed(2), cy: (16.5 + Math.sin(a) * 5.4).toFixed(2), rx: .5, ry: .9, fill: '#2b2420', transform: `rotate(${(i * 36 + 90)} ${(16 + Math.cos(a) * 5.4).toFixed(2)} ${(16.5 + Math.sin(a) * 5.4).toFixed(2)})` }];
            })
        ],
        Ayva: [
            ['path', { d: 'M16 8.6c-2.4 0-4 1.6-4.6 3.8-.5 1.8-2 2.6-3.4 4.2-1.8 2-2.4 4.6-1.6 7 1.1 3.3 4.7 5.2 9.6 5.2s8.5-1.9 9.6-5.2c.8-2.4.2-5-1.6-7-1.4-1.6-2.9-2.4-3.4-4.2-.6-2.2-2.2-3.8-4.6-3.8z', fill: '#e9c83c' }],
            ['path', { d: 'M12.4 15.5c1.2 1 2.4 1.4 3.6 1.4s2.4-.4 3.6-1.4', fill: 'none', stroke: '#cfa823', 'stroke-width': '1.1', 'stroke-linecap': 'round' }],
            shine(11, 20, 1.5, 2.6), stem('M16 9c0-1.8.4-3.3 1.4-4.7'), leaf
        ],
        Greyfurt: [
            ['circle', { cx: 16, cy: 17.5, r: 11, fill: '#f6a35a' }],
            ['circle', { cx: 16, cy: 17.5, r: 8.6, fill: '#f37b67' }],
            ...Array.from({ length: 8 }, (_, i) => {
                const a = i / 8 * Math.PI * 2;
                return ['path', { d: `M16 17.5L${(16 + Math.cos(a) * 8.6).toFixed(2)} ${(17.5 + Math.sin(a) * 8.6).toFixed(2)}`, stroke: '#ffd2c2', 'stroke-width': '1.1' }];
            }),
            ['circle', { cx: 16, cy: 17.5, r: 1.6, fill: '#ffd2c2' }]
        ],
        Nektarin: round('#e8584b', '#f7b24a'),
        Ahududu: [
            ...[[12, 14], [16, 13], [20, 14], [10.5, 18], [14.5, 17.6], [18.5, 17.6], [22, 18], [12.5, 22], [16.5, 21.8], [20, 22], [14.5, 25.6], [18, 25.6]]
                .map(([cx, cy]) => ['circle', { cx, cy, r: 2.6, fill: '#d63b55', stroke: '#b42c45', 'stroke-width': '.5' }]),
            ['path', { d: 'M10.5 11c2 .4 3.6-.1 5.5-1.9 1.9 1.8 3.5 2.3 5.5 1.9-1.4 1.4-3.4 2-5.5 2s-4.1-.6-5.5-2z', fill: '#4f9a45' }],
            ['path', { d: 'M16 9V5.5', fill: 'none', stroke: '#4f9a45', 'stroke-width': '1.6', 'stroke-linecap': 'round' }]
        ],
        Böğürtlen: [
            ...[[12, 14], [16, 13], [20, 14], [10.5, 18], [14.5, 17.6], [18.5, 17.6], [22, 18], [12.5, 22], [16.5, 21.8], [20, 22], [14.5, 25.6], [18, 25.6]]
                .map(([cx, cy]) => ['circle', { cx, cy, r: 2.6, fill: '#3b2a4f', stroke: '#24182f', 'stroke-width': '.5' }]),
            shine(13.2, 13, .7, 1), shine(17.2, 12, .7, 1),
            ['path', { d: 'M10.5 11c2 .4 3.6-.1 5.5-1.9 1.9 1.8 3.5 2.3 5.5 1.9-1.4 1.4-3.4 2-5.5 2s-4.1-.6-5.5-2z', fill: '#4f9a45' }]
        ],
        'Yaban mersini': [
            ...[[11, 19, 6], [21, 18, 5.6], [16, 24.5, 5.2]].flatMap(([cx, cy, r]) => [
                ['circle', { cx, cy, r, fill: '#4f5fa8' }],
                ['circle', { cx, cy: cy - r + 1.6, r: 1.3, fill: '#2f3b74' }],
                ['circle', { cx: cx - r / 2.4, cy: cy - 1, r: 1, fill: '#fff', 'fill-opacity': '.3' }]
            ]),
            ['path', { d: 'M16 12.5c2.4-3.2 6-4.4 9-3.6-1.6 3-5.4 4.4-9 3.6z', fill: '#5f9e4b' }]
        ],
        Dut: [
            ['path', { d: 'M11.5 9.5c2.8-1.4 6.2-1.4 9 0 2.2 4.6 2.2 12.4-.6 17.2-2.2 1.6-5.6 1.6-7.8 0-2.8-4.8-2.8-12.6-.6-17.2z', fill: '#4b2348' }],
            ...[[13.5, 12], [18.5, 12], [16, 15], [13, 17.5], [19, 17.5], [16, 20.5], [13.6, 23.2], [18.4, 23.2]]
                .map(([cx, cy]) => ['circle', { cx, cy, r: 1.9, fill: '#642f5f' }]),
            ['path', { d: 'M16 9.2V4.5', fill: 'none', stroke: '#5b7d33', 'stroke-width': '1.6', 'stroke-linecap': 'round' }]
        ],
        'Trabzon hurması': [
            ['ellipse', { cx: 16, cy: 19, rx: 10.5, ry: 9, fill: '#f08a24' }],
            shine(11.4, 17, 1.6, 2.4),
            ['path', { d: 'M16 11.5l-3.8-2.6 1.2 3.8-4 .4 3.6 1.6M16 11.5l3.8-2.6-1.2 3.8 4 .4-3.6 1.6', fill: '#4f7f39', stroke: '#4f7f39', 'stroke-width': '1.4', 'stroke-linejoin': 'round' }],
            ['circle', { cx: 16, cy: 11.6, r: 1.6, fill: '#3f6a2e' }]
        ],
        Diğer: [
            ['path', { d: 'M16 28V15', fill: 'none', stroke: '#4f8a3e', 'stroke-width': '1.8', 'stroke-linecap': 'round' }],
            ['path', { d: 'M16 16c-1-5-5.4-7.6-10-7 .6 4.8 5 7.8 10 7z', fill: '#6aaa52' }],
            ['path', { d: 'M16 13c.8-5 5-8 9.8-7.6-.4 5-4.8 8.2-9.8 7.6z', fill: '#5f9e4b' }],
            ['path', { d: 'M9 28h14', fill: 'none', stroke: '#8a6a3f', 'stroke-width': '2', 'stroke-linecap': 'round' }]
        ]
    };

    function node(name, size = 20, cls = '') {
        const parts = shapes[name] || shapes.Diğer;
        if (typeof document.createElementNS !== 'function') {
            const fallback = document.createElement('span');
            fallback.className = ('fruit-letter ' + cls).trim();
            fallback.textContent = String(name || '?').slice(0, 1);
            return fallback;
        }
        const svg = document.createElementNS(NS, 'svg');
        svg.setAttribute('viewBox', '0 0 32 32');
        svg.setAttribute('width', String(size));
        svg.setAttribute('height', String(size));
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('focusable', 'false');
        svg.setAttribute('class', ('fruit-svg ' + cls).trim());
        for (const [tag, attrs] of parts) {
            const child = document.createElementNS(NS, tag);
            for (const [key, value] of Object.entries(attrs)) child.setAttribute(key, String(value));
            svg.append(child);
        }
        return svg;
    }

    return { node, names: Object.keys(shapes) };
})();
