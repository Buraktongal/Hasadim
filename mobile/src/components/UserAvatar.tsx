import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { get } from '../lib/api';
import { useApp } from '../lib/app-state';
import { initials } from '../lib/format';
import type { PublicProfile } from '../lib/types';
import { FramedImage } from './ProfileMedia';

// Kullanıcının herkese açık profilini (fotoğraf, ad) bir kez indirip uygulama boyunca saklar.
const cache = new Map<string, PublicProfile | null>();
const pending = new Map<string, Promise<PublicProfile | null>>();
export function fetchProfile(id: string): Promise<PublicProfile | null> {
    if (cache.has(id)) return Promise.resolve(cache.get(id)!);
    if (!pending.has(id)) pending.set(id, get<PublicProfile>('/api/profiles/' + id).then(p => p, () => null).then(p => { cache.set(id, p); pending.delete(id); return p; }));
    return pending.get(id)!;
}
export function useProfile(id?: string | null) {
    const [p, setP] = useState<PublicProfile | null>(() => (id ? cache.get(id) ?? null : null));
    useEffect(() => {
        if (!id) return;
        let live = true;
        void fetchProfile(id).then(x => { if (live) setP(x); });
        return () => { live = false; };
    }, [id]);
    return p;
}

// Yuvarlak profil fotoğrafı; fotoğraf yoksa baş harfler.
export function UserAvatar({ userId, name, size = 44 }: { userId?: string | null; name: string; size?: number }) {
    const { colors: c } = useApp();
    const p = useProfile(userId);
    return (
        <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.greenSoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {p?.photoUrl ? <FramedImage url={p.photoUrl} frame={p.photoFrame} style={{ width: size, height: size }} />
                : <Text style={{ color: c.green2, fontWeight: '900', fontSize: size * 0.36 }}>{initials(p?.businessName || p?.displayName || name)}</Text>}
        </View>
    );
}
