import React from "react";
import { Slot, Link, usePathname } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

const MENU_ITEMS = [
  {
    href: "/barbershop-online-products",
    label: "Barbershop online products",
    shortLabel: "Products",
  },
  {
    href: "/barbershop-news",
    label: "Barbershop news",
    shortLabel: "News",
  },
] as const;

export default function SideMenuLayout(): React.ReactElement {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <View style={styles.container}>
      <View style={[styles.sidebar, collapsed && styles.sidebarCollapsed]}>
        <View style={styles.sidebarHeader}>
          <Text style={collapsed ? styles.brandCollapsed : styles.brand}>
            {collapsed ? "AI" : "AI Barber"}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={collapsed ? "Expand menu" : "Collapse menu"}
            onPress={() => setCollapsed((value) => !value)}
            style={styles.toggleButton}
          >
            <Text style={styles.toggleButtonText}>{collapsed ? "›" : "‹"}</Text>
          </Pressable>
        </View>

        <View style={styles.menuItems}>
          {MENU_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link href={item.href} key={item.href} asChild>
                <Pressable
                  accessibilityRole="link"
                  style={({ pressed }) => [
                    styles.menuItem,
                    collapsed && styles.menuItemCollapsed,
                    isActive && styles.menuItemActive,
                    pressed && styles.menuItemPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.menuItemText,
                      collapsed && styles.menuItemTextCollapsed,
                      isActive && styles.menuItemTextActive,
                    ]}
                    numberOfLines={collapsed ? 1 : 2}
                  >
                    {collapsed ? item.shortLabel : item.label}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
  },
  sidebar: {
    width: 280,
    backgroundColor: "#111827",
    paddingHorizontal: 16,
    paddingVertical: 24,
    gap: 24,
  },
  sidebarCollapsed: {
    width: 96,
    paddingHorizontal: 12,
  },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "700",
  },
  brandCollapsed: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  toggleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(148, 163, 184, 0.16)",
  },
  toggleButtonText: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "600",
  },
  menuItems: {
    flex: 1,
    gap: 12,
  },
  menuItem: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: "transparent",
  },
  menuItemCollapsed: {
    alignItems: "center",
  },
  menuItemPressed: {
    backgroundColor: "rgba(148, 163, 184, 0.14)",
  },
  menuItemActive: {
    backgroundColor: "rgba(59, 130, 246, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.65)",
  },
  menuItemText: {
    color: "#e2e8f0",
    fontWeight: "600",
    fontSize: 14,
  },
  menuItemTextCollapsed: {
    textAlign: "center",
  },
  menuItemTextActive: {
    color: "#bfdbfe",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
});
