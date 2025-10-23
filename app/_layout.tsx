import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet, useColorScheme } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Link, Slot, usePathname } from "expo-router";

import { AuthGate } from "../src/components/AuthGate";
type MenuRoute = "dashboard" | "online-products" | "news";

type MenuItem = {
  key: MenuRoute;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  description: string;
  href: `/${string}`;
};

const MENU_ITEMS: MenuItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: "grid-outline",
    description: "Keep the existing operations experience accessible while refactoring.",
    href: "/assistant",
  },
  {
    key: "online-products",
    label: "Barbershop online products",
    icon: "bag-handle-outline",
    description: "Prototype ecommerce and digital shelves for barbershop owners.",
    href: "/barbershop-online-products",
  },
  {
    key: "news",
    label: "Barbershop news",
    icon: "newspaper-outline",
    description: "Share announcements and updates alongside the legacy app.",
    href: "/barbershop-news",
  },
];

const LIGHT_THEME = {
  background: "#F7F8FC",
  menuBackground: "#FFFFFF",
  menuBorder: "#E1E5F5",
  textPrimary: "#102043",
  textSecondary: "#5C6B8A",
  accent: "#3542FF",
  accentOn: "#FFFFFF",
};

const DARK_THEME = {
  background: "#060913",
  menuBackground: "#0F1524",
  menuBorder: "#1B2640",
  textPrimary: "#F4F7FF",
  textSecondary: "#8D9AC3",
  accent: "#4D63FF",
  accentOn: "#FFFFFF",
};

export default function RootLayout(): React.ReactElement {
  const scheme = useColorScheme();
  const colors = useMemo(() => (scheme === "dark" ? DARK_THEME : LIGHT_THEME), [scheme]);
  const pathname = usePathname();

  const activeRoute: MenuRoute = useMemo(() => {
    if (pathname.startsWith("/barbershop-online-products")) {
      return "online-products";
    }
    if (pathname.startsWith("/barbershop-news")) {
      return "news";
    }
    return "dashboard";
  }, [pathname]);

  return (
    <AuthGate>
      <View style={[styles.shell, { backgroundColor: colors.background }]}> 
        <View
          style={[
            styles.menu,
            { backgroundColor: colors.menuBackground, borderRightColor: colors.menuBorder },
          ]}
        >
          <View style={styles.brandRow}>
            <View style={[styles.brandIcon, { backgroundColor: colors.accent }]}>
              <MaterialCommunityIcons name="content-cut" size={18} color={colors.accentOn} />
            </View>
            <View>
              <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>AIBarber</Text>
              <Text style={[styles.brandSubtitle, { color: colors.textSecondary }]}>Workspaces</Text>
            </View>
          </View>

          <View style={styles.menuItems}>
            {MENU_ITEMS.map((item) => {
              const isActive = item.key === activeRoute;
              return (
                <Link key={item.key} href={item.href} asChild>
                  <Pressable
                    style={[
                      styles.menuItem,
                      isActive && [{ backgroundColor: colors.accent }, styles.menuItemActive],
                    ]}
                  >
                    <View style={styles.menuItemHeader}>
                      <Ionicons
                        name={item.icon}
                        size={18}
                        color={isActive ? colors.accentOn : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.menuItemLabel,
                        { color: isActive ? colors.accentOn : colors.textPrimary },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.menuItemDescription,
                      { color: isActive ? colors.accentOn : colors.textSecondary },
                    ]}
                  >
                    {item.description}
                  </Text>
                  </Pressable>
                </Link>
              );
            })}
          </View>
        </View>

        <View style={styles.content}>
          <Slot />
        </View>
      </View>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: "row",
  },
  menu: {
    width: 320,
    paddingVertical: 32,
    paddingHorizontal: 28,
    borderRightWidth: 1,
    gap: 32,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  brandIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  menuItems: {
    gap: 16,
  },
  menuItem: {
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 10,
  },
  menuItemActive: {
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  menuItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuItemLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  menuItemDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  content: {
    flex: 1,
  },
});
