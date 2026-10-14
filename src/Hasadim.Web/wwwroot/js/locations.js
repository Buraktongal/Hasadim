'use strict';

let locationDataPromise = null;

function getLocationData() {
    if (!locationDataPromise) {
        locationDataPromise = fetch('/data/iller-ilceler.json')
            .then(async response => {
                if (!response.ok) {
                    throw new Error('İl ve ilçe listesi yüklenemedi.');
                }

                const result = await response.json();

                if (!Array.isArray(result.data) || !result.data.length) {
                    throw new Error('İl ve ilçe dosyasının içeriği geçersiz.');
                }

                return result.data;
            })
            .catch(error => {
                // Sonraki denemede tekrar yüklenebilsin.
                locationDataPromise = null;
                throw error;
            });
    }

    return locationDataPromise;
}

function normalizeLocation(value) {
    return String(value || '').trim().toLocaleLowerCase('tr-TR');
}

window.setupLocationSelectors = async function (
    form,
    selectedCity = '',
    selectedDistrict = '',
    cityFieldName = 'il',
    districtFieldName = 'ilce'
) {
    const citySelect = form.elements.namedItem(cityFieldName);
    const districtSelect = form.elements.namedItem(districtFieldName);

    if (!citySelect || !districtSelect) {
        throw new Error('İl veya ilçe seçim alanı bulunamadı.');
    }

    citySelect.disabled = true;
    districtSelect.disabled = true;

    citySelect.replaceChildren(new Option('Yükleniyor…', ''));
    districtSelect.replaceChildren(new Option('Önce il seçin', ''));

    const provinces = await getLocationData();

    const sortedProvinces = [...provinces].sort((a, b) =>
        a.name.localeCompare(b.name, 'tr')
    );

    citySelect.replaceChildren(new Option('İl seçin', ''));

    for (const province of sortedProvinces) {
        citySelect.add(new Option(province.name, province.name));
    }

    function populateDistricts(savedDistrict = '') {
        const province = provinces.find(
            item => item.name === citySelect.value
        );

        districtSelect.replaceChildren(
            new Option(province ? 'İlçe seçin' : 'Önce il seçin', '')
        );

        districtSelect.disabled = !province;

        if (!province) return;

        const districts = [...province.districts].sort((a, b) =>
            a.name.localeCompare(b.name, 'tr')
        );

        for (const district of districts) {
            districtSelect.add(new Option(district.name, district.name));
        }

        const matchingDistrict = districts.find(
            item =>
                normalizeLocation(item.name) ===
                normalizeLocation(savedDistrict)
        );

        districtSelect.value = matchingDistrict?.name || '';
    }

    // İl değiştiğinde önceki ilçe seçimini koruma.
    citySelect.onchange = () => populateDistricts();

    const matchingCity = provinces.find(
        item =>
            normalizeLocation(item.name) ===
            normalizeLocation(selectedCity)
    );

    citySelect.value = matchingCity?.name || '';
    citySelect.disabled = false;

    populateDistricts(selectedDistrict);
};