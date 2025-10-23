import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, useColorScheme, useWindowDimensions } from "react-native";
import { Link, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const MENU_ITEMS = [
  {
    label: "Workspace",
    href: "/",
    icon: "grid-outline" as const,
  },
  {
    label: "Barbershop online products",
    href: "/barbershop-online-products",
    icon: "cart-outline" as const,
  },
  {
    label: "Barbershop news",
    href: "/barbershop-news",
    icon: "newspaper-outline" as const,
  },
];

export type DashboardLayoutProps = {
  children: React.ReactNode;
};

export function DashboardLayout({ children }: DashboardLayoutProps): React.ReactElement {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { width } = useWindowDimensions();
  const shouldAutoCollapse = width < 960;
  const [isCollapsed, setIsCollapsed] = useState(shouldAutoCollapse);
  const [hasManualOverride, setHasManualOverride] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!hasManualOverride) {
      setIsCollapsed(shouldAutoCollapse);
    }
  }, [hasManualOverride, shouldAutoCollapse]);

  const isNewRouteActive = useMemo(
    () => MENU_ITEMS.some((item) => item.href !== "/" && pathname.startsWith(item.href)),
    [pathname],
  );

  const menuItems = useMemo(
    () =>
      MENU_ITEMS.map((item) => {
        const isActive =
          item.href === "/" ? !isNewRouteActive : pathname.startsWith(item.href);

        return {
          ...item,
          isActive,
        };
      }),
    [isNewRouteActive, pathname],
  );

  const containerBackground = isDark ? "#0f0f0f" : "#f4f4f5";
  const sidebarBackground = isDark ? "#1c1c1e" : "#ffffff";
  const sidebarBorder = isDark ? "#27272a" : "#e4e4e7";
  const iconColor = isDark ? "#f4f4f5" : "#18181b";
  const activeItemBackground = isDark ? "#2c2c2e" : "#e4e4e7";

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: containerBackground },
      ]}
    >
      <View
        style={[
          styles.sidebar,
          { backgroundColor: sidebarBackground, borderRightColor: sidebarBorder },
          isCollapsed && styles.sidebarCollapsed,
        ]}
      >
        <View style={styles.menuHeader}>
          {!isCollapsed && (
            <Text style={[styles.menuTitle, { color: isDark ? "#f8f8f8" : "#18181b" }]}>Menu</Text>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isCollapsed ? "Expand navigation" : "Collapse navigation"}
            onPress={() => {
              setHasManualOverride(true);
              setIsCollapsed((prev) => !prev);
            }}
            style={styles.toggleButton}
          >
            <Ionicons
              name={isCollapsed ? "chevron-forward" : "chevron-back"}
              size={20}
              color={iconColor}
            />
          </Pressable>
        </View>

        <View style={styles.menuItems}>
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href} asChild>
              <Pressable
                style={({ pressed }) => [
                  styles.menuItem,
                  item.isActive && {
                    backgroundColor: activeItemBackground,
                  },
                  pressed && {
                    opacity: 0.7,
                  },
                ]}
              >
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={iconColor}
                />
                {!isCollapsed && (
                  <Text style={[styles.menuItemLabel, { color: iconColor }]}> 
                    {item.label}
                  </Text>
                )}
              </Pressable>
            </Link>
          ))}
        </View>
      </View>
      <View style={[styles.content, { backgroundColor: containerBackground }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
  },
  sidebar: {
    width: 260,
    paddingHorizontal: 16,
    paddingVertical: 24,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: "transparent",
    gap: 16,
  },
  sidebarCollapsed: {
    width: 72,
    paddingHorizontal: 8,
  },
  menuHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  toggleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  menuItems: {
    gap: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  menuItemLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  content: {
    flex: 1,
  },
});

export default DashboardLayout;
