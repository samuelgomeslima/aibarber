import type { Product, Service } from "./domain";

export type LanguageCode = "en" | "pt";

const RAW_SERVICE_TRANSLATIONS: Record<string, Partial<Record<LanguageCode, string>>> = {
  cut: { pt: "Corte" },
  "classic cut": { pt: "Corte clássico" },
  "classic haircut": { pt: "Corte clássico" },
  fade: { pt: "Degradê" },
  color: { pt: "Coloração" },
  colors: { pt: "Coloração" },
  "hair color": { pt: "Coloração" },
  beard: { pt: "Barba" },
  shave: { pt: "Barba" },
  "beard shave": { pt: "Barba" },
  "cut shave": { pt: "Corte & Barba" },
  "cut and shave": { pt: "Corte & Barba" },
  trim: { pt: "Aparar" },
  "buzz cut": { pt: "Corte militar" },
  "cut style": { pt: "Corte e estilo" },
  "cut & style": { pt: "Corte e estilo" },
  "wash": { pt: "Lavagem" },
  "wash cut": { pt: "Lavar e cortar" },
  "wash & cut": { pt: "Lavar e cortar" },
  "kids": { pt: "Infantil" },
  "kids cut": { pt: "Corte infantil" },
  "kids haircut": { pt: "Corte infantil" },
  "shape up": { pt: "Acabamento" },
  "line up": { pt: "Acabamento" },
  "beard trim": { pt: "Aparar barba" },
  "hot towel shave": { pt: "Barba com toalha quente" },
  design: { pt: "Design" },
  treatment: { pt: "Tratamento" },
  "scalp treatment": { pt: "Tratamento do couro cabeludo" },
  "keratin treatment": { pt: "Tratamento de queratina" },
  highlights: { pt: "Luzes" },
  "full highlights": { pt: "Luzes completas" },
  balayage: { pt: "Balayage" },
  bleaching: { pt: "Descoloração" },
  perm: { pt: "Permanente" },
  relaxer: { pt: "Relaxamento" },
};

const SERVICE_TRANSLATIONS = new Map(
  Object.entries(RAW_SERVICE_TRANSLATIONS).map(([key, value]) => [normalizeKey(key), value]),
);

const RAW_PRODUCT_TRANSLATIONS: Record<string, Partial<Record<LanguageCode, string>>> = {
  shampoo: { pt: "Shampoo" },
  "hydrating shampoo": { pt: "Shampoo hidratante" },
  "moisturizing shampoo": { pt: "Shampoo hidratante" },
  conditioner: { pt: "Condicionador" },
  "leave in": { pt: "Leave-in" },
  "leave-in": { pt: "Leave-in" },
  "beard oil": { pt: "Óleo para barba" },
  "hair oil": { pt: "Óleo capilar" },
  "hair tonic": { pt: "Tônico capilar" },
  "scalp tonic": { pt: "Tônico para couro cabeludo" },
  "beard shampoo": { pt: "Shampoo para barba" },
  "beard wash": { pt: "Shampoo para barba" },
  "beard balm": { pt: "Balm para barba" },
  "after shave": { pt: "Loção pós-barba" },
  aftershave: { pt: "Loção pós-barba" },
  "shaving cream": { pt: "Creme de barbear" },
  "shaving foam": { pt: "Espuma de barbear" },
  "hair pomade": { pt: "Pomada capilar" },
  pomade: { pt: "Pomada" },
  "hair wax": { pt: "Cera modeladora" },
  "styling wax": { pt: "Cera modeladora" },
  "hair gel": { pt: "Gel para cabelo" },
  gel: { pt: "Gel" },
  "styling powder": { pt: "Pó modelador" },
  "sea salt spray": { pt: "Spray de sal marinho" },
  "texture spray": { pt: "Spray texturizador" },
  "grooming kit": { pt: "Kit de cuidados" },
  "beard kit": { pt: "Kit para barba" },
  "pre shave": { pt: "Pré-barba" },
  "pre-shave": { pt: "Pré-barba" },
};

const PRODUCT_TRANSLATIONS = new Map(
  Object.entries(RAW_PRODUCT_TRANSLATIONS).map(([key, value]) => [normalizeKey(key), value]),
);

function normalizeKey(value?: string | null): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function lookupServiceTranslation(
  service: Pick<Service, "id" | "name">,
  language: LanguageCode,
): string | null {
  if (language === "en") return service.name;

  const idTranslation = SERVICE_TRANSLATIONS.get(normalizeKey(service.id))?.[language];
  if (idTranslation) return idTranslation;

  const nameTranslation = SERVICE_TRANSLATIONS.get(normalizeKey(service.name))?.[language];
  if (nameTranslation) return nameTranslation;

  return null;
}

export function polyglotServiceName(
  service: Pick<Service, "id" | "name">,
  language: LanguageCode,
): string {
  return lookupServiceTranslation(service, language) ?? service.name;
}

export function polyglotServices(services: Service[], language: LanguageCode): Service[] {
  if (language === "en") return services;

  return services.map((svc) => {
    const localized = lookupServiceTranslation(svc, language);
    if (!localized || localized === svc.name) return svc;
    return { ...svc, name: localized };
  });
}

function lookupProductTranslation(
  product: Pick<Product, "id" | "name">,
  language: LanguageCode,
): string | null {
  if (language === "en") return product.name;

  const idTranslation = PRODUCT_TRANSLATIONS.get(normalizeKey(product.id))?.[language];
  if (idTranslation) return idTranslation;

  const nameTranslation = PRODUCT_TRANSLATIONS.get(normalizeKey(product.name))?.[language];
  if (nameTranslation) return nameTranslation;

  return null;
}

export function polyglotProductName(
  product: Pick<Product, "id" | "name">,
  language: LanguageCode,
): string {
  return lookupProductTranslation(product, language) ?? product.name;
}

export function polyglotProducts(products: Product[], language: LanguageCode): Product[] {
  if (language === "en") return products;

  return products.map((product) => {
    const localized = lookupProductTranslation(product, language);
    if (!localized || localized === product.name) return product;
    return { ...product, name: localized };
  });
}
