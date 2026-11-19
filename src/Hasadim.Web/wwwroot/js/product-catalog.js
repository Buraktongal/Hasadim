'use strict';

// Ürün kataloğu: ana kategoriler, ürünler, çeşitler, birimler ve hasat takvimi.
// fruit-varieties.js'ten sonra yüklenir; meyve çeşitleri oradan gelir.
// Sunucu kategori kimliklerini (Meyve, Tahil, Yem, Bal, Kuruyemis, Arazi) saklar.
window.HasadimCatalog = (() => {
    const fruits = typeof fruitVarieties !== 'undefined' ? fruitVarieties : {};

    const extra = {
        Tahil: {
            'Buğday': ['Bezostaya 1', 'Tosunbey', 'Esperia', 'Kunduru 1149 (makarnalık)', 'Ceyhan 99', 'Pehlivan', 'Sönmez 2001', 'Altay 2000', 'Karakılçık (yerli)'],
            'Arpa': ['Larende', 'Bülbül 89', 'Tarm-92', 'Konevi 98', 'Zeynel Ağa', 'Yemlik arpa', 'Biralık arpa'],
            'Yulaf': ['Seydişehir', 'Faikbey', 'Checota', 'Kahraman', 'Yemlik yulaf'],
            'Mısır': ['Dane mısır', 'Silajlık mısır', 'Cin mısırı', 'Atdişi mısır'],
            'Çavdar': ['Aslım 95', 'Yerli çavdar'],
            'Tritikale': ['Tatlıcak 97', 'Karma 2000'],
            'Çeltik (pirinç)': ['Osmancık 97', 'Baldo', 'Halilbey', 'Kızıltan'],
            'Diğer tahıl': []
        },
        Yem: {
            'Yonca balyası': ['1. biçim', '2. biçim', '3. biçim', 'Kuru yonca (dökme)'],
            'Saman balyası': ['Buğday samanı', 'Arpa samanı', 'Yulaf samanı', 'Büyük paket saman'],
            'Fiğ balyası': ['Macar fiği', 'Adi fiğ', 'Fiğ-arpa karışımı'],
            'Yulaf otu balyası': ['Yeşil biçim', 'Olgun biçim'],
            'Mısır silajı': ['Paket silaj', 'Dökme silaj'],
            'Korunga': ['Korunga balyası', 'Kuru korunga'],
            'Diğer yem': []
        },
        Bal: {
            'Bal': ['Çiçek balı', 'Çam balı', 'Kestane balı', 'Ayçiçeği balı', 'Kekik balı', 'Geven balı', 'Narenciye balı', 'Akasya balı', 'Karakovan balı', 'Petek bal'],
            'Polen': ['Taze polen', 'Kurutulmuş polen'],
            'Propolis': ['Ham propolis', 'Propolis ekstraktı'],
            'Arı sütü': ['Taze arı sütü'],
            'Balmumu': ['Ham balmumu', 'Temel petek'],
            'Diğer arı ürünü': []
        },
        Kuruyemis: {
            'Ceviz': ['Chandler', 'Fernor', 'Franquette', 'Şebin', 'Kaman', 'Bilecik', 'Yerli ceviz', 'Ceviz içi'],
            'Fındık': ['Tombul', 'Palaz', 'Sivri', 'Kara fındık', 'Foşa', 'Fındık içi'],
            'Antep fıstığı': ['Kırmızı (Antep)', 'Uzun', 'Siirt', 'Halebi', 'Boz iç', 'Yeşil iç'],
            'Badem': ['Ferragnes', 'Nonpareil', 'Texas', 'Ferraduel', 'Yerli badem', 'Badem içi'],
            'Kestane': ['Marron', 'Yerli kestane', 'Aydın kestanesi'],
            'Yer fıstığı': ['Osmaniye', 'Halisbey', 'NC-7', 'Com'],
            'Kuru kayısı': ['Gün kurusu', 'Kükürtlü (sarı)', 'Jumbo boy'],
            'Kuru incir': ['Sarılop (Aydın)', 'Lerida', 'Garland'],
            'Kuru üzüm': ['Sultani çekirdeksiz', 'Siyah kuru üzüm', 'Gün kurusu'],
            'Diğer kuruyemiş': []
        },
        Arazi: {
            'Tarla': [], 'Meyve bahçesi': [], 'Bağ': [], 'Zeytinlik': [], 'Fındık bahçesi': [],
            'Sera': [], 'Çayır / mera': [], 'Hobi bahçesi': [], 'Diğer arazi': []
        }
    };

    // Çeşit seçicileri (fruit-varieties.js, market-catalog.js) tek sözlüğü kullanır.
    for (const group of Object.values(extra)) Object.assign(fruits, group);

    const categories = [
        { id: 'Meyve', name: 'Meyve', short: 'Meyve', icon: 'Elma', units: ['kg'], products: Object.keys(fruits).filter(name => !Object.values(extra).some(g => name in g)) },
        { id: 'Tahil', name: 'Tahıl', short: 'Tahıl', icon: 'Buğday', units: ['kg'], products: Object.keys(extra.Tahil) },
        { id: 'Yem', name: 'Yem ve balya', short: 'Yem / balya', icon: 'Yonca balyası', units: ['balya', 'kg'], products: Object.keys(extra.Yem) },
        { id: 'Bal', name: 'Bal ve arı ürünleri', short: 'Bal', icon: 'Bal', units: ['kg'], products: Object.keys(extra.Bal) },
        { id: 'Kuruyemis', name: 'Kuruyemiş', short: 'Kuruyemiş', icon: 'Ceviz', units: ['kg'], products: Object.keys(extra.Kuruyemis) },
        { id: 'Arazi', name: 'Satılık / kiralık arazi', short: 'Arazi', icon: 'Tarla', units: ['m2'], products: Object.keys(extra.Arazi), land: true }
    ];
    const byId = new Map(categories.map(c => [c.id, c]));
    const productCategory = new Map();
    for (const c of categories) for (const p of c.products) productCategory.set(p, c.id);

    const unitLabels = { kg: 'kg', balya: 'balya', m2: 'm²' };

    // Hasat / üretim takvimi (Türkiye geneli, yaklaşık). season: ürünün piyasada
    // bulunduğu aylar; peak: yoğun hasat ayları. Ay numaraları 1–12.
    const seasons = {
        'Elma': [[8, 9, 10, 11], [9, 10]], 'Armut': [[7, 8, 9, 10], [8, 9]], 'Ayva': [[9, 10, 11], [10]],
        'Portakal': [[11, 12, 1, 2, 3, 4], [12, 1, 2]], 'Mandalina': [[10, 11, 12, 1, 2], [11, 12]],
        'Limon': [[9, 10, 11, 12, 1, 2, 3, 4, 5], [11, 12, 1, 2]], 'Greyfurt': [[11, 12, 1, 2, 3, 4], [12, 1, 2]],
        'Üzüm': [[7, 8, 9, 10], [8, 9]], 'Kiraz': [[5, 6, 7], [6]], 'Vişne': [[6, 7], [6, 7]],
        'Şeftali': [[6, 7, 8, 9], [7, 8]], 'Nektarin': [[6, 7, 8, 9], [7, 8]], 'Kayısı': [[5, 6, 7], [6, 7]],
        'Erik': [[4, 5, 6, 7, 8, 9], [6, 7, 8]], 'Nar': [[9, 10, 11, 12], [10, 11]], 'Çilek': [[3, 4, 5, 6, 7], [4, 5, 6]],
        'Ahududu': [[6, 7, 8, 9, 10], [7, 8]], 'Böğürtlen': [[7, 8, 9], [8]], 'Yaban mersini': [[6, 7, 8], [7]],
        'Dut': [[6, 7], [6, 7]], 'Karpuz': [[6, 7, 8, 9], [7, 8]], 'Kavun': [[6, 7, 8, 9], [7, 8]],
        'Muz': [[9, 10, 11, 12, 1, 2, 3, 4, 5], [11, 12, 1]], 'İncir': [[7, 8, 9], [8]],
        'Trabzon hurması': [[10, 11, 12], [11]], 'Avokado': [[11, 12, 1, 2, 3, 4], [12, 1, 2]], 'Kivi': [[10, 11, 12], [11]],
        'Buğday': [[5, 6, 7, 8], [6, 7]], 'Arpa': [[5, 6, 7], [6]], 'Yulaf': [[6, 7, 8], [7]], 'Mısır': [[8, 9, 10, 11], [9, 10]],
        'Çavdar': [[6, 7, 8], [7]], 'Tritikale': [[6, 7], [6, 7]], 'Çeltik (pirinç)': [[9, 10], [9, 10]],
        'Yonca balyası': [[5, 6, 7, 8, 9], [6, 7]], 'Saman balyası': [[6, 7, 8], [7]], 'Fiğ balyası': [[5, 6], [5, 6]],
        'Yulaf otu balyası': [[5, 6], [5, 6]], 'Mısır silajı': [[8, 9, 10], [8, 9]], 'Korunga': [[5, 6, 7], [6]],
        'Bal': [[6, 7, 8, 9, 10, 11], [7, 8]], 'Polen': [[4, 5, 6, 7], [5, 6]], 'Propolis': [[8, 9, 10], [9]],
        'Arı sütü': [[4, 5, 6], [5]], 'Balmumu': [[7, 8, 9, 10], [8, 9]],
        'Ceviz': [[9, 10], [9, 10]], 'Fındık': [[8, 9], [8]], 'Antep fıstığı': [[8, 9], [8, 9]], 'Badem': [[7, 8, 9], [8]],
        'Kestane': [[10, 11], [10]], 'Yer fıstığı': [[9, 10], [9]], 'Kuru kayısı': [[7, 8, 9], [8]],
        'Kuru incir': [[8, 9, 10], [9]], 'Kuru üzüm': [[9, 10], [9]]
    };
    // Bal türleri için ayrı satırlar (çeşit bazında takvim).
    const varietySeasons = {
        'Bal': { 'Çiçek balı': [[6, 7, 8], [7]], 'Çam balı': [[9, 10, 11], [10]], 'Kestane balı': [[7, 8], [7]], 'Narenciye balı': [[4, 5], [4]], 'Kekik balı': [[6, 7], [6]] }
    };

    const categoryOf = product => productCategory.get(product) || 'Meyve';
    const category = id => byId.get(id) || byId.get('Meyve');
    const unitLabel = unit => unitLabels[unit] || 'kg';
    const isLand = x => (x?.kategori || x) === 'Arazi';

    return {
        categories, category, categoryOf, unitLabel, isLand, seasons, varietySeasons,
        varieties: product => fruits[product] || [],
        products: id => category(id).products
    };
})();
