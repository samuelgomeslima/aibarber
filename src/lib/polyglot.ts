import type { Service } from "./domain";

export type LanguageCode = "en" | "pt";

const RAW_SERVICE_TRANSLATIONS: Record<string, Partial<Record<LanguageCode, string>>> = {
  cut: { pt: "Corte clássico" },
  "classic cut": { pt: "Corte clássico" },
  "classic haircut": { pt: "Corte clássico" },
  fade: { pt: "Degradê" },
  color: { pt: "Coloração" },
  colors: { pt: "Coloração" },
  "hair color": { pt: "Coloração" },
  beard: { pt: "Barba" },
  shave: { pt: "Barbear" },
  "beard shave": { pt: "Barbear" },
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
