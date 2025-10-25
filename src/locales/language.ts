import * as Localization from "expo-localization";

export type SupportedLanguage = "en" | "pt";

export function getInitialLanguage(): SupportedLanguage {
  try {
    const locales = Localization.getLocales();
    if (Array.isArray(locales) && locales.length > 0) {
      const primary = locales[0];
      const languageCode = primary.languageCode?.toLowerCase();
      if (languageCode === "pt") {
        return "pt";
      }
    }
  } catch (error) {
    console.warn("Failed to detect system language", error);
  }
  return "en";
}
