// Renkler web uygulamasıyla aynı (ticaret.css ve koyu tema).
export const palettes = {
    light: {
        bg: '#F3F5F1', panel: '#FFFFFF', ink: '#1F2A22', muted: '#66735F', line: '#DFE5DC',
        green: '#1D4A33', green2: '#2B6A48', greenSoft: '#EEF4EC', accent: '#D9661F', accentDark: '#B9520F',
        danger: '#A13C26', dangerSoft: '#FCEBE6', gold: '#D6AD45', onGreen: '#FFFFFF', input: '#FFFFFF',
        map: ['#EDF2EA', '#D5E8CC', '#A9D096', '#6FAA5C', '#3B8350', '#1D4A33'], mapBorder: '#FFFFFF', mapSea: '#EEF5F7',
        shadow: '#1D4A33'
    },
    dark: {
        bg: '#0F1612', panel: '#18221C', ink: '#E3EBE4', muted: '#9FB0A2', line: '#2C3A31',
        green: '#7FCB95', green2: '#8FD3A5', greenSoft: '#1D2A22', accent: '#E2762F', accentDark: '#F39A5C',
        danger: '#F2A39B', dangerSoft: '#3A1D1A', gold: '#E2BE5C', onGreen: '#0F1A13', input: '#121B16',
        map: ['#223029', '#2C4A35', '#36693F', '#4F8F4F', '#79B65F', '#B6DD7A'], mapBorder: '#121A15', mapSea: '#16201A',
        shadow: '#000000'
    }
};
export type Colors = typeof palettes.light;
export const radius = { s: 8, m: 12, l: 16, pill: 999 };
