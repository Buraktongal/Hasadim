import data from '../data/catalog.json';
import cityData from '../data/cities.json';

export interface Category { id: string; name: string; short: string; icon: string; units: string[]; products: string[]; land?: boolean }

export const categories = data.categories as Category[];
const byId = new Map(categories.map(c => [c.id, c]));
const productCategory = new Map<string, string>();
for (const c of categories) for (const p of c.products) productCategory.set(p, c.id);

export const category = (id?: string | null) => byId.get(id ?? '') ?? byId.get('Meyve')!;
export const categoryOf = (product: string) => productCategory.get(product) ?? 'Meyve';
export const varieties = (product: string): string[] => (data.varieties as Record<string, string[]>)[product] ?? [];
export const seasons = data.seasons as unknown as Record<string, [number[], number[]]>;
export const varietySeasons = data.varietySeasons as unknown as Record<string, Record<string, [number[], number[]]>>;

export const cities = (cityData as [string, string[]][]).map(([name]) => name);
const districtMap = new Map(cityData as [string, string[]][]);
export const districts = (city: string) => districtMap.get(city) ?? [];

export const PACKAGING = ['Kasa', 'Koli', 'Dökme', 'Çuval', 'Big bag', 'Balya', 'Kavanoz', 'Teneke', 'Diğer'];
export const DELIVERY = ['Yerinden teslim', 'Satıcı teslimatı', 'Görüşülür'];
export const ZONING = ['İmarsız (tarım arazisi)', 'Konut imarlı', 'Ticari imarlı', 'Sanayi imarlı', 'Turizm imarlı', 'Belirtilmedi'];
export const DEED = ['Müstakil tapu', 'Hisseli tapu', 'Tahsisli', 'Zilliyet'];
export const IRRIGATION = ['Sulu', 'Kısmen sulu', 'Kuru (yağışa bağlı)'];
export const SORTS: [string, string][] = [['new', 'En yeni ilanlar'], ['priceAsc', 'Fiyat: düşükten yükseğe'], ['priceDesc', 'Fiyat: yüksekten düşüğe'], ['qtyDesc', 'Miktar: çoktan aza'], ['qtyAsc', 'Miktar: azdan çoğa']];
export const ACTIVITY: Record<string, string> = { Producer: 'Üretici', Buyer: 'Alıcı', Trader: 'Tüccar', Cooperative: 'Kooperatif', Other: 'Diğer' };
