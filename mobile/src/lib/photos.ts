import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export interface PickedPhoto { uri: string; width: number; height: number }

// Fotoğraf seçimi ve hazırlığı. Seçilen her fotoğraf yeniden kodlanır (JPEG, en fazla 1600 px):
// - EXIF bilgileri (GPS konumu, cihaz, tarih) dosyadan tamamen silinir; konum gizliliği korunur.
// - Dosya küçülür (sunucu sınırı 5 MB), yükleme hızlanır.
export async function pickPhotos(source: 'camera' | 'library', limit: number): Promise<PickedPhoto[] | string> {
    const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return source === 'camera' ? 'Kamera izni verilmedi. Ayarlardan izin verebilirsin.' : 'Galeri izni verilmedi. Ayarlardan izin verebilirsin.';
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, exif: false, allowsMultipleSelection: source === 'library' && limit > 1, selectionLimit: Math.max(1, limit) };
    const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled) return [];
    const out: PickedPhoto[] = [];
    for (const asset of result.assets.slice(0, limit)) out.push(await clean(asset.uri, asset.width, asset.height));
    return out;
}

export async function clean(uri: string, width: number, height: number): Promise<PickedPhoto> {
    const max = 1600;
    const context = ImageManipulator.manipulate(uri);
    if (Math.max(width, height) > max) context.resize(width >= height ? { width: max } : { height: max });
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.82 });
    return { uri: saved.uri, width: saved.width, height: saved.height };
}

// FormData'ya dosya ekleme (React Native biçimi).
export function appendPhoto(form: FormData, field: string, photo: PickedPhoto, index: number) {
    form.append(field, { uri: photo.uri, name: `foto-${index + 1}.jpg`, type: 'image/jpeg' } as unknown as Blob);
}
