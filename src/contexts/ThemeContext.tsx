import React from "react";
import { useColorScheme } from "react-native";

import { fetchUserPreferences, saveUserPreferences } from "../lib/userPreferences";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { DEFAULT_THEME_PREFERENCE, type ThemeName, type ThemePreference } from "../theme/preferences";
import { THEMES, type ThemeColors } from "../theme/theme";

type ThemeContextValue = {
  colors: ThemeColors;
  themePreference: ThemePreference;
  resolvedTheme: ThemeName;
  setThemePreference: (next: ThemePreference) => void;
  ready: boolean;
};

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

type ThemeProviderProps = {
  children: React.ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps): React.ReactElement {
  const colorScheme = useColorScheme();
  const [themePreference, setThemePreferenceState] = React.useState<ThemePreference>(
    DEFAULT_THEME_PREFERENCE,
  );
  const [preferencesReady, setPreferencesReady] = React.useState<boolean>(() => !isSupabaseConfigured());
  const [userId, setUserId] = React.useState<string | null>(null);
  const pendingPreferenceRef = React.useRef<ThemePreference | null>(null);

  React.useEffect(() => {
    if (!isSupabaseConfigured()) {
      setUserId(null);
      return;
    }

    let isMounted = true;

    const resolveInitialUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!isMounted) {
          return;
        }

        if (error) {
          console.error("Failed to resolve authenticated user for theme preferences", error);
          setUserId(null);
          return;
        }

        setUserId(data.user?.id ?? null);
      } catch (error) {
        console.error("Failed to resolve authenticated user for theme preferences", error);
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
      console.error("Failed to subscribe to auth changes for theme preferences", error);
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

    const currentUserId = userId;

    if (!currentUserId) {
      setPreferencesReady(true);
      return;
    }

    let isMounted = true;
    setPreferencesReady(false);

    const loadPreferences = async () => {
      try {
        const preferences = await fetchUserPreferences(currentUserId);
        if (!isMounted) {
          return;
        }

        const pendingPreference = pendingPreferenceRef.current;
        if (pendingPreference) {
          setThemePreferenceState(pendingPreference);
          return;
        }

        if (preferences?.appearance) {
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
    if (!isSupabaseConfigured()) {
      return;
    }

    if (!preferencesReady) {
      return;
    }

    if (!userId) {
      return;
    }

    const pending = pendingPreferenceRef.current;
    if (!pending) {
      return;
    }

    pendingPreferenceRef.current = null;
    void saveUserPreferences(userId, { appearance: pending }).catch((error) => {
      console.error("Failed to persist theme preference", error);
    });
  }, [preferencesReady, userId]);

  const resolvedTheme: ThemeName = React.useMemo(() => {
    if (themePreference === "system") {
      return colorScheme === "dark" ? "dark" : "light";
    }
    return themePreference;
  }, [colorScheme, themePreference]);

  const colors = React.useMemo(() => THEMES[resolvedTheme], [resolvedTheme]);

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

      void saveUserPreferences(userId, { appearance: next }).catch((error) => {
        console.error("Failed to persist theme preference", error);
      });
    },
    [preferencesReady, userId],
  );

  const value = React.useMemo(
    () => ({ colors, themePreference, resolvedTheme, setThemePreference, ready: preferencesReady }),
    [colors, themePreference, resolvedTheme, setThemePreference, preferencesReady],
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
