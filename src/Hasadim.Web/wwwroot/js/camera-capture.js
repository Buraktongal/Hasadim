'use strict';

// İlan fotoğrafını canlı kamerayla çekme.
// - Telefonda: tarayıcının kendi kamera ekranı açılır (input capture).
// - Bilgisayarda: kamera görüntüsü pencerede canlı gösterilir, "Çek" ile kare alınır.
// Çekilen fotoğraf en fazla 1600 px JPEG'e çevrilir; böylece dosya küçülür ve fotoğraftaki
// konum (GPS) ve cihaz bilgileri yüklenmeden silinir. Sonuç, mevcut fotoğraf seçimine eklenir.
window.HasadimCamera = (() => {
    const MAX = 1600;
    const coarse = () => window.matchMedia?.('(pointer: coarse)').matches;
    let dialog = null, stream = null, facing = 'environment';

    const message = (form, text) => { const box = form?.querySelector('.form-error'); if (box) box.textContent = text; };

    // Bir görüntü kaynağını (video veya resim) küçültüp JPEG dosyasına çevirir.
    function toFile(source, width, height) {
        const scale = Math.min(1, MAX / Math.max(width, height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
        return new Promise((resolve, reject) => canvas.toBlob(blob => {
            if (!blob) { reject(new Error('Fotoğraf hazırlanamadı.')); return; }
            const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
            resolve(new File([blob], 'kamera-' + stamp + '.jpg', { type: 'image/jpeg', lastModified: Date.now() }));
        }, 'image/jpeg', 0.85));
    }

    // Telefon kamerasından gelen dosyayı da aynı şekilde yeniden kodla (EXIF/GPS silinir).
    async function normalize(file) {
        const url = URL.createObjectURL(file);
        try {
            const image = new Image();
            image.src = url;
            await image.decode();
            return await toFile(image, image.naturalWidth, image.naturalHeight);
        } finally { URL.revokeObjectURL(url); }
    }

    // Dosyayı ilan formunun fotoğraf alanına ekler (app.js mevcut seçime birleştirir).
    function addToForm(input, file) {
        const transfer = new DataTransfer();
        transfer.items.add(file);
        input.files = transfer.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function nativeCapture(input) {
        const picker = document.createElement('input');
        picker.type = 'file';
        picker.accept = 'image/*';
        picker.setAttribute('capture', 'environment');
        picker.addEventListener('change', async () => {
            const file = picker.files?.[0];
            if (!file) return;
            try { addToForm(input, await normalize(file)); }
            catch { message(input.form, 'Fotoğraf hazırlanamadı. Tekrar dene.'); }
        });
        picker.click();
    }

    function stop() {
        stream?.getTracks().forEach(track => track.stop());
        stream = null;
    }

    function cameraError(error) {
        if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError')
            return 'Kamera izni verilmedi. Adres çubuğundaki kamera simgesinden izin verip tekrar dene.';
        if (error?.name === 'NotFoundError' || error?.name === 'OverconstrainedError') return 'Bu cihazda kamera bulunamadı. Galeriden fotoğraf seçebilirsin.';
        if (error?.name === 'NotReadableError') return 'Kamera başka bir uygulama tarafından kullanılıyor. Onu kapatıp tekrar dene.';
        return 'Kamera açılamadı. Galeriden fotoğraf seçebilirsin.';
    }

    function build() {
        dialog = document.createElement('dialog');
        dialog.className = 'camera-dialog';
        dialog.setAttribute('aria-label', 'Fotoğraf çek');
        dialog.innerHTML = `
            <div class="camera-head"><strong>Fotoğraf çek</strong><button type="button" class="close" data-camera="close" aria-label="Kapat">×</button></div>
            <div class="camera-stage"><video playsinline muted autoplay></video><img alt="Çekilen fotoğraf" hidden><p class="camera-status" role="status">Kamera açılıyor…</p></div>
            <div class="camera-actions">
                <button type="button" class="secondary" data-camera="switch" hidden>Kamerayı çevir</button>
                <button type="button" class="primary camera-shutter" data-camera="shoot" disabled><span aria-hidden="true"></span>Çek</button>
                <button type="button" class="secondary" data-camera="retake" hidden>Tekrar çek</button>
                <button type="button" class="primary" data-camera="use" hidden>Fotoğrafı ekle</button>
            </div>`;
        document.body.append(dialog);
        dialog.addEventListener('close', stop);
        return dialog;
    }

    async function start(video, status, shoot, switcher) {
        stop();
        shoot.disabled = true;
        status.hidden = false;
        status.textContent = 'Kamera açılıyor…';
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
            video.srcObject = stream;
            await video.play().catch(() => undefined);
            status.hidden = true;
            shoot.disabled = false;
            const cameras = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
            switcher.hidden = cameras.length < 2;
        } catch (error) {
            status.textContent = cameraError(error);
        }
    }

    async function open(input) {
        // Telefonda veya canlı kamera desteklenmiyorsa tarayıcının kamera ekranı kullanılır.
        if (coarse() || !navigator.mediaDevices?.getUserMedia || !window.isSecureContext) { nativeCapture(input); return; }
        const d = dialog || build();
        const video = d.querySelector('video'), image = d.querySelector('img'), status = d.querySelector('.camera-status');
        const btn = name => d.querySelector(`[data-camera="${name}"]`);
        let shot = null;
        const live = on => {
            video.hidden = !on; image.hidden = on;
            btn('shoot').hidden = !on; btn('retake').hidden = on; btn('use').hidden = on;
        };
        live(true);
        btn('close').onclick = () => d.close();
        btn('switch').onclick = () => { facing = facing === 'environment' ? 'user' : 'environment'; void start(video, status, btn('shoot'), btn('switch')); };
        btn('shoot').onclick = async () => {
            if (!video.videoWidth) return;
            const shoot = btn('shoot');
            shoot.disabled = true;
            video.pause();               // kare anında dondurulur; dosya hazırlanırken görüntü kaymaz
            status.hidden = false;
            status.textContent = 'Fotoğraf hazırlanıyor…';
            try {
                shot = await toFile(video, video.videoWidth, video.videoHeight);
                if (image.src) URL.revokeObjectURL(image.src);
                image.src = URL.createObjectURL(shot);
                status.hidden = true;
                live(false);
            } catch {
                status.textContent = 'Fotoğraf hazırlanamadı. Tekrar dene.';
                void video.play();
            } finally { shoot.disabled = false; }
        };
        btn('retake').onclick = () => { shot = null; live(true); void video.play(); };
        btn('use').onclick = () => { if (shot) addToForm(input, shot); d.close(); };
        d.showModal();
        await start(video, status, btn('shoot'), btn('switch'));
    }

    // Fotoğraf alanının yanına "Fotoğraf çek" düğmesi ekler.
    function attach(input) {
        if (!input || input.dataset.camera === 'on') return;
        input.dataset.camera = 'on';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'secondary camera-button';
        button.innerHTML = '<span aria-hidden="true">📷</span> Fotoğraf çek';
        button.addEventListener('click', () => { message(input.form, ''); void open(input); });
        const drop = input.closest('.photo-drop');
        const row = document.createElement('div');
        row.className = 'photo-sources';
        drop.before(row);
        row.append(drop, button);
    }

    document.querySelectorAll('#editorForm input[name="photo"]').forEach(attach);
    return { attach, open };
})();
