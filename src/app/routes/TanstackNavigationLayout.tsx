import React from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";

import { LanguageProvider, useLanguageContext } from "../../contexts/LanguageContext";
import { useOptionalThemeContext } from "../../contexts/ThemeContext";
import type { SupportedLanguage } from "../../locales/language";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import { THEMES, type ThemeColors } from "../../theme/colors";
import { applyAlpha } from "../../utils/color";

const MENU_WIDTH = 248;
const LEGACY_MENU_ICON_TOP = Platform.select<number>({ ios: 52, android: 40, default: 24 });
const FLOATING_TOGGLE_TOP = LEGACY_MENU_ICON_TOP + 44 + 12;

const MENU_KEYS = [
  "overview",
  "bookings",
  "services",
  "packages",
  "products",
  "cash-register",
  "assistant",
  "support",
  "team",
  "settings",
] as const;

type MenuKey = (typeof MENU_KEYS)[number];

type MenuItem = {
  key: MenuKey;
  to: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const MENU_LABELS: Record<SupportedLanguage, Record<MenuKey, string>> = {
  en: {
    "overview": "Overview",
    "bookings": "Bookings",
    "services": "Services",
    "packages": "Packages",
    "products": "Products",
    "cash-register": "Cash register",
    "assistant": "Assistant",
    "support": "Support",
    "team": "Team members",
    "settings": "Settings",
  },
  pt: {
    "overview": "Visão geral",
    "bookings": "Agendamentos",
    "services": "Serviços",
    "packages": "Pacotes",
    "products": "Produtos",
    "cash-register": "Caixa",
    "assistant": "Assistente",
    "support": "Suporte",
    "team": "Equipe",
    "settings": "Configurações",
  },
} as const;

const MENU_ITEMS: MenuItem[] = [
  { key: "overview", to: "/", icon: "grid-outline" },
  { key: "bookings", to: "/bookings", icon: "calendar-outline" },
  { key: "services", to: "/services", icon: "cut-outline" },
  { key: "packages", to: "/packages", icon: "cube-outline" },
  { key: "products", to: "/products", icon: "pricetag-outline" },
  { key: "cash-register", to: "/cash-register", icon: "cash-outline" },
  { key: "assistant", to: "/assistant", icon: "sparkles-outline" },
  { key: "support", to: "/support", icon: "help-buoy-outline" },
  { key: "team", to: "/team", icon: "people-outline" },
  { key: "settings", to: "/settings", icon: "settings-outline" },
];

const LOGOUT_COPY: Record<
  SupportedLanguage,
  { label: string; accessibility: string; errorTitle: string; errorMessage: string }
> = {
  en: {
    label: "Sign out",
    accessibility: "Sign out of AIBarber",
    errorTitle: "Sign out failed",
    errorMessage: "Unable to sign out. Please try again.",
  },
  pt: {
    label: "Sair",
    accessibility: "Sair do AIBarber",
    errorTitle: "Falha ao sair",
    errorMessage: "Não foi possível encerrar a sessão. Tente novamente.",
  },
};

function TanstackNavigationLayoutContent(): React.ReactElement {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [collapsed, setCollapsed] = React.useState(true);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const { language } = useLanguageContext();
  const themeContext = useOptionalThemeContext();
  const themeColors = themeContext?.colors ?? THEMES.dark;
  const labels = MENU_LABELS[language];
  const logoutCopy = LOGOUT_COPY[language];
  const styles = React.useMemo(() => createStyles(themeColors), [themeColors]);

  const handleNavigate = React.useCallback(
    (item: MenuItem) => {
      navigate({ to: item.to });
    },
    [navigate],
  );

  const handleLogout = React.useCallback(async () => {
    if (loggingOut) {
      return;
    }

    setCollapsed(true);

    if (!isSupabaseConfigured()) {
      Alert.alert(logoutCopy.errorTitle, logoutCopy.errorMessage);
      return;
    }

    setLoggingOut(true);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
    } catch (error) {
      const fallback = logoutCopy.errorMessage;
      const message = error instanceof Error ? error.message : fallback;
      Alert.alert(logoutCopy.errorTitle, message || fallback);
    } finally {
      setLoggingOut(false);
    }
  }, [loggingOut, logoutCopy.errorMessage, logoutCopy.errorTitle]);

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <Outlet />
      </View>
      {!collapsed ? (
        <View style={[styles.sidebar, { width: MENU_WIDTH }]}>
          <Pressable
            onPress={() => setCollapsed(true)}
            style={({ pressed }) => [styles.toggle, pressed && styles.togglePressed]}
            accessibilityRole="button"
            accessibilityLabel="Collapse tanstack navigation"
          >
            <Ionicons name="chevron-forward" size={18} color={themeColors.text} />
          </Pressable>
          <View style={styles.menuBody}>
            <ScrollView
              style={styles.menuScroll}
              contentContainerStyle={styles.menuContainer}
              showsVerticalScrollIndicator={false}
            >
              {MENU_ITEMS.map((item) => {
                const active = pathname === item.to;
                const label = labels[item.key];
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => handleNavigate(item)}
                    style={({ pressed }) => [
                      styles.menuItem,
                      active && styles.menuItemActive,
                      pressed && !active && styles.menuItemPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={label}
                  >
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={active ? themeColors.accent : themeColors.subtext}
                    />
                    <View style={styles.menuCopy}>
                      <Text style={[styles.menuLabel, active && styles.menuLabelActive]}>{label}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={styles.menuFooter}>
              <Pressable
                onPress={handleLogout}
                disabled={loggingOut}
                style={({ pressed }) => [
                  styles.menuItem,
                  styles.menuLogout,
                  pressed && styles.menuLogoutPressed,
                  loggingOut && styles.menuLogoutDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel={logoutCopy.accessibility}
                accessibilityState={{ disabled: loggingOut }}
              >
                <Ionicons name="log-out-outline" size={20} color={themeColors.danger} />
                <View style={styles.menuCopy}>
                  <Text style={[styles.menuLabel, styles.menuLogoutLabel]}>{logoutCopy.label}</Text>
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
      {collapsed ? (
        <Pressable
          onPress={() => setCollapsed(false)}
          style={({ pressed }) => [styles.floatingToggle, pressed && styles.togglePressed]}
          accessibilityRole="button"
          accessibilityLabel="Expand tanstack navigation"
        >
          <Ionicons name="chevron-back" size={18} color={themeColors.text} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function TanstackNavigationLayout(): React.ReactElement {
  return (
    <LanguageProvider>
      <TanstackNavigationLayoutContent />
    </LanguageProvider>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg,
      position: "relative",
    },
    sidebar: {
      backgroundColor: colors.sidebarBg,
      position: "absolute",
      top: 0,
      bottom: 0,
      right: 0,
      paddingTop: 24,
      paddingBottom: 24,
      borderLeftWidth: 1,
      borderLeftColor: colors.border,
      zIndex: 10,
    },
    menuBody: {
      flex: 1,
    },
    toggle: {
      alignSelf: "flex-start",
      marginLeft: 16,
      marginBottom: 16,
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: applyAlpha(colors.subtext, 0.14),
    },
    togglePressed: {
      backgroundColor: applyAlpha(colors.subtext, 0.22),
    },
    floatingToggle: {
      position: "absolute",
      top: FLOATING_TOGGLE_TOP,
      right: 16,
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.sidebarBg,
      borderWidth: 1,
      borderColor: colors.border,
      zIndex: 20,
    },
    menuContainer: {
      gap: 12,
      paddingHorizontal: 12,
      paddingBottom: 24,
    },
    menuScroll: {
      flex: 1,
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 12,
    },
    menuItemActive: {
      backgroundColor: applyAlpha(colors.accent, 0.14),
      borderWidth: 1,
      borderColor: colors.accent,
    },
    menuItemPressed: {
      backgroundColor: applyAlpha(colors.subtext, 0.12),
    },
    menuCopy: {
      flex: 1,
      gap: 0,
    },
    menuLabel: {
      color: colors.text,
      fontWeight: "700",
    },
    menuLabelActive: {
      color: colors.accent,
    },
    menuFooter: {
      paddingHorizontal: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    menuLogout: {
      borderWidth: 1,
      borderColor: applyAlpha(colors.danger, 0.4),
    },
    menuLogoutPressed: {
      backgroundColor: applyAlpha(colors.danger, 0.12),
    },
    menuLogoutLabel: {
      color: colors.danger,
    },
    menuLogoutDisabled: {
      opacity: 0.6,
    },
    content: {
      flex: 1,
    },
  });

export default TanstackNavigationLayout;
