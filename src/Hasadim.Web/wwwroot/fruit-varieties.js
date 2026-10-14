'use strict';

const fruitVarieties = {
    'Elma': [
        'Starking Delicious',
        'Golden Delicious',
        'Granny Smith',
        'Gala',
        'Fuji',
        'Pink Lady',
        'Amasya'
    ],
    'Armut': [
        'Deveci',
        'Santa Maria',
        'Ankara',
        'Williams',
        'Abate Fetel',
        'Akça'
    ],
    'Portakal': [
        'Washington Navel',
        'Valencia',
        'Yafa',
        'Navelina'
    ],
    'Mandalina': [
        'Satsuma',
        'Clementine',
        'Nova',
        'Fremont',
        'W. Murcott'
    ],
    'Limon': [
        'Interdonato',
        'Lamas',
        'Kütdiken',
        'Meyer'
    ],
    'Üzüm': [
        'Sultani Çekirdeksiz',
        'Alphonse Lavallée',
        'Red Globe',
        'Italia',
        'Crimson Seedless',
        'Razakı'
    ],
    'Kiraz': [
        '0900 Ziraat',
        'Regina',
        'Kordia',
        'Bing',
        'Early Burlat'
    ],
    'Vişne': [
        'Kütahya',
        'Montmorency'
    ],
    'Şeftali': [
        'Redhaven',
        'Cresthaven',
        'J.H. Hale',
        'Springcrest',
        'Dixired'
    ],
    'Kayısı': [
        'Hacıhaliloğlu',
        'Kabaaşı',
        'Hasanbey',
        'Şekerpare',
        'Iğdır'
    ],
    'Erik': [
        'Papaz',
        'Can',
        'Black Diamond',
        'Angeleno',
        'Santa Rosa',
        'Stanley'
    ],
    'Nar': [
        'Hicaznar',
        'Wonderful',
        'Silifke Aşısı'
    ],
    'Çilek': [
        'Albion',
        'San Andreas',
        'Camarosa',
        'Festival',
        'Sweet Charlie'
    ],
    'Karpuz': [
        'Crimson Sweet',
        'Charleston Gray',
        'Sugar Baby'
    ],
    'Kavun': [
        'Kırkağaç',
        'Hasanbey',
        'Hıdır',
        'Galia'
    ],
    'Muz': [
        'Dwarf Cavendish',
        'Grand Nain',
        'Azman'
    ],
    'İncir': [
        'Bursa Siyahı',
        'Sarılop',
        'Göklop'
    ],
    'Avokado': [
        'Hass',
        'Fuerte',
        'Bacon',
        'Zutano',
        'Reed',
        'Ettinger'
    ],
    'Kivi': [
        'Hayward',
        'Bruno',
        'Allison'
    ],
    'Diğer': []
};

window.setupFruitVarietySelectors = function (
    form,
    savedFruit = '',
    savedVariety = ''
) {
    const fruitSelect = form.elements.namedItem('meyveTuru');
    const varietySelect = form.elements.namedItem('cesit');

    if (!fruitSelect || !varietySelect) {
        throw new Error('Meyve türü veya çeşit alanı bulunamadı.');
    }

    const normalize = value =>
        String(value || '').trim().toLocaleLowerCase('tr-TR');

    // Düzenlenen eski ilanda farklı bir meyve adı varsa koru.
    if (savedFruit) {
        const existingFruit = Array.from(fruitSelect.options).find(
            option => normalize(option.value) === normalize(savedFruit)
        );

        if (existingFruit) {
            fruitSelect.value = existingFruit.value;
        } else {
            fruitSelect.add(new Option(savedFruit, savedFruit));
            fruitSelect.value = savedFruit;
        }
    } else {
        // Yeni ilanda kullanıcı önce meyve seçsin.
        if (!Array.from(fruitSelect.options).some(option => option.value === '')) {
            fruitSelect.insertBefore(
                new Option('Meyve türü seçin', ''),
                fruitSelect.firstChild
            );
        }

        fruitSelect.value = '';
    }

    function populateVarieties(previousVariety = '') {
        const fruit = fruitSelect.value;

        varietySelect.replaceChildren(
            new Option(
                fruit ? 'Çeşit seçin' : 'Önce meyve türü seçin',
                ''
            )
        );

        varietySelect.disabled = !fruit;

        if (!fruit) return;

        const varieties = [
            ...(fruitVarieties[fruit] || []),
            'Diğer / Belirtilmemiş'
        ];

        for (const variety of varieties) {
            varietySelect.add(new Option(variety, variety));
        }

        if (previousVariety) {
            const matchingVariety = varieties.find(
                variety =>
                    normalize(variety) === normalize(previousVariety)
            );

            if (matchingVariety) {
                varietySelect.value = matchingVariety;
            } else {
                // Eski ilanlarda elle yazılmış çeşit bilgisini kaybetme.
                varietySelect.add(
                    new Option(previousVariety, previousVariety)
                );

                varietySelect.value = previousVariety;
            }
        }
    }

    // Yeni meyve seçildiğinde eski çeşit temizlenir.
    fruitSelect.onchange = () => populateVarieties();

    populateVarieties(savedVariety);
};