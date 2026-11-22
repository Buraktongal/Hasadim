import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Linking, Platform, Pressable, Share, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useApp } from '../lib/app-state';
import { PUBLIC_WEB_URL } from '../lib/config';
import { Icon } from './Icon';
import { afterModal, Sheet, toast } from './ui';

// Uygulama içi Türkçe paylaşım penceresi: WhatsApp, Mesajlar, E-posta, Telegram ve sistemin
// kendi paylaşım menüsü ("Diğer uygulamalar"). Sistem menüsü telefonun diline göre açılır.
export type ShareContent = { title: string; text: string; path: string };

export const shareUrl = (path: string) => PUBLIC_WEB_URL + path;

export function useShare() {
    // İçerik kapanınca da tutulur; pencere kapanma animasyonu boyunca boşalmaz.
    const [content, setContent] = useState<ShareContent | null>(null);
    const [visible, setVisible] = useState(false);
    const node = <ShareSheet content={content} visible={visible} onClose={() => setVisible(false)} />;
    return { open: (x: ShareContent) => { void Haptics.selectionAsync().catch(() => undefined); setContent(x); setVisible(true); }, node };
}

function ShareSheet({ content, visible, onClose }: { content: ShareContent | null; visible: boolean; onClose: () => void }) {
    const { colors: c, t } = useApp();
    if (!content) return null;
    const url = shareUrl(content.path);
    const message = content.text + '\n' + url;
    const enc = encodeURIComponent;
    const open = async (link: string, name: string) => {
        onClose();
        afterModal(() => { Linking.openURL(link).catch(() => toast(t(name) + ' ' + t('açılamadı. Uygulama yüklü olmayabilir.'))); });
    };
    const targets: { key: string; label: string; color: string; icon: React.ReactNode; run: () => void }[] = [
        { key: 'wa', label: 'WhatsApp', color: '#25D366', icon: <Brand d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.9s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.3.5-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l2 1c.3.1.5.2.5.3.1.2.1.7-.1 1.3z" />, run: () => open('https://wa.me/?text=' + enc(message), 'WhatsApp') },
        { key: 'sms', label: 'Mesajlar', color: '#34C759', icon: <Icon name="chat" color="#fff" size={24} />, run: () => open((Platform.OS === 'ios' ? 'sms:&body=' : 'sms:?body=') + enc(message), 'Mesajlar') },
        { key: 'mail', label: 'E-posta', color: '#3478F6', icon: <Icon name="send" color="#fff" size={22} />, run: () => open('mailto:?subject=' + enc(content.title) + '&body=' + enc(message), 'E-posta') },
        { key: 'tg', label: 'Telegram', color: '#229ED9', icon: <Brand d="M21.5 4.3 18.4 19c-.2 1-.8 1.3-1.7.8l-4.6-3.4-2.2 2.1c-.2.2-.5.5-1 .5l.3-4.7 8.6-7.8c.4-.3-.1-.5-.6-.2L6.6 13 2 11.6c-1-.3-1-1 .2-1.5l18-6.9c.8-.3 1.6.2 1.3 1.1z" />, run: () => open('https://t.me/share/url?url=' + enc(url) + '&text=' + enc(content.text), 'Telegram') },
        {
            key: 'more', label: 'Diğer uygulamalar', color: c.muted, icon: <Icon name="share" color="#fff" size={22} />,
            run: () => { onClose(); afterModal(async () => { try { await Share.share(Platform.OS === 'ios' ? { message: content.text, url } : { message, title: content.title }, { dialogTitle: t('Paylaş'), subject: content.title }); } catch { /* vazgeçildi */ } }); }
        }
    ];
    return (
        <Sheet visible={visible} onClose={onClose} title="Paylaş">
            <View style={{ padding: 12, borderRadius: 12, backgroundColor: c.bg, gap: 2 }}>
                <Text style={{ color: c.ink, fontWeight: '800' }} numberOfLines={2}>{content.title}</Text>
                <Text style={{ color: c.muted, fontSize: 12.5 }} numberOfLines={1}>{url}</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 }}>
                {targets.map(x => (
                    <Pressable key={x.key} onPress={x.run} accessibilityRole="button" accessibilityLabel={t(x.label)} style={{ width: '20%', minWidth: 62, alignItems: 'center', gap: 6 }}>
                        <View style={{ width: 54, height: 54, borderRadius: 16, backgroundColor: x.color, alignItems: 'center', justifyContent: 'center' }}>{x.icon}</View>
                        <Text style={{ color: c.ink, fontSize: 11.5, fontWeight: '600', textAlign: 'center' }} numberOfLines={2}>{t(x.label)}</Text>
                    </Pressable>
                ))}
            </View>
        </Sheet>
    );
}

function Brand({ d }: { d: string }) {
    return <Svg width={28} height={28} viewBox="0 0 24 24"><Path d={d} fill="#fff" /></Svg>;
}
