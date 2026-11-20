import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Sade çizgi simgeler (24×24). Ad → çizim.
const icons = {
    market: <><Path d="M4 10h16l-1.2-5H5.2z" /><Path d="M5 10v9h14v-9" /><Path d="M10 19v-5h4v5" /></>,
    map: <><Path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z" /><Path d="M9 4v14M15 6v14" /></>,
    plus: <Path d="M12 5v14M5 12h14" />,
    chat: <Path d="M4 5h16v11H9l-5 4z" />,
    user: <><Circle cx={12} cy={8} r={4} /><Path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
    bell: <><Path d="M6 16V11a6 6 0 0112 0v5l2 2H4z" /><Path d="M10 20a2 2 0 004 0" /></>,
    heart: <Path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" />,
    settings: <><Circle cx={12} cy={12} r={3} /><Path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></>,
    shield: <><Path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><Path d="M8.5 12l2.5 2.5 4.5-5" /></>,
    search: <><Circle cx={11} cy={11} r={6.5} /><Path d="M16 16l4.5 4.5" /></>,
    filter: <Path d="M4 5h16l-6 7.5V19l-4 1.5v-8z" />,
    calendar: <><Rect x={3.5} y={5} width={17} height={15} rx={2} /><Path d="M3.5 10h17M8 3v4M16 3v4" /></>,
    tag: <><Path d="M3 12V4h8l9 9-8 8z" /><Circle cx={7.5} cy={8.5} r={1.3} /></>,
    ban: <><Circle cx={12} cy={12} r={8.5} /><Path d="M6 6l12 12" /></>,
    bookmark: <Path d="M6 3h12v18l-6-4-6 4z" />,
    logout: <><Path d="M14 4h5v16h-5" /><Path d="M10 8l-4 4 4 4M6 12h10" /></>,
    phone: <Path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a1 1 0 01-1 1A16 16 0 014 5a1 1 0 011-1z" />,
    share: <><Path d="M12 3v12M7 8l5-5 5 5" /><Path d="M5 13v7h14v-7" /></>,
    flag: <><Path d="M5 21V4" /><Path d="M5 4h11l-2 4 2 4H5" /></>,
    camera: <><Path d="M4 8h3l2-3h6l2 3h3v11H4z" /><Circle cx={12} cy={13} r={3.5} /></>,
    image: <><Rect x={3.5} y={4.5} width={17} height={15} rx={2} /><Circle cx={9} cy={10} r={1.8} /><Path d="M4 17l5-4 4 3 3-2 4 3" /></>,
    trash: <><Path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></>,
    star: <Path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.8z" />,
    pin: <><Path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0113 0c0 5-6.5 11-6.5 11z" /><Circle cx={12} cy={10} r={2.4} /></>,
    eye: <><Path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><Circle cx={12} cy={12} r={3} /></>,
    offer: <><Path d="M7 17L17 7" /><Circle cx={7.5} cy={7.5} r={2.2} /><Circle cx={16.5} cy={16.5} r={2.2} /></>,
    lock: <><Rect x={5} y={10.5} width={14} height={10} rx={2} /><Path d="M8 10.5V7.5a4 4 0 018 0v3" /></>,
    list: <Path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
    grid: <><Rect x={4} y={4} width={7} height={7} rx={1.5} /><Rect x={13} y={4} width={7} height={7} rx={1.5} /><Rect x={4} y={13} width={7} height={7} rx={1.5} /><Rect x={13} y={13} width={7} height={7} rx={1.5} /></>,
    send: <Path d="M4 12l16-8-6 16-2.5-6.5z" />,
    edit: <><Path d="M4 20h4L19 9l-4-4L4 16z" /><Path d="M13.5 6.5l4 4" /></>,
    close: <Path d="M6 6l12 12M18 6L6 18" />,
    globe: <><Circle cx={12} cy={12} r={8.5} /><Path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5s1-6 3.5-8.5z" /></>,
    moon: <Path d="M19 14.5A7.5 7.5 0 019.5 5a7.5 7.5 0 109.5 9.5z" />,
    key: <><Circle cx={8} cy={14} r={4} /><Path d="M11 11l8-8M16 6l2.5 2.5M14 8l2 2" /></>,
    info: <><Circle cx={12} cy={12} r={8.5} /><Path d="M12 11v5M12 8h.01" /></>,
    check: <Path d="M5 12.5l4.5 4.5L19 7.5" />,
    idea: <><Path d="M9 18h6M10 21h4" /><Path d="M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z" /></>
} as const;

export type IconName = keyof typeof icons;

export function Icon({ name, color, size = 22, width = 1.9 }: { name: IconName; color: string; size?: number; width?: number }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
            {icons[name]}
        </Svg>
    );
}
