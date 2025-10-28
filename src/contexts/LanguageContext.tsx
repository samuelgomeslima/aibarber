import React from "react";

import { getInitialLanguage, type SupportedLanguage } from "../locales/language";
import { fetchUserPreferences, saveUserPreferences, type UserPreferencesUpdate } from "../lib/userPreferences";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

type LanguageContextValue = {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
};

const LanguageContext = React.createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [language, setLanguageState] = React.useState<SupportedLanguage>(() => getInitialLanguage());
  const [userId, setUserId] = React.useState<string | null>(null);
  const [preferencesReady, setPreferencesReady] = React.useState<boolean>(() => !isSupabaseConfigured());
  const pendingUpdatesRef = React.useRef<UserPreferencesUpdate | null>(null);

  const persistUpdates = React.useCallback(
    async (updates: UserPreferencesUpdate) => {
      if (!isSupabaseConfigured()) {
        return;
      }

      if (!userId) {
        return;
      }

      try {
        await saveUserPreferences(userId, updates);
      } catch (error) {
        console.error("Failed to save language preference", error);
      }
    },
    [userId],
  );

  React.useEffect(() => {
    if (!isSupabaseConfigured()) {
      setPreferencesReady(true);
      return;
    }

    let isMounted = true;

    const loadPreferences = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          throw error;
        }

        if (!isMounted) {
          return;
        }

        const id = data.user?.id ?? null;
        setUserId(id);

        if (!id) {
          return;
        }

        const preferences = await fetchUserPreferences(id);
        if (!isMounted) {
          return;
        }

        if (preferences?.language) {
          setLanguageState(preferences.language);
        }
      } catch (error) {
        console.error("Failed to load language preference", error);
      } finally {
        if (isMounted) {
          setPreferencesReady(true);
        }
      }
    };

    loadPreferences();

    return () => {
      isMounted = false;
    };
  }, []);

  React.useEffect(() => {
    if (!preferencesReady || !userId) {
      return;
    }

    if (!pendingUpdatesRef.current) {
      return;
    }

    const updates = pendingUpdatesRef.current;
    pendingUpdatesRef.current = null;
    void persistUpdates(updates);
  }, [preferencesReady, persistUpdates, userId]);

  const setLanguage = React.useCallback(
    (next: SupportedLanguage) => {
      setLanguageState(next);

      if (!isSupabaseConfigured()) {
        return;
      }

      const update: UserPreferencesUpdate = { language: next };

      if (!userId || !preferencesReady) {
        pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...update };
        return;
      }

      void persistUpdates(update);
    },
    [preferencesReady, persistUpdates, userId],
  );

  const value = React.useMemo(() => ({ language, setLanguage }), [language, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguageContext(): LanguageContextValue {
  const context = React.useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguageContext must be used within a LanguageProvider");
  }
  return context;
}

export function useOptionalLanguageContext(): LanguageContextValue | undefined {
  return React.useContext(LanguageContext);
}

export { LanguageContext };
