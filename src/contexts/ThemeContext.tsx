import React from "react";
import { useColorScheme } from "react-native";

import { fetchUserPreferences, saveUserPreferences } from "../lib/userPreferences";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { THEMES, type ThemeColors } from "../theme/colors";
import { DEFAULT_THEME_PREFERENCE, type ThemeName, type ThemePreference } from "../theme/preferences";

export type ThemeContextValue = {
  themePreference: ThemePreference;
  setThemePreference: (next: ThemePreference) => void;
  resolvedTheme: ThemeName;
  colors: ThemeColors;
};

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const colorScheme = useColorScheme();
  const [themePreference, setThemePreferenceState] = React.useState<ThemePreference>(DEFAULT_THEME_PREFERENCE);
  const [userId, setUserId] = React.useState<string | null>(null);
  const [preferencesReady, setPreferencesReady] = React.useState<boolean>(() => !isSupabaseConfigured());
  const pendingPreferenceRef = React.useRef<ThemePreference | null>(null);

  const resolvedTheme = React.useMemo<ThemeName>(() => {
    if (themePreference === "system") {
      return colorScheme === "dark" ? "dark" : "light";
    }
    return themePreference;
  }, [colorScheme, themePreference]);

  const colors = React.useMemo(() => THEMES[resolvedTheme], [resolvedTheme]);

  const persistPreference = React.useCallback(
    async (appearance: ThemePreference) => {
      if (!isSupabaseConfigured()) {
        return;
      }

      if (!userId) {
        return;
      }

      try {
        await saveUserPreferences(userId, { appearance });
      } catch (error) {
        console.error("Failed to save theme preference", error);
      }
    },
    [userId],
  );

  React.useEffect(() => {
    if (!isSupabaseConfigured()) {
      setUserId(null);
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
      setThemePreferenceState(DEFAULT_THEME_PREFERENCE);
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

        const pending = pendingPreferenceRef.current;

        if (pending) {
          setThemePreferenceState(pending);
        } else if (preferences?.appearance) {
          setThemePreferenceState(preferences.appearance);
        } else {
          setThemePreferenceState(DEFAULT_THEME_PREFERENCE);
        }
      } catch (error) {
        console.error("Failed to load theme preference", error);
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
  }, [userId]);

  React.useEffect(() => {
    if (!preferencesReady || !userId) {
      return;
    }

    const pending = pendingPreferenceRef.current;
    if (!pending) {
      return;
    }

    pendingPreferenceRef.current = null;
    void persistPreference(pending);
  }, [persistPreference, preferencesReady, userId]);

  const setThemePreference = React.useCallback(
    (next: ThemePreference) => {
      setThemePreferenceState(next);

      if (!isSupabaseConfigured()) {
        return;
      }

      if (!userId || !preferencesReady) {
        pendingPreferenceRef.current = next;
        return;
      }

      void persistPreference(next);
    },
    [persistPreference, preferencesReady, userId],
  );

  const value = React.useMemo<ThemeContextValue>(
    () => ({ themePreference, setThemePreference, resolvedTheme, colors }),
    [colors, resolvedTheme, setThemePreference, themePreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeContext must be used within a ThemeProvider");
  }
  return context;
}

export function useOptionalThemeContext(): ThemeContextValue | undefined {
  return React.useContext(ThemeContext);
}

export { ThemeContext };
