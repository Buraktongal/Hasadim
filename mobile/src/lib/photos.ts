import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export interface PickedPhoto { uri: string; width: number; height: number }

export type PickResult = { photos: PickedPhoto[] } | { denied: 'camera'; canAskAgain: boolean } | { error: string };

// Fotoğraf seçimi ve hazırlığı.
// - Galeri: sistemin fotoğraf seçicisi kullanılır; bu seçici galeri izni istemez. Uygulama yalnızca
//   kullanıcının seçtiği fotoğrafları görür, galerinin geri kalanına erişmez.
// - Kamera: kamera izni yalnızca "Kamera"ya dokununca istenir. Reddedilmişse kullanıcıya Ayarlar
//   yolu gösterilir.
// Her fotoğraf yeniden kodlanır (JPEG, en fazla 1600 px): EXIF bilgileri (GPS konumu, cihaz, tarih)
// dosyadan tamamen silinir ve dosya küçülür (sunucu sınırı 5 MB).
export async function pickPhotos(source: 'camera' | 'library', limit: number): Promise<PickResult> {
    if (source === 'camera') {
        const current = await ImagePicker.getCameraPermissionsAsync();
        const perm = current.granted ? current : await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return { denied: 'camera', canAskAgain: perm.canAskAgain };
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, exif: false, allowsMultipleSelection: source === 'library' && limit > 1, selectionLimit: Math.max(1, limit), orderedSelection: true };
    const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled) return { photos: [] };
    const out: PickedPhoto[] = [];
    for (const asset of result.assets.slice(0, limit)) out.push(await clean(asset.uri, asset.width, asset.height));
    return { photos: out };
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
