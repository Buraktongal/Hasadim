'use strict';

const fruitVarieties = {
    'Elma': ['Starking Delicious', 'Golden Delicious', 'Granny Smith', 'Gala', 'Fuji', 'Pink Lady', 'Amasya', 'Scarlet Spur', 'Red Chief', 'Jonagold', 'Braeburn', 'Arapkızı', 'Fuji Kiku'],
    'Armut': ['Deveci', 'Santa Maria', 'Ankara', 'Williams', 'Abate Fetel', 'Akça', 'Coscia', 'Kieffer', 'Conference', 'Packham’s Triumph'],
    'Ayva': ['Ekmek', 'Eşme', 'Limon', 'Şeker', 'Kalecik'],
    'Portakal': ['Washington Navel', 'Valencia', 'Yafa', 'Navelina', 'Moro (Kan portakalı)', 'Lane Late', 'Fukumoto'],
    'Mandalina': ['Satsuma', 'Clementine', 'Nova', 'Fremont', 'W. Murcott', 'Okitsu', 'Ortanique', 'Robinson'],
    'Limon': ['Interdonato', 'Lamas', 'Kütdiken', 'Meyer', 'Enterdonat', 'Yediveren'],
    'Greyfurt': ['Star Ruby', 'Rio Red', 'Marsh Seedless', 'Redblush'],
    'Üzüm': ['Sultani Çekirdeksiz', 'Alphonse Lavallée', 'Red Globe', 'Italia', 'Crimson Seedless', 'Razakı', 'Hönüsü', 'Trakya İlkeren', 'Yalova İncisi', 'Müşküle', 'Superior Seedless'],
    'Kiraz': ['0900 Ziraat', 'Regina', 'Kordia', 'Bing', 'Early Burlat', 'Lambert', 'Sweetheart', 'Napolyon'],
    'Vişne': ['Kütahya', 'Montmorency', 'Erdi Botermo', 'Meteor'],
    'Şeftali': ['Redhaven', 'Cresthaven', 'J.H. Hale', 'Springcrest', 'Dixired', 'Glohaven', 'Monroe', 'Elegant Lady'],
    'Nektarin': ['Fantasia', 'Venus', 'Big Top', 'Stark Red Gold', 'Caldesi'],
    'Kayısı': ['Hacıhaliloğlu', 'Kabaaşı', 'Hasanbey', 'Şekerpare', 'Iğdır', 'Çataloğlu', 'Soğancı', 'Alyanak'],
    'Erik': ['Papaz', 'Can', 'Black Diamond', 'Angeleno', 'Santa Rosa', 'Stanley', 'Anna Späth', 'Black Amber', 'Fortune'],
    'Nar': ['Hicaznar', 'Wonderful', 'Silifke Aşısı', 'Katırbaşı', 'Ernar', 'Lefan'],
    'Çilek': ['Albion', 'San Andreas', 'Camarosa', 'Festival', 'Sweet Charlie', 'Rubygem', 'Monterey', 'Fortuna'],
    'Ahududu': ['Heritage', 'Tulameen', 'Polka', 'Kiwigold', 'Rubin'],
    'Böğürtlen': ['Chester', 'Loch Ness', 'Navaho', 'Arapaho', 'Bursa 2'],
    'Yaban mersini': ['Bluecrop', 'Duke', 'Legacy', 'Brigitta', 'Jersey'],
    'Dut': ['Beyaz dut', 'Kara dut', 'Mor dut'],
    'Karpuz': ['Crimson Sweet', 'Charleston Gray', 'Sugar Baby', 'Starbrite', 'Diyarbakır karpuzu'],
    'Kavun': ['Kırkağaç', 'Hasanbey', 'Hıdır', 'Galia', 'Ananas', 'Topatan', 'Kırkağaç 637'],
    'Muz': ['Dwarf Cavendish', 'Grand Nain', 'Azman', 'Williams'],
    'İncir': ['Bursa Siyahı', 'Sarılop', 'Göklop', 'Siyah orak', 'Sarı Zeybek'],
    'Trabzon hurması': ['Fuyu', 'Hachiya', 'Rojo Brillante', 'Trabzon yerli'],
    'Avokado': ['Hass', 'Fuerte', 'Bacon', 'Zutano', 'Reed', 'Ettinger', 'Pinkerton'],
    'Kivi': ['Hayward', 'Bruno', 'Allison', 'Matua', 'Tomuri'],
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
        throw new Error('Ürün veya çeşit alanı bulunamadı.');
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
                new Option('Ürün seç', ''),
                fruitSelect.firstChild
            );
        }

        fruitSelect.value = '';
    }

    function populateVarieties(previousVariety = '') {
        const fruit = fruitSelect.value;

        varietySelect.replaceChildren(
            new Option(
                fruit ? 'Çeşit seç' : 'Önce ürün seç',
                ''
            )
        );

        // Arazi gibi çeşidi olmayan kategorilerde alan kilitli kalır.
        varietySelect.disabled = !fruit || varietySelect.dataset.locked === 'true';

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