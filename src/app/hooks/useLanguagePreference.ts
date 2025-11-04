import { useEffect, useMemo, useState } from "react";

import { useOptionalLanguageContext } from "../../contexts/LanguageContext";
import { getInitialLanguage, type SupportedLanguage } from "../../locales/language";
import { LANGUAGE_COPY } from "../copy/authenticatedAppCopy";
import { isSupabaseConfigured } from "../../lib/supabase";
import { fetchUserPreferences } from "../../lib/userPreferences";

export type UseLanguagePreferenceResult = {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
  copy: (typeof LANGUAGE_COPY)[SupportedLanguage];
  locale: string;
  languageReady: boolean;
};

export function useLanguagePreference(
  currentUserId: string | undefined,
  currentUserLoading: boolean,
): UseLanguagePreferenceResult {
  const languageContext = useOptionalLanguageContext();
  const [fallbackLanguage, setFallbackLanguage] = useState<SupportedLanguage>(() => getInitialLanguage());
  const [fallbackLanguageReady, setFallbackLanguageReady] = useState<boolean>(() =>
    languageContext ? true : !isSupabaseConfigured(),
  );

  useEffect(() => {
    if (languageContext) {
      return;
    }

    if (!isSupabaseConfigured()) {
      setFallbackLanguageReady(true);
      return;
    }

    if (!currentUserId) {
      if (!currentUserLoading) {
        setFallbackLanguageReady(true);
      }
      return;
    }

    let isMounted = true;
    setFallbackLanguageReady(false);

    const loadPreferences = async () => {
      try {
        const preferences = await fetchUserPreferences(currentUserId);
        if (!isMounted) {
          return;
        }

        if (preferences?.language) {
          setFallbackLanguage(preferences.language);
        }
      } catch (error) {
        console.error("Failed to load language preference", error);
      } finally {
        if (isMounted) {
          setFallbackLanguageReady(true);
        }
      }
    };

    void loadPreferences();

    return () => {
      isMounted = false;
    };
  }, [currentUserId, currentUserLoading, languageContext]);

  const language = languageContext?.language ?? fallbackLanguage;
  const setLanguage = languageContext?.setLanguage ?? setFallbackLanguage;
  const copy = useMemo(() => LANGUAGE_COPY[language], [language]);
  const locale = language === "pt" ? "pt-BR" : "en-US";
  const languageReady = languageContext ? languageContext.ready : fallbackLanguageReady;

  return {
    language,
    setLanguage,
    copy,
    locale,
    languageReady,
  };
}
