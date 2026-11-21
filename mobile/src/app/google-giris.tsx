import { Redirect } from 'expo-router';

// Google girişinden dönüş adresi (hasadim://google-giris). Dönüşü giriş ekranındaki tarayıcı oturumu karşılar;
// uygulama bu adresle ayrıca açılırsa yalnızca ana sayfaya yönlendirilir.
export default function GoogleReturn() {
    return <Redirect href="/" />;
}
