import React from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";

import { LanguageProvider, useLanguageContext } from "../../contexts/LanguageContext";
import { useThemeContext } from "../../contexts/ThemeContext";
import type { SupportedLanguage } from "../../locales/language";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import type { ThemeColors } from "../../theme/theme";

const MENU_WIDTH = 248;
const MENU_ICON_TOP = Platform.select<number>({ ios: 52, android: 40, default: 24 });

const MENU_KEYS = [
  "overview",
  "bookings",
  "products",
  "cash-register",
  "assistant",
  "support",
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
    "products": "Products",
    "cash-register": "Cash register",
    "assistant": "Assistant",
    "support": "Support",
    "settings": "Settings",
  },
  pt: {
    "overview": "Visão geral",
    "bookings": "Agendamentos",
    "products": "Produtos",
    "cash-register": "Caixa",
    "assistant": "Assistente",
    "support": "Suporte",
    "settings": "Configurações",
  },
} as const;

const MENU_ITEMS: MenuItem[] = [
  { key: "overview", to: "/", icon: "grid-outline" },
  { key: "bookings", to: "/bookings", icon: "calendar-outline" },
  { key: "products", to: "/products", icon: "pricetag-outline" },
  { key: "cash-register", to: "/cash-register", icon: "cash-outline" },
  { key: "assistant", to: "/assistant", icon: "sparkles-outline" },
  { key: "support", to: "/support", icon: "help-buoy-outline" },
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

type MenuTheme = {
  rootBackground: string;
  sidebarBackground: string;
  sidebarBorderColor: string;
  toggleBackground: string;
  togglePressedBackground: string;
  toggleIconColor: string;
  floatingToggleBackground: string;
  floatingToggleBorderColor: string;
  iconActiveColor: string;
  iconInactiveColor: string;
  itemActiveBackground: string;
  itemActiveBorderColor: string;
  itemPressedBackground: string;
  labelColor: string;
  labelActiveColor: string;
  footerBorderColor: string;
  logoutBorderColor: string;
  logoutPressedBackground: string;
  logoutLabelColor: string;
  logoutIconColor: string;
};

function getMenuTheme(resolvedTheme: "light" | "dark", colors: ThemeColors): MenuTheme {
  if (resolvedTheme === "dark") {
    return {
      rootBackground: colors.bg,
      sidebarBackground: colors.sidebarBg,
      sidebarBorderColor: "#1e293b",
      toggleBackground: "#1e293b",
      togglePressedBackground: "#1f2a48",
      toggleIconColor: "#f8fafc",
      floatingToggleBackground: "#1e293b",
      floatingToggleBorderColor: "#1e293b",
      iconActiveColor: colors.accent,
      iconInactiveColor: "#cbd5f5",
      itemActiveBackground: "#0f172a",
      itemActiveBorderColor: colors.accent,
      itemPressedBackground: "#0f172a",
      labelColor: colors.text,
      labelActiveColor: colors.accent,
      footerBorderColor: "#1e293b",
      logoutBorderColor: "rgba(248, 113, 113, 0.4)",
      logoutPressedBackground: "rgba(248, 113, 113, 0.12)",
      logoutLabelColor: "#f87171",
      logoutIconColor: "#f87171",
    };
  }

  return {
    rootBackground: colors.bg,
    sidebarBackground: colors.sidebarBg,
    sidebarBorderColor: "#e2e8f0",
    toggleBackground: "#e2e8f0",
    togglePressedBackground: "#cbd5f5",
    toggleIconColor: colors.text,
    floatingToggleBackground: colors.sidebarBg,
    floatingToggleBorderColor: "#cbd5f5",
    iconActiveColor: colors.accent,
    iconInactiveColor: "#64748b",
    itemActiveBackground: "#dbeafe",
    itemActiveBorderColor: colors.accent,
    itemPressedBackground: "#e2e8f0",
    labelColor: colors.text,
    labelActiveColor: colors.accent,
    footerBorderColor: "#e2e8f0",
    logoutBorderColor: "rgba(220, 38, 38, 0.35)",
    logoutPressedBackground: "rgba(220, 38, 38, 0.08)",
    logoutLabelColor: colors.danger,
    logoutIconColor: colors.danger,
  };
}

function TanstackNavigationLayoutContent(): React.ReactElement {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [collapsed, setCollapsed] = React.useState(true);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const { language } = useLanguageContext();
  const labels = MENU_LABELS[language];
  const logoutCopy = LOGOUT_COPY[language];
  const { colors: themeColors, resolvedTheme } = useThemeContext();
  const menuTheme = React.useMemo(() => getMenuTheme(resolvedTheme, themeColors), [resolvedTheme, themeColors]);
  const styles = React.useMemo(() => createStyles(menuTheme), [menuTheme]);

  const handleNavigate = React.useCallback(
    (item: MenuItem) => {
      navigate({ to: item.to });
      setCollapsed(true);
    },
    [navigate, setCollapsed],
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
        <>
          <Pressable
            onPress={() => setCollapsed(true)}
            style={styles.backdrop}
            accessibilityRole="button"
            accessibilityLabel="Collapse tanstack navigation"
            accessibilityHint="Closes the tanstack navigation menu"
          />
          <View style={[styles.sidebar, { width: MENU_WIDTH }]}>
            <Pressable
              onPress={() => setCollapsed(true)}
              style={({ pressed }) => [styles.toggle, pressed && styles.togglePressed]}
              accessibilityRole="button"
              accessibilityLabel="Collapse tanstack navigation"
            >
              <Ionicons name="chevron-forward" size={18} color={menuTheme.toggleIconColor} />
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
                        color={active ? menuTheme.iconActiveColor : menuTheme.iconInactiveColor}
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
                  <Ionicons name="log-out-outline" size={20} color={menuTheme.logoutIconColor} />
                  <View style={styles.menuCopy}>
                    <Text style={[styles.menuLabel, styles.menuLogoutLabel]}>{logoutCopy.label}</Text>
                  </View>
                </Pressable>
              </View>
            </View>
          </View>
        </>
      ) : null}
      {collapsed ? (
        <Pressable
          onPress={() => setCollapsed(false)}
          style={({ pressed }) => [styles.floatingToggle, pressed && styles.togglePressed]}
          accessibilityRole="button"
          accessibilityLabel="Expand tanstack navigation"
        >
          <Ionicons name="chevron-back" size={18} color={menuTheme.toggleIconColor} />
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

const createStyles = (theme: MenuTheme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.rootBackground,
      position: "relative",
    },
    sidebar: {
      backgroundColor: theme.sidebarBackground,
      position: "absolute",
      top: 0,
      bottom: 0,
      right: 0,
      paddingTop: 24,
      paddingBottom: 24,
      borderLeftWidth: 1,
      borderLeftColor: theme.sidebarBorderColor,
      zIndex: 10,
    },
    backdrop: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: "transparent",
      zIndex: 5,
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
      backgroundColor: theme.toggleBackground,
    },
    togglePressed: {
      backgroundColor: theme.togglePressedBackground,
    },
    floatingToggle: {
      position: "absolute",
      top: MENU_ICON_TOP,
      right: 16,
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.floatingToggleBackground,
      borderWidth: 1,
      borderColor: theme.floatingToggleBorderColor,
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
      backgroundColor: theme.itemActiveBackground,
      borderWidth: 1,
      borderColor: theme.itemActiveBorderColor,
    },
    menuItemPressed: {
      backgroundColor: theme.itemPressedBackground,
    },
    menuCopy: {
      flex: 1,
      gap: 0,
    },
    menuLabel: {
      color: theme.labelColor,
      fontWeight: "700",
    },
    menuLabelActive: {
      color: theme.labelActiveColor,
    },
    menuFooter: {
      paddingHorizontal: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.footerBorderColor,
    },
    menuLogout: {
      borderWidth: 1,
      borderColor: theme.logoutBorderColor,
    },
    menuLogoutPressed: {
      backgroundColor: theme.logoutPressedBackground,
    },
    menuLogoutLabel: {
      color: theme.logoutLabelColor,
    },
    menuLogoutDisabled: {
      opacity: 0.6,
    },
    content: {
      flex: 1,
    },
  });

export default TanstackNavigationLayout;
