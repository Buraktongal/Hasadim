/// <reference types="node" />
// Saf mantık testleri: node --import tsx --test tests/
import assert from 'node:assert/strict';
import test from 'node:test';
import { parseQrLogin } from '../src/lib/qr-login';
import { createHash } from 'node:crypto';
import { humanPurpose, leadingZeroBits, normalizeAnswer, sha256, solve } from '../src/lib/human';
import { conversations } from '../src/lib/conversations';
import { activeFilterCount, parseQs, qs } from '../src/lib/filters';
import { discount, money, number, priceText, qtyText, unitPriceText } from '../src/lib/format';
import { translate } from '../src/i18n/translate';
import { checkBaseUrl } from '../src/lib/url-policy';
import type { Message } from '../src/lib/types';

test('sayı ve para biçimi (tr)', () => {
    assert.equal(number(48000), '48.000');
    assert.equal(number(1234.5), '1.234,5');
    assert.equal(money(17.8), '₺17,80');
    assert.equal(money(4480000, 0), '₺4.480.000');
    assert.equal(money(-5), '-₺5,00');
});

test('ilan fiyat ve miktar metinleri', () => {
    const fruit = { kategori: 'Meyve', birim: 'kg', kilogramFiyati: 17.8, miktarKg: 48000, islemTipi: null, oncekiKilogramFiyati: 20 };
    assert.equal(priceText(fruit), '₺17,80 / kg');
    assert.equal(qtyText(fruit), '48.000 kg');
    assert.equal(discount(fruit), 11);
    const land = { kategori: 'Arazi', birim: 'm2', kilogramFiyati: 4480000, miktarKg: 44000, islemTipi: 'Satilik' };
    assert.equal(priceText(land), '₺4.480.000');
    assert.equal(qtyText(land), '44.000 m² · 44 dönüm');
    assert.equal(unitPriceText(land), '₺101,82 / m²');
    const rent = { ...land, islemTipi: 'Kiralik', kilogramFiyati: 120000 };
    assert.equal(priceText(rent), '₺120.000 / yıl');
    assert.equal(unitPriceText(rent), '₺2.727 / dönüm · yıllık');
    assert.equal(discount({ kilogramFiyati: 25, oncekiKilogramFiyati: 20 }), null, 'fiyat artışı indirim sayılmaz');
});

test('filtre sorgusu: yalnızca bilinen anahtarlar, Türkçe karakterler korunur', () => {
    const q = qs({ kategori: 'Tahil', meyveTuru: 'Buğday', il: 'İzmir', page: 1, bos: '' });
    assert.equal(q, 'kategori=Tahil&meyveTuru=Bu%C4%9Fday&il=%C4%B0zmir&page=1');
    const f = parseQs(q + '&kotu=<script>&q=elma+armut');
    assert.deepEqual(f, { kategori: 'Tahil', meyveTuru: 'Buğday', il: 'İzmir', q: 'elma armut' });
    assert.equal(activeFilterCount(f), 3);
    assert.deepEqual(parseQs('%E0%A4%A=1'), {}, 'bozuk kodlama yok sayılır');
});

test('sunucu adresi kuralı: yayında yalnızca https', () => {
    assert.equal(checkBaseUrl('https://hasadim.com.tr', false), null);
    assert.match(checkBaseUrl('http://hasadim.com.tr', false)!, /https/);
    assert.match(checkBaseUrl('http://192.168.1.20:5106', false)!, /https/, 'yayın sürümünde yerel http de yasak');
    assert.equal(checkBaseUrl('http://192.168.1.20:5106', true), null, 'geliştirmede yerel ağ http olabilir');
    assert.match(checkBaseUrl('http://8.8.8.8', true)!, /https/, 'geliştirmede bile genel adres http olamaz');
    assert.ok(checkBaseUrl('https://user:pw@hasadim.com.tr', false));
    assert.ok(checkBaseUrl('https://hasadim.com.tr/api', false));
    assert.ok(checkBaseUrl('javascript:alert(1)', true));
});

test('mesajlar konuşmalara ayrılır', () => {
    const me = 'a', other = 'b';
    const m = (id: string, from: string, to: string, at: string, read = true): Message => ({ id, listingId: 'L', listingTitle: 'Elma', senderId: from, recipientId: to, senderName: from, recipientName: to, body: id, createdAt: at, readAt: read ? at : null });
    const list = conversations([m('1', other, me, '2026-11-01'), m('2', me, other, '2026-11-02'), m('3', other, me, '2026-11-03', false)], me);
    assert.equal(list.length, 1);
    assert.equal(list[0]!.unread, 1);
    assert.equal(list[0]!.last.id, '3');
    assert.equal(list[0]!.otherId, other);
});

test('İngilizce çeviri: sözlük ve kalıplar', () => {
    assert.equal(translate('Giriş yap', 'en'), 'Sign in');
    assert.equal(translate('60 ilan bulundu', 'en'), '60 listings found');
    assert.equal(translate('Giriş yap', 'tr'), 'Giriş yap');
    assert.equal(translate('₺120.000 / yıl', 'en'), '₺120.000 / year');
    assert.equal(translate('₺81,80 / kg', 'en'), '₺81,80 / kg', 'kalıp işlevi null dönerse metin bozulmaz');
    assert.equal(translate('Bilinmeyen kullanıcı metni', 'en'), 'Bilinmeyen kullanıcı metni');
});

// ---------- Robot doğrulaması ----------

test('sha256 Node ile aynı sonucu verir', () => {
    for (const s of ['', 'abc', 'a'.repeat(55), 'a'.repeat(56), 'a'.repeat(64), '0123456789abcdef:98765']) {
        const ours = sha256(s).map(x => x.toString(16).padStart(8, '0')).join('');
        assert.equal(ours, createHash('sha256').update(s).digest('hex'));
    }
});

test('iş kanıtı istenen sayıda sıfır bitle çözülür', async () => {
    const salt = '9f86d081884c7d659a2feaa0c55ad015';
    const nonce = await solve(salt, 12);
    assert.ok(leadingZeroBits(sha256(salt + ':' + nonce)) >= 12);
});

test('korunan istekler ve kod biçimi', () => {
    assert.equal(humanPurpose('POST', '/api/mobile/auth/login'), 'login');
    assert.equal(humanPurpose('POST', '/api/meyve-ilanlari/with-photos'), 'listing');
    assert.equal(humanPurpose('POST', '/api/feedback'), 'feedback');
    assert.equal(humanPurpose('GET', '/api/feedback'), null);
    assert.equal(humanPurpose('POST', '/api/account/register/confirm'), null);
    assert.equal(normalizeAnswer(' k3 rna '), 'K3RNA');
    assert.equal(normalizeAnswer('ii'), 'II');
});

// ---------- QR ile web girişi ----------

test('yalnızca Hasadım giriş QR biçimi kabul edilir', () => {
    const code = 'oBMT_oS0vYGOB-TQANNB_3_IfI04S59fam1SVmVtf1I';
    assert.equal(parseQrLogin(`https://hasadim.com/html/qr.html#c=${code}`), code);
    assert.equal(parseQrLogin(`http://localhost:8811/html/qr.html#c=${code}`), code);
    assert.equal(parseQrLogin(`https://hasadim.com/html/qr.html#c=${code}x`), null);
    assert.equal(parseQrLogin('https://ornek.com/'), null);
    assert.equal(parseQrLogin(`javascript:alert(1)//html/qr.html#c=${code}`), null);
});
