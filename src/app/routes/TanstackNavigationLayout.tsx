import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";

import { LanguageProvider, useLanguageContext } from "../../contexts/LanguageContext";
import type { SupportedLanguage } from "../../locales/language";

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

function TanstackNavigationLayoutContent(): React.ReactElement {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [collapsed, setCollapsed] = React.useState(true);
  const { language } = useLanguageContext();
  const labels = MENU_LABELS[language];

  const handleNavigate = React.useCallback(
    (item: MenuItem) => {
      navigate({ to: item.to });
    },
    [navigate],
  );

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
            <Ionicons name="chevron-forward" size={18} color="#f8fafc" />
          </Pressable>
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
                    color={active ? "#38bdf8" : "#cbd5f5"}
                  />
                  <View style={styles.menuCopy}>
                    <Text style={[styles.menuLabel, active && styles.menuLabelActive]}>{label}</Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
      {collapsed ? (
        <Pressable
          onPress={() => setCollapsed(false)}
          style={({ pressed }) => [styles.floatingToggle, pressed && styles.togglePressed]}
          accessibilityRole="button"
          accessibilityLabel="Expand tanstack navigation"
        >
          <Ionicons name="chevron-back" size={18} color="#f8fafc" />
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#020817",
    position: "relative",
  },
  sidebar: {
    backgroundColor: "#0b1120",
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    paddingTop: 24,
    paddingBottom: 24,
    borderLeftWidth: 1,
    borderLeftColor: "#1e293b",
    zIndex: 10,
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
    backgroundColor: "#1e293b",
  },
  togglePressed: {
    backgroundColor: "#1f2a48",
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
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#1e293b",
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
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#38bdf8",
  },
  menuItemPressed: {
    backgroundColor: "#0f172a",
  },
  menuCopy: {
    flex: 1,
    gap: 0,
  },
  menuLabel: {
    color: "#e2e8f0",
    fontWeight: "700",
  },
  menuLabelActive: {
    color: "#38bdf8",
  },
  content: {
    flex: 1,
  },
});

export default TanstackNavigationLayout;
