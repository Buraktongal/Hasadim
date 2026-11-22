'use strict';

// Meyve, sebze ve diğer ürün simgeleri: emoji yerine sade, düz renkli SVG çizimler.
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


    // ---- Tahıl, yem, bal, kuruyemiş ve arazi simgeleri ----
    const line = (d, color, width = 1.4) => ['path', { d, fill: 'none', stroke: color, 'stroke-width': width, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }];
    const ear = (kernel, awns) => {
        const parts = [line('M16 30V9', '#a9832f', 1.5), ['path', { d: 'M16 26c-3-.8-6-3.2-7.6-6.8 3.7.5 6.4 2.9 7.6 6.8z', fill: '#7f9d45' }]];
        for (let i = 0; i < 4; i++) {
            const y = 11.2 + i * 4.1;
            parts.push(['ellipse', { cx: 13.5, cy: y, rx: 2.2, ry: 3.4, fill: kernel, transform: `rotate(-28 13.5 ${y})` }]);
            parts.push(['ellipse', { cx: 18.5, cy: y, rx: 2.2, ry: 3.4, fill: kernel, transform: `rotate(28 18.5 ${y})` }]);
        }
        parts.push(['ellipse', { cx: 16, cy: 7.6, rx: 1.9, ry: 3.1, fill: kernel }]);
        if (awns) parts.push(line('M12.2 8.6 8.6 2.2M19.8 8.6l3.6-6.4M11.6 12.8 6.4 7.4M20.4 12.8l5.2-5.4M16 4.6V.8', awns, .8));
        return parts;
    };
    const bale = (front, top, side, twine = '#8b5a2b') => [
        ['path', { d: 'M2 12.5 8 6.5h21.5l-6 6z', fill: top }],
        ['path', { d: 'M23.5 12.5l6-6V21l-6 6z', fill: side }],
        ['rect', { x: 2, y: 12.5, width: 21.5, height: 14.5, rx: 1.4, fill: front }],
        line('M4 16.5h17.5M4 20h17.5M4 23.5h17.5', '#00000022', .7),
        line('M8.5 12.5V27M17 12.5V27M8.5 12.5l6-6M17 12.5l6-6', twine, 1.3),
        line('M4 12.4l-.8-1.8M11 12.4l.4-2M20 12.4l.8-1.6', '#00000033', .8)
    ];
    const hex = (cx, cy, r, fill) => {
        const pts = [];
        for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i + Math.PI / 6; pts.push((cx + r * Math.cos(a)).toFixed(2) + ' ' + (cy + r * Math.sin(a)).toFixed(2)); }
        return ['path', { d: 'M' + pts.join('L') + 'Z', fill, stroke: '#c07f16', 'stroke-width': .7 }];
    };
    const ground = (color = '#9cc06a') => ['path', { d: 'M1.5 23c6.5-3.2 22.5-3.2 29 0v6.5h-29z', fill: color }];
    const tree = (x, y, r, canopy, fruit) => [
        ['path', { d: `M${x} ${y + r + 4}v-${r + 2}`, stroke: '#7a5332', 'stroke-width': 1.8, 'stroke-linecap': 'round' }],
        ['circle', { cx: x, cy: y, r, fill: canopy }],
        ...(fruit ? [['circle', { cx: x - r * .4, cy: y - r * .1, r: 1, fill: fruit }], ['circle', { cx: x + r * .35, cy: y + r * .3, r: 1, fill: fruit }], ['circle', { cx: x + r * .1, cy: y - r * .5, r: 1, fill: fruit }]] : [])
    ];
    const nutShine = (cx, cy) => shine(cx, cy, 1.1, 2);
    const products = {
        'Buğday': ear('#dba646', '#c5963a'),
        'Arpa': ear('#cdb65c', '#b39a45'),
        'Çavdar': ear('#a99460', '#8e7a48'),
        'Tritikale': ear('#c9a04f'),
        'Yulaf': [
            line('M16 30V5', '#a9832f', 1.4),
            line('M16 9c-3 1-5 3-6.5 5.5M16 9c3 1 5 3 6.5 5.5M16 15c-3 1-5.4 3-6.8 5.6M16 15c3 1 5.4 3 6.8 5.6M16 21c-2 .8-3.6 2.2-4.6 4M16 21c2 .8 3.6 2.2 4.6 4', '#a9832f', 1),
            ...[[9.3, 15.5], [22.7, 15.5], [9, 21.7], [23, 21.7], [11.2, 25.8], [20.8, 25.8], [16, 4.5]].map(([cx, cy]) => ['ellipse', { cx, cy, rx: 1.6, ry: 2.8, fill: '#d8be6a' }])
        ],
        'Mısır': [
            ['path', { d: 'M16 3.5c4.2 0 6.4 5.5 6.4 12.5S20.2 28.5 16 28.5 9.6 23 9.6 16 11.8 3.5 16 3.5z', fill: '#f2c437' }],
            line('M12 9h8M10.6 13h10.8M10.3 17h11.4M10.7 21h10.6M12 25h8M14 4.5v23.5M18 4.5v23.5', '#d9a21c', .7),
            ['path', { d: 'M16 29c-4-1-8-5-9.5-12 3.5 2.5 6.5 6.4 9.5 12z', fill: '#6fa24a' }],
            ['path', { d: 'M16 29c4-1 8-5 9.5-12-3.5 2.5-6.5 6.4-9.5 12z', fill: '#5d913c' }]
        ],
        'Çeltik (pirinç)': [
            line('M10 30c1-9 4-17 12-24', '#9d8b3c', 1.4),
            ...[[13, 18], [14.5, 14.5], [16.5, 11.2], [19, 8.4], [21.6, 6.2], [17.6, 16.4], [19.8, 13.2], [22.4, 10.6], [24.6, 9]].map(([cx, cy], i) => ['ellipse', { cx, cy, rx: 1.3, ry: 2.3, fill: '#e2cd84', transform: `rotate(${i < 5 ? -35 : 25} ${cx} ${cy})` }]),
            ['path', { d: 'M10.5 29c-1.6-4-4.4-6.5-8-7.4 1.4 4 4.2 6.4 8 7.4z', fill: '#7f9d45' }]
        ],
        'Yonca balyası': bale('#8fb257', '#a9c672', '#6f9440'),
        'Saman balyası': bale('#e4c66b', '#efd68d', '#c4a24a'),
        'Fiğ balyası': bale('#a9b85e', '#bfcb7c', '#889a41'),
        'Yulaf otu balyası': bale('#c9c46c', '#dbd78d', '#a8a44c'),
        'Korunga': bale('#9fae66', '#b7c483', '#7f8f48'),
        'Mısır silajı': [
            ['ellipse', { cx: 16, cy: 26.5, rx: 12, ry: 2.4, fill: '#00000018' }],
            ['circle', { cx: 16, cy: 16, r: 11, fill: '#eef1ea' }],
            ['circle', { cx: 16, cy: 16, r: 11, fill: 'none', stroke: '#c9d0c2', 'stroke-width': 1 }],
            ['path', { d: 'M16 16m-6 0a6 6 0 1 0 12 0 6 6 0 1 0-12 0M16 16m-2.6 0a2.6 2.6 0 1 0 5.2 0 2.6 2.6 0 1 0-5.2 0', fill: 'none', stroke: '#c9d0c2', 'stroke-width': 1 }],
            ['path', { d: 'M5.3 13.5h21.4v3H5.3z', fill: '#5e9a45', 'fill-opacity': .85 }],
            shine(10.5, 10, 1.4, 2.4)
        ],
        'Bal': [
            ['rect', { x: 9, y: 4.5, width: 14, height: 4.2, rx: 1.2, fill: '#9a6324' }],
            ['path', { d: 'M9 9.7h14a2.5 2.5 0 0 1 2.5 2.5V25a4 4 0 0 1-4 4h-11a4 4 0 0 1-4-4V12.2A2.5 2.5 0 0 1 9 9.7z', fill: '#f0a52b' }],
            ['path', { d: 'M6.5 12.5h19v3.3c-1.3 1.5-2.8 1.5-3.6-.2-.9 2.2-2.9 2.2-3.7.1-.9 2-2.9 2-3.7 0-.9 1.8-2.9 1.8-3.7 0-1 1.6-2.7 1.8-4.3.3z', fill: '#d4831a' }],
            ['rect', { x: 11, y: 18.5, width: 10, height: 6.5, rx: 1.2, fill: '#fff4d8' }],
            hex(16, 21.75, 2.2, '#f0b84a'),
            shine(10, 22, 1, 2.6)
        ],
        'Polen': [
            ...[[11, 20, 4.2, '#f2b627'], [19.5, 19, 4.6, '#e99a1d'], [15, 12.5, 4.2, '#f5c84a'], [22.5, 11.5, 3.2, '#e3a52a'], [9.2, 12.5, 3, '#f0c040'], [15.8, 25, 3.4, '#d98b18']].map(([cx, cy, r, fill]) => ['circle', { cx, cy, r, fill }]),
            shine(13.6, 11, .8, 1.3), shine(18, 17.4, .8, 1.3)
        ],
        'Propolis': [
            ['path', { d: 'M8 24c-2-4 0-9 4-11 1-4 6-6.5 9.5-4 4 1.5 5.8 6 4 10 .5 4-3 7-7 6.6-3.6 1.6-8.5.9-10.5-1.6z', fill: '#7a4a22' }],
            ['path', { d: 'M12 17c1.5-1.4 3.4-1.8 5-1.2M18.5 13.5c1.6.2 2.8 1.2 3.4 2.6', fill: 'none', stroke: '#a8743e', 'stroke-width': 1.1, 'stroke-linecap': 'round' }],
            shine(12.5, 20, 1, 1.8)
        ],
        'Arı sütü': [
            ['rect', { x: 10.5, y: 6.5, width: 11, height: 4, rx: 1.2, fill: '#c9a24a' }],
            ['rect', { x: 9, y: 10.5, width: 14, height: 17.5, rx: 3.2, fill: '#f7f1df' }],
            ['rect', { x: 9, y: 10.5, width: 14, height: 17.5, rx: 3.2, fill: 'none', stroke: '#d9cfb0', 'stroke-width': 1 }],
            ['path', { d: 'M11.5 17.5h9v6.5a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2z', fill: '#efe2b8' }],
            shine(11.8, 14.5, .9, 2)
        ],
        'Balmumu': [hex(10.4, 12, 4.4, '#f5c242'), hex(18, 12, 4.4, '#f0b52f'), hex(14.2, 18.6, 4.4, '#e9a81f'), hex(21.8, 18.6, 4.4, '#f5c242'), hex(18, 25.2, 4.4, '#f0b52f')],
        'Ceviz': [
            ['path', { d: 'M16 4.5c6.5 0 10.5 5 10.5 11.5S22.5 28 16 28 5.5 22.5 5.5 16 9.5 4.5 16 4.5z', fill: '#b98a55' }],
            line('M16 5v22.5', '#8a6235', 1.3),
            line('M11 9c-1.6 2.4-1.2 4.6.4 6.2-1.8 2-1.8 4.6.2 6.8M21 9c1.6 2.4 1.2 4.6-.4 6.2 1.8 2 1.8 4.6-.2 6.8M8.6 14.5c1.2.6 1.6 1.8 1.2 3M23.4 14.5c-1.2.6-1.6 1.8-1.2 3', '#946a3c', 1),
            shine(10, 11, 1, 2)
        ],
        'Fındık': [
            ['path', { d: 'M16 10c5.5 0 9 4.5 9 9.5S21 29 16 29s-9-4.5-9-9.5S10.5 10 16 10z', fill: '#a86a35' }],
            ['path', { d: 'M8.5 14c1-5 4.5-8.5 7.5-8.5s6.5 3.5 7.5 8.5c-2.3-1.3-4.8-1.9-7.5-1.9S10.8 12.7 8.5 14z', fill: '#c9a36b' }],
            line('M10 13c1-2 2-3.6 3.4-4.6M22 13c-1-2-2-3.6-3.4-4.6M16 12V6', '#a88449', .8),
            ['path', { d: 'M16 3.5c-1.5 1.5-1.5 3 0 4.5', fill: 'none', stroke: '#6e8f3e', 'stroke-width': 1.4, 'stroke-linecap': 'round' }],
            nutShine(11.8, 20)
        ],
        'Antep fıstığı': [
            ['path', { d: 'M16 3.5c6 0 9.5 6 9.5 12.5S22 28.5 16 28.5 6.5 22.5 6.5 16 10 3.5 16 3.5z', fill: '#e8d6b3' }],
            ['path', { d: 'M16 6c3.3 0 5.4 4.5 5.4 10s-2.1 10-5.4 10-5.4-4.5-5.4-10S12.7 6 16 6z', fill: '#8fb04a' }],
            ['path', { d: 'M16 8.5c2 0 3.2 3.4 3.2 7.5S18 23.5 16 23.5c-1.3-2.5-1.8-5-1.8-7.5s.5-5 1.8-7.5z', fill: '#b0569a', 'fill-opacity': .55 }],
            line('M16 3.8c-1.4 3.5-1.4 20.8 0 24.4', '#c8b48e', .9)
        ],
        'Badem': [
            ['path', { d: 'M16 3c4.5 4 8.5 9.8 8.5 15.5 0 5.5-3.8 9.5-8.5 9.5s-8.5-4-8.5-9.5C7.5 12.8 11.5 7 16 3z', fill: '#c3854f' }],
            ...[[13, 12], [17.5, 10], [19.5, 15], [14, 17.5], [18, 21], [12, 22.5], [21, 19.5], [15.8, 25]].map(([cx, cy]) => ['circle', { cx, cy, r: .65, fill: '#9a6234' }]),
            line('M16 4.5c-1.8 6-1.8 15 0 22.5', '#a86c3c', .8),
            nutShine(11.5, 15)
        ],
        'Kestane': [
            ['path', { d: 'M16 4c3 2.6 9.5 6.6 9.5 13.3 0 6.4-4.5 10.7-9.5 10.7s-9.5-4.3-9.5-10.7C6.5 10.6 13 6.6 16 4z', fill: '#7b3f1f' }],
            ['path', { d: 'M7 21.5c2.7 1.4 5.8 2.1 9 2.1s6.3-.7 9-2.1c-.8 4-4.4 6.5-9 6.5s-8.2-2.5-9-6.5z', fill: '#d6b48a' }],
            ['path', { d: 'M15 5c-.4-1 0-2 1-2.4.8.6.9 1.6.3 2.6z', fill: '#d6b48a' }],
            nutShine(11, 13.5)
        ],
        'Yer fıstığı': [
            ['path', { d: 'M16 3.5c4 0 6.4 3 6.4 6.5 0 2.5-1.2 3.6-1.2 6s1.6 3.5 1.6 6.3c0 3.6-2.9 6.2-6.8 6.2s-6.8-2.6-6.8-6.2c0-2.8 1.6-3.9 1.6-6.3s-1.2-3.5-1.2-6c0-3.5 2.4-6.5 6.4-6.5z', fill: '#d7b37a' }],
            line('M12 8.5h8M11.4 12h9.2M11.6 20h8.8M11 23.5h10M12.4 27h7.2M13.5 4.5v23.5M18.5 4.5v23.5', '#b88f55', .7)
        ],
        'Kuru kayısı': [
            ['ellipse', { cx: 12, cy: 19, rx: 8.5, ry: 6.5, fill: '#d47e2a', transform: 'rotate(-18 12 19)' }],
            ['ellipse', { cx: 20.5, cy: 13, rx: 7.5, ry: 5.8, fill: '#e39236', transform: 'rotate(15 20.5 13)' }],
            line('M7.5 18.5c2-1 4.5-.6 6 .8M10 22.5c2.2-.5 4 0 5 1.4M17 11.5c1.6-.8 3.6-.6 5 .6M19 15.5c1.8-.4 3.4.2 4.2 1.4', '#b8641c', .9)
        ],
        'Kuru incir': [
            ['ellipse', { cx: 16, cy: 18.5, rx: 10.5, ry: 8.5, fill: '#c9a26a' }],
            ['ellipse', { cx: 16, cy: 18.5, rx: 6.5, ry: 4.6, fill: '#b48955' }],
            line('M9 15c3-1.6 11-1.6 14 0M8.5 21.5c3.6 1.8 11.4 1.8 15 0', '#a37c4a', .8),
            line('M16 10V6.5', '#7a5a34', 1.6),
            shine(10.5, 16, 1.1, 2)
        ],
        'Kuru üzüm': [
            ...[[10, 12], [17, 10], [23, 13.5], [13, 18.5], [20, 18.5], [9.5, 24], [16.5, 25], [23.5, 23.5]].map(([cx, cy], i) => ['ellipse', { cx, cy, rx: 3.6, ry: 2.8, fill: i % 2 ? '#6b3a4a' : '#7d4757', transform: `rotate(${i * 23} ${cx} ${cy})` }]),
            line('M8.5 11.5c1-.6 2-.6 3 0M15.5 9.5c1-.6 2-.6 3 0M12 18c1-.6 2-.6 3 0M19 18c1-.6 2-.6 3 0', '#a8707f', .7)
        ],
        // ---------- Sebzeler ----------
        'Domates': [
            ['path', { d: 'M16 9.5c6.4 0 11 3.9 11 9.3S22.1 28 16 28 5 24.2 5 18.8s4.6-9.3 11-9.3z', fill: '#e2463a' }],
            line('M12 11.5c-1 2.3-1.3 5-.8 7.6M20 11.5c1 2.3 1.3 5 .8 7.6', '#c4362c', 1.1),
            shine(10.5, 16.5, 1.6, 2.4),
            ['path', { d: 'M16 11.2l-1.8-3 1.8 1.1 1.8-1.1zM16 11l-4.4-1.6 3.1-.6M16 11l4.4-1.6-3.1-.6', fill: '#4f8f3e', stroke: '#4f8f3e', 'stroke-width': 1, 'stroke-linejoin': 'round' }],
            line('M16 9V5.5', '#4f8f3e', 1.6)
        ],
        'Biber': [
            ['path', { d: 'M12.5 9.5c-3.5 1.5-4.2 6.6-2.4 11.6 1.7 4.7 5.6 7.8 9.3 7.6 1-.1.9-1.3.1-2-2.9-2.6-3.6-7.6-2.8-12.2.6-3.6-.8-6.4-4.2-5z', fill: '#3f9e3a' }],
            shine(12, 15, 1.1, 2.6),
            ['path', { d: 'M11.5 10.2c.4-1.6 1.9-2.6 3.6-2.4', fill: 'none', stroke: '#2f7a2c', 'stroke-width': 2.2, 'stroke-linecap': 'round' }],
            line('M14.8 7.9c.4-1.8 1.6-3.1 3.3-3.6', '#4b6b2a', 1.6)
        ],
        'Patlıcan': [
            ['path', { d: 'M12.2 10.8c-4.6 3-6.6 9-4.4 13.6 2 4.3 7.4 5.3 11.3 2.6 3.6-2.5 4.2-6.6 3.2-10.6-.8-3.3-1.6-5.6-4.4-6.6-2-.7-3.9-.3-5.7 1z', fill: '#5b2f6e' }],
            shine(11, 19, 1.2, 2.8),
            ['path', { d: 'M11.5 11c1.6-2.4 4.8-3.2 7.5-1.6l1.6 2.6c-2.3-.4-4-.1-5.5.9-1.2-.6-2.4-.9-3.6-1.9z', fill: '#4f8f3e' }],
            line('M17.5 9.2c.6-2 1.9-3.4 3.7-4', '#4f8f3e', 1.7)
        ],
        'Salatalık': [
            ['path', { d: 'M7.4 24.6c-2.4-2.4-.8-6.8 3.6-11.2s8.8-6 11.2-3.6.8 6.8-3.6 11.2-8.8 6-11.2 3.6z', fill: '#4e9a3e' }],
            ['path', { d: 'M9.6 21.6c2.6-4.3 6.3-8 10.4-10.3', fill: 'none', stroke: '#7cc067', 'stroke-width': 1.2, 'stroke-linecap': 'round' }],
            ['circle', { cx: 12, cy: 20.5, r: .7, fill: '#2f6e28' }], ['circle', { cx: 16.5, cy: 15.2, r: .7, fill: '#2f6e28' }], ['circle', { cx: 19.5, cy: 17.6, r: .7, fill: '#2f6e28' }],
            ['circle', { cx: 14.2, cy: 22.8, r: .7, fill: '#2f6e28' }], line('M21.8 10.2l2.6-2.4', '#6b8a3a', 1.6)
        ],
        'Kabak': [
            ['path', { d: 'M8 20.5c0-5.8 3.6-9 8-9s8 3.2 8 9-3.6 7.5-8 7.5-8-1.7-8-7.5z', fill: '#f08a24' }],
            line('M16 11.5c-1.6 3-2 10.5 0 16.5M16 11.5c1.6 3 2 10.5 0 16.5M11.5 13c-2 3.2-2.4 9.6-.4 14M20.5 13c2 3.2 2.4 9.6.4 14', '#d06d14', 1.1),
            ['path', { d: 'M15 11.6c-.2-2.2.4-4.2 2-5.6l1.2 1c-1 1.4-1.3 2.9-1 4.6z', fill: '#6b4a2b' }],
            ['path', { d: 'M17.5 7.5c2.5-2 5.6-1.6 7.2.4-2.5 1.6-5.2 1.4-7.2-.4z', fill: '#5f9e4b' }]
        ],
        'Patates': [
            ['path', { d: 'M6.6 18.4c-.6-4.7 3-8.5 8.6-9.2 5.7-.7 10.4 2.1 10.6 6.8.2 4.5-3.6 8.8-9 9.6-5.3.8-9.6-2.6-10.2-7.2z', fill: '#c9975a' }],
            ['ellipse', { cx: 11.5, cy: 15.6, rx: .9, ry: .6, fill: '#9c6d36' }], ['ellipse', { cx: 19.5, cy: 13.2, rx: .9, ry: .6, fill: '#9c6d36' }],
            ['ellipse', { cx: 17.4, cy: 20.4, rx: .9, ry: .6, fill: '#9c6d36' }], ['ellipse', { cx: 22.6, cy: 18, rx: .9, ry: .6, fill: '#9c6d36' }],
            shine(11, 13, 1.4, 1.2)
        ],
        'Soğan': [
            ['path', { d: 'M16 8.5c2 3.5 9.6 5.5 9.6 12.2 0 4.4-4.2 7.3-9.6 7.3S6.4 25.1 6.4 20.7C6.4 14 14 12 16 8.5z', fill: '#c9792e' }],
            line('M16 9.5c-2.6 4-5 8-4.2 17.8M16 9.5c2.6 4 5 8 4.2 17.8M16 9.5v18.3', '#a65d1f', 1),
            line('M16 8.5V4.5M14.5 5l1.5-1.5L17.5 5', '#8a6a3a', 1.2),
            line('M13 28.5l-1 1.5M16 28.5v1.8M19 28.5l1 1.5', '#d8c5a6', 1)
        ],
        'Sarımsak': [
            ['path', { d: 'M16 6c1.6 3 8.4 6 8.4 12.6 0 5.4-3.8 9.2-8.4 9.2s-8.4-3.8-8.4-9.2C7.6 12 14.4 9 16 6z', fill: '#f3ece0' }],
            line('M16 7.5c-3 4.6-4.4 10.6-2.4 20M16 7.5c3 4.6 4.4 10.6 2.4 20M11 13c-2 4-2 9 .6 13.6M21 13c2 4 2 9-.6 13.6', '#d8c9b2', 1),
            line('M16 6V3', '#b8a88c', 1.6), line('M13.5 28.6l-.8 1.4M16 28.6v1.6M18.5 28.6l.8 1.4', '#c7b89c', 1)
        ],
        'Havuç': [
            ['path', { d: 'M10.4 12.2c2.4-2.4 6-2.1 8 0 2.1 2 2.4 5.6 0 8l-11.6 9c-.6.4-1.2-.2-.8-.8z', fill: '#f07f1e' }],
            line('M11.6 17l2 1M9.6 21.2l2.2.8M14.4 14l1.8 1.4', '#c9620f', 1.1),
            ['path', { d: 'M17.6 12.6c.4-3.6 2.4-6.6 5.6-8.4.6 3.4-1.4 7-5.6 8.4z', fill: '#5f9e4b' }],
            ['path', { d: 'M18.6 13.8c3.4-1.2 7-.6 9.6 1.8-3.2 1.6-7 1.2-9.6-1.8z', fill: '#4f8f3e' }],
            ['path', { d: 'M18 13c1.6-2.8 4.6-4.4 8-4.2-1.4 3-4.6 4.6-8 4.2z', fill: '#6fae55' }]
        ],
        'Lahana': [
            ['circle', { cx: 16, cy: 17, r: 11, fill: '#8cc56b' }],
            ['path', { d: 'M16 6.2c-3.8 3-5.2 7-4.4 11.6.7 4.2 2.8 7.4 4.4 10.2', fill: 'none', stroke: '#5f9e4b', 'stroke-width': 1.3, 'stroke-linecap': 'round' }],
            ['path', { d: 'M8 10.5c3.4 1 6 3.4 7.6 7M24 10.5c-3.4 1-6 3.4-7.6 7M6 20c3.6-.4 7 .8 9.6 3M26 20c-3.6-.4-7 .8-9.6 3', fill: 'none', stroke: '#6fae55', 'stroke-width': 1.1, 'stroke-linecap': 'round' }],
            ['path', { d: 'M5.6 15.6C4.8 11 8 6.4 12 5.6 9.4 8 8 11.4 8.4 15.4z', fill: '#a8d48b' }],
            shine(21, 12, 1.4, 2)
        ],
        'Karnabahar': [
            ['path', { d: 'M5 19c2.8 6.4 7 9 11 9s8.2-2.6 11-9c-3 1.8-6.6 2.6-11 2.6S8 20.8 5 19z', fill: '#5f9e4b' }],
            ...[[11, 14, 4.2], [16, 11.5, 4.6], [21, 14, 4.2], [13.2, 18.2, 4], [18.8, 18.2, 4]].map(([cx, cy, r]) => ['circle', { cx, cy, r, fill: '#f4efdc', stroke: '#e1d7b8', 'stroke-width': .8 }])
        ],
        'Brokoli': [
            ['path', { d: 'M14 18h4l1.6 10.4h-7.2z', fill: '#7fb35a' }],
            line('M16 18l-4-3M16 18l4-3', '#6aa04a', 1.6),
            ...[[10, 13.5, 4.6], [16, 10.2, 5.2], [22, 13.5, 4.6], [13, 16.5, 4], [19, 16.5, 4]].map(([cx, cy, r]) => ['circle', { cx, cy, r, fill: '#3e8a3a', stroke: '#2f6e2c', 'stroke-width': .8 }])
        ],
        'Marul': [
            ['path', { d: 'M16 28c-6.5 0-10.5-4-10.5-9.5C5.5 12 10 6 16 6s10.5 6 10.5 12.5C26.5 24 22.5 28 16 28z', fill: '#9fd17a' }],
            ['path', { d: 'M5.8 16.5c2.2-1 4.2-.4 5.6 1.4M26.2 16.5c-2.2-1-4.2-.4-5.6 1.4M8 10.6c2.6.4 4.4 2 5 4.4M24 10.6c-2.6.4-4.4 2-5 4.4', fill: 'none', stroke: '#74b453', 'stroke-width': 1.2, 'stroke-linecap': 'round' }],
            line('M16 8.5V27', '#e4f2d3', 1.6), line('M16 15l-3.4-3M16 15l3.4-3M16 21l-4-3.2M16 21l4-3.2', '#e4f2d3', 1)
        ],
        'Ispanak': [
            ['path', { d: 'M15 28V17', stroke: '#5f9e4b', 'stroke-width': 1.6, 'stroke-linecap': 'round' }],
            ['path', { d: 'M15 18c-5 0-9-3.6-9-8.6C6 6.6 8 4.5 10.6 4.5c3.8 0 5.4 4.6 4.4 13.5z', fill: '#3f8a3a' }],
            ['path', { d: 'M15 20c1-6 4.4-9.6 9-9.6 2 0 3 1.3 3 3.2 0 4.2-5 6.6-12 6.4z', fill: '#4f9e44' }],
            line('M15 17.5c-2.6-3.4-4-7-4-10.6M15 19.6c2.6-2.8 5.6-4.8 9-5.8', '#86c56a', 1)
        ],
        'Pırasa': [
            ['path', { d: 'M13.6 29.2h4.8l-.4-14h-4z', fill: '#f2f2e6', stroke: '#dcdcc8', 'stroke-width': .6 }],
            ['path', { d: 'M14 15.4c-1.8-4-4.6-7.6-8-10.4 3.8 1 7 3.4 9.2 6.8z', fill: '#5f9e4b' }],
            ['path', { d: 'M18 15.4c1.8-4 4.6-7.6 8-10.4-3.8 1-7 3.4-9.2 6.8z', fill: '#4f8f3e' }],
            ['path', { d: 'M14.6 15.4c0-4.6.4-8.6 1.4-12.4 1 3.8 1.4 7.8 1.4 12.4z', fill: '#7fbf5e' }],
            ['path', { d: 'M14 15.2h4v3.4h-4z', fill: '#c7e2a8' }], line('M14.6 29.6l-.6 1M16 29.6v1.2M17.4 29.6l.6 1', '#c8c3a8', .9)
        ],
        'Fasulye': [
            ['path', { d: 'M6 24.5C9.5 19 14 12.5 22.5 6.5c1.5-1 3.2.6 2.2 2.1C19.5 16.5 13.5 22.5 8 26c-1.4.9-2.8-.3-2-1.5z', fill: '#58a84a' }],
            line('M8.2 23.6c5-4.6 9.8-9.8 14.6-15.6', '#3f8a35', 1),
            ['circle', { cx: 11, cy: 21, r: 1, fill: '#86c56a' }], ['circle', { cx: 15, cy: 16.8, r: 1, fill: '#86c56a' }], ['circle', { cx: 19, cy: 12.4, r: 1, fill: '#86c56a' }],
            line('M23.8 7.2l2.4-2.6', '#6b8a3a', 1.4)
        ],
        'Bezelye': [
            ['path', { d: 'M4.5 18.5c3-5.4 10.5-9.4 19-9.2 2.4 0 3.6 1.6 2.8 3.4-3 6.4-11 10-19 9.6-2.4-.1-3.6-2-2.8-3.8z', fill: '#5fae4a' }],
            ...[[9.6, 17.4], [14, 15.6], [18.4, 13.8], [22.6, 12.4]].map(([cx, cy]) => ['circle', { cx, cy, r: 2.2, fill: '#9bd36f', stroke: '#4f9a3c', 'stroke-width': .6 }]),
            line('M26 10.6c1.4-1.8 2.6-3.6 2.8-5.8', '#6b8a3a', 1.3)
        ],
        'Bamya': [
            ['path', { d: 'M12.6 9.5c-2.4 3.8-3.4 9.8-2 15 .6 2.3 2.2 3.8 3.4 4.8.4-1.6 1.2-2.8 2.6-4.6 2.8-3.8 4.6-8.8 4.2-13.4-.2-2.4-1.6-3.6-3.6-3.8-1.6-.2-3.4.2-4.6 2z', fill: '#4d9a3c' }],
            line('M13.6 10.2c-1.4 4.2-1.8 9.8-.4 15.6M16.6 9.6c-.2 5-1.6 10.6-3.4 15.6', '#357a2c', 1),
            ['path', { d: 'M12.6 9.6c.6-2 2.4-3.2 4.6-3l.4 2.4c-1.8-.2-3.4.2-5 .6z', fill: '#2f6e28' }], line('M17 6.6l.6-3', '#4b6b2a', 1.4)
        ],
        'Enginar': [
            ['path', { d: 'M16 27.5c-5.2 0-9-4.4-9-10.2C7 11 11 6.5 16 6.5s9 4.5 9 10.8c0 5.8-3.8 10.2-9 10.2z', fill: '#7aa25a' }],
            ['path', { d: 'M8 15.5c2.4 3 5 4.4 8 4.4s5.6-1.4 8-4.4M7.6 20.5c2.6 2.6 5.4 3.8 8.4 3.8s5.8-1.2 8.4-3.8M10 10.6c1.6 2.6 3.6 4 6 4s4.4-1.4 6-4', fill: 'none', stroke: '#557d3c', 'stroke-width': 1.2, 'stroke-linecap': 'round' }],
            ['path', { d: 'M14.6 6.8 16 3.4l1.4 3.4z', fill: '#a07ab0' }], line('M16 27.5v3', '#557d3c', 1.8)
        ],
        'Turp': [
            ['path', { d: 'M16 12.2c5 0 8.4 3 8.4 7.4 0 4.6-4 7.6-8.4 8.6-4.4-1-8.4-4-8.4-8.6 0-4.4 3.4-7.4 8.4-7.4z', fill: '#d8344f' }],
            ['path', { d: 'M16 28.2v2.6', stroke: '#e9c9cf', 'stroke-width': 1.2, 'stroke-linecap': 'round' }],
            shine(12, 17.5, 1.5, 2.2),
            ['path', { d: 'M15.4 12.4c-2.6-3-5.6-4.6-9-4.4 1.6 3.4 4.8 5 9 4.4z', fill: '#4f8f3e' }],
            ['path', { d: 'M16.6 12.4c2.6-3 5.6-4.6 9-4.4-1.6 3.4-4.8 5-9 4.4z', fill: '#5f9e4b' }],
            ['path', { d: 'M15.4 12.2c-.4-3.6.6-6.6 2.6-9 1.4 3.4.4 6.8-2.6 9z', fill: '#6fae55' }]
        ],
        'Mantar': [
            ['path', { d: 'M4.5 16.5C4.5 10 9.6 5.5 16 5.5S27.5 10 27.5 16.5c0 1-.8 1.6-1.8 1.6H6.3c-1 0-1.8-.6-1.8-1.6z', fill: '#c98f5a' }],
            ['path', { d: 'M12.4 18.1h7.2l.9 8.4c.2 1.4-.8 2.4-2.2 2.4h-4.6c-1.4 0-2.4-1-2.2-2.4z', fill: '#f2e6d2' }],
            ['ellipse', { cx: 11, cy: 11.5, rx: 1.6, ry: 1.1, fill: '#e9c39b' }], ['ellipse', { cx: 19.5, cy: 9.6, rx: 1.2, ry: .9, fill: '#e9c39b' }],
            ['ellipse', { cx: 22.4, cy: 13.6, rx: 1.4, ry: 1, fill: '#e9c39b' }]
        ],
        'Yeşillik': [
            line('M16 29V13M16 21l-6-6M16 18l6-6M16 25l-4.5-3.2M16 24l5-3.4', '#4f8f3e', 1.3),
            ...[[16, 9.5, 3.4], [9, 13.5, 3], [23, 10.5, 3], [10.5, 20.5, 2.6], [21.8, 19.2, 2.6], [12.4, 6.8, 2.2], [19.8, 6, 2.2]].map(([cx, cy, r]) => ['circle', { cx, cy, r, fill: '#5fae4a', stroke: '#3f8a35', 'stroke-width': .7 }])
        ],
        'Tarla': [
            ['circle', { cx: 24.5, cy: 7.5, r: 3.4, fill: '#f2c24b' }],
            ['path', { d: 'M1.5 17.5c7-2.5 22-2.5 29 0v12h-29z', fill: '#8a6a3f' }],
            line('M3 20.5c7-1.8 19-1.8 26 0M2.5 24c7.2-1.8 19.8-1.8 27 0M2 27.5c7.5-1.8 20.5-1.8 28 0', '#6f5230', 1),
            line('M5 18.6v-2.2M9 18v-2.4M13 17.7v-2.5M17 17.6v-2.5M21 17.8v-2.4M25 18.2v-2.2', '#7fa646', 1.2)
        ],
        'Meyve bahçesi': [ground(), ...tree(10, 13, 5.2, '#5f9e4b', '#e04b3f'), ...tree(22, 11.5, 6, '#4f8f3e', '#e04b3f')],
        'Bağ': [
            ground('#a9c47a'),
            line('M5 9v16M16 9v16M27 9v16', '#7a5332', 1.6),
            line('M5 11h22', '#8f8f8f', .8),
            ...[[8.5, 13], [13, 12.5], [19.5, 12.8], [24, 13.2]].map(([cx, cy]) => ['path', { d: `M${cx} ${cy}c-2.5-1-3-3.5-1.2-5 .6 1.6 2 1.4 2.4.2 1.6 1.4 1.4 3.6-1.2 4.8z`, fill: '#5f9e4b' }]),
            ...[[10.5, 16.5], [12, 16.5], [11.2, 18.2], [21.5, 16.8], [23, 16.8], [22.2, 18.5]].map(([cx, cy]) => ['circle', { cx, cy, r: 1.15, fill: '#7a3e8c' }])
        ],
        'Zeytinlik': [
            ground('#b4c27e'),
            ['path', { d: 'M15 27c.6-3-1.4-5.4-.4-8.4M17.4 27c-.4-3 1.8-5.2.8-8', fill: 'none', stroke: '#6b5034', 'stroke-width': 2, 'stroke-linecap': 'round' }],
            ['path', { d: 'M5 14c0-4.5 4.8-7.5 11-7.5S27 9.5 27 14c0 3.6-4.5 5.6-11 5.6S5 17.6 5 14z', fill: '#7c9a63' }],
            ['path', { d: 'M9 12.5c2-1.5 4.4-1.6 6.2-.6M17.5 10.8c2-.8 4.4-.4 5.8 1', fill: 'none', stroke: '#9fb889', 'stroke-width': 1.1, 'stroke-linecap': 'round' }],
            ['circle', { cx: 12, cy: 15.5, r: .9, fill: '#3e4a2c' }], ['circle', { cx: 20.5, cy: 14.5, r: .9, fill: '#3e4a2c' }]
        ],
        'Fındık bahçesi': [
            ground(),
            line('M13 26l1-8M16 26v-9M19 26l-1-8', '#7a5332', 1.4),
            ['path', { d: 'M4.5 16.5c0-5 5-9 11.5-9s11.5 4 11.5 9c0 3-4.5 4.5-11.5 4.5S4.5 19.5 4.5 16.5z', fill: '#5a9447' }],
            ['circle', { cx: 11, cy: 15, r: 1.2, fill: '#a86a35' }], ['circle', { cx: 20, cy: 13.5, r: 1.2, fill: '#a86a35' }], ['circle', { cx: 16, cy: 17.5, r: 1.2, fill: '#a86a35' }]
        ],
        'Sera': [
            ground('#a9c47a'),
            ['path', { d: 'M3.5 25V15c0-5 5.6-8.5 12.5-8.5S28.5 10 28.5 15v10z', fill: '#d9ecf2' }],
            ['path', { d: 'M3.5 25V15c0-5 5.6-8.5 12.5-8.5S28.5 10 28.5 15v10z', fill: 'none', stroke: '#8fb3bf', 'stroke-width': 1.2 }],
            line('M10 25V9.2M16 25V6.5M22 25V9.2M3.5 17h25', '#8fb3bf', 1),
            ['path', { d: 'M6 25c.5-2 1.5-3 3-3.5M12.5 25c.5-2 1.5-3 3-3.5M19 25c.5-2 1.5-3 3-3.5', fill: 'none', stroke: '#5f9e4b', 'stroke-width': 1.3, 'stroke-linecap': 'round' }]
        ],
        'Çayır / mera': [
            ['path', { d: 'M1.5 20c5-5 10-5 14.5-1.5 4.5-4 10-4 14.5 1v10h-29z', fill: '#86b55a' }],
            ['path', { d: 'M1.5 24c7-3 22-3 29 0v6h-29z', fill: '#6fa24a' }],
            line('M6 24l-1-3M7.5 24l.2-3.4M9 24l1.2-3M20 23.5l-1-3M21.5 23.5l.2-3.4M23 23.5l1.2-3', '#4f8a3e', 1),
            ['circle', { cx: 7, cy: 8, r: 2.6, fill: '#f2c24b' }]
        ],
        'Hobi bahçesi': [
            ground(),
            ['path', { d: 'M8 20v-7l6-5 6 5v7z', fill: '#e8d2b0' }],
            ['path', { d: 'M6.5 13.5 14 7l7.5 6.5', fill: 'none', stroke: '#b5532f', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }],
            ['rect', { x: 12.5, y: 15.5, width: 3, height: 4.5, fill: '#8a5a3c' }],
            line('M22 26v-6M25 26v-6M28 26v-6M21 22h8', '#a07a4c', 1.2),
            ...tree(25, 12.5, 3.4, '#5f9e4b')
        ],
        'Diğer arazi': [
            ground(),
            ['path', { d: 'M16 4.5a6.5 6.5 0 0 1 6.5 6.5c0 4.8-6.5 11.5-6.5 11.5S9.5 15.8 9.5 11A6.5 6.5 0 0 1 16 4.5z', fill: '#d9661f' }],
            ['circle', { cx: 16, cy: 11, r: 2.4, fill: '#fff' }]
        ]
    };
    Object.assign(shapes, products);
    // "Diğer …" ürünleri kategorinin genel simgesini kullanır.
    const aliases = {
        'Diğer sebze': 'Domates', 'Diğer tahıl': 'Buğday', 'Diğer yem': 'Saman balyası', 'Diğer arı ürünü': 'Bal', 'Diğer kuruyemiş': 'Ceviz',
        Meyve: 'Elma', Sebze: 'Domates', Tahil: 'Buğday', Yem: 'Yonca balyası', Kuruyemis: 'Ceviz', Arazi: 'Tarla'
    };

    function node(name, size = 20, cls = '') {
        const parts = shapes[name] || shapes[aliases[name]] || shapes.Diğer;
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

    return { node, names: Object.keys(shapes), has: name => Boolean(shapes[name] || shapes[aliases[name]]) };
})();
