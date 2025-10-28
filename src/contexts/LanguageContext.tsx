import React from "react";

import { getInitialLanguage, type SupportedLanguage } from "../locales/language";
import { fetchUserPreferences, saveUserPreferences, type UserPreferencesUpdate } from "../lib/userPreferences";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

type LanguageContextValue = {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
  ready: boolean;
};

const LanguageContext = React.createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const initialLanguage = React.useMemo(() => getInitialLanguage(), []);
  const [language, setLanguageState] = React.useState<SupportedLanguage>(initialLanguage);
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

    const resolveInitialUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          throw error;
        }

        if (!isMounted) {
          return;
        }

        setUserId(data.user?.id ?? null);
      } catch (error) {
        console.error("Failed to resolve authenticated user", error);
        if (isMounted) {
          setUserId(null);
        }
      }
    };

    void resolveInitialUser();

    const { data, error } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }

      setUserId(session?.user?.id ?? null);
    });

    if (error) {
      console.error("Failed to subscribe to auth changes", error);
    }

    return () => {
      isMounted = false;
      data?.subscription.unsubscribe();
    };
  }, []);

  React.useEffect(() => {
    if (!isSupabaseConfigured()) {
      setPreferencesReady(true);
      return;
    }

    let isMounted = true;

    setPreferencesReady(false);

    if (!userId) {
      setLanguageState(initialLanguage);
      setPreferencesReady(true);
      return () => {
        isMounted = false;
      };
    }

    const loadPreferences = async () => {
      try {
        const preferences = await fetchUserPreferences(userId);
        if (!isMounted) {
          return;
        }

        const pendingLanguage = pendingUpdatesRef.current?.language;

        if (pendingLanguage) {
          setLanguageState(pendingLanguage);
        } else if (preferences?.language) {
          setLanguageState(preferences.language);
        } else {
          setLanguageState(initialLanguage);
        }
      } catch (error) {
        console.error("Failed to load language preference", error);
      } finally {
        if (isMounted) {
          setPreferencesReady(true);
        }
      }
    };

    void loadPreferences();

    return () => {
      isMounted = false;
    };
  }, [initialLanguage, userId]);

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

  const value = React.useMemo(
    () => ({ language, setLanguage, ready: preferencesReady }),
    [language, setLanguage, preferencesReady],
  );

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
