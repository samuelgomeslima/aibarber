import React, { useMemo, useState } from "react";
import { Link, Slot, usePathname } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from "react-native";

type MenuItem = {
  href: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap | keyof typeof MaterialCommunityIcons.glyphMap;
  iconLibrary?: "ion" | "material";
  accessibilityLabel: string;
};

const MENU_ITEMS: MenuItem[] = [
  {
    href: "/new-menu/barbershop-online-products",
    label: "Barbershop online products",
    icon: "cart-outline",
    accessibilityLabel: "Go to barbershop online products",
  },
  {
    href: "/new-menu/barbershop-news",
    label: "Barbershop news",
    icon: "newspaper-outline",
    accessibilityLabel: "Go to barbershop news",
  },
  {
    href: "/",
    label: "Back to current dashboard",
    icon: "content-cut",
    iconLibrary: "material",
    accessibilityLabel: "Back to the existing AIBarber dashboard",
  },
];

const COLLAPSED_WIDTH = 72;
const EXPANDED_WIDTH = 260;

export default function NewMenuLayout(): React.ReactElement {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const [collapsed, setCollapsed] = useState(width < 720);

  const activeHref = useMemo(() => {
    if (!pathname) return undefined;
    const match = MENU_ITEMS.find((item) => pathname.startsWith(item.href));
    if (match) return match.href;
    return undefined;
  }, [pathname]);

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.sidebar,
          { width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH },
        ]}
      >
        <Pressable
          onPress={() => setCollapsed((current) => !current)}
          accessibilityRole="button"
          accessibilityLabel={collapsed ? "Expand navigation menu" : "Collapse navigation menu"}
          style={styles.toggle}
        >
          <Ionicons
            name={collapsed ? "chevron-forward" : "chevron-back"}
            size={20}
            color="#ffffff"
          />
        </Pressable>
        <View style={styles.brandRow}>
          <MaterialCommunityIcons name="content-cut" size={22} color="#ffffff" />
          {!collapsed && <Text style={styles.brandText}>AIBarber</Text>}
        </View>
        <View style={styles.menuItems}>
          {MENU_ITEMS.map((item) => {
            const selected = activeHref === item.href;
            const IconComponent = item.iconLibrary === "material" ? MaterialCommunityIcons : Ionicons;
            return (
              <Link key={item.href} href={item.href} asChild>
                <Pressable
                  style={[styles.menuItem, selected && styles.menuItemActive]}
                  accessibilityRole="link"
                  accessibilityLabel={item.accessibilityLabel}
                >
                  <IconComponent
                    name={item.icon as never}
                    size={22}
                    color={selected ? "#111827" : "#e5e7eb"}
                  />
                  {!collapsed && (
                    <Text style={[styles.menuItemText, selected && styles.menuItemTextActive]}>
                      {item.label}
                    </Text>
                  )}
                </Pressable>
              </Link>
            );
          })}
        </View>
      </View>
      <View style={styles.contentArea}>
        <Slot />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#0f172a",
  },
  sidebar: {
    paddingTop: 32,
    paddingHorizontal: 12,
    backgroundColor: "#111c33",
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: "rgba(255,255,255,0.12)",
  },
  toggle: {
    alignSelf: "flex-end",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  brandRow: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  brandText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
  },
  menuItems: {
    marginTop: 32,
    gap: 6,
  },
  menuItem: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  menuItemActive: {
    backgroundColor: "#facc15",
  },
  menuItemText: {
    color: "#e5e7eb",
    fontSize: 15,
    fontWeight: "500",
  },
  menuItemTextActive: {
    color: "#111827",
  },
  contentArea: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
});
