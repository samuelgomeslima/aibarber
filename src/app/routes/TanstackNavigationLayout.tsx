import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";

const MENU_WIDTH = 248;
const LEGACY_MENU_ICON_TOP = Platform.select<number>({ ios: 52, android: 40, default: 24 });
const FLOATING_TOGGLE_TOP = LEGACY_MENU_ICON_TOP + 44 + 12;

type MenuItem = {
  key: string;
  label: string;
  to: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
};

const MENU_ITEMS: MenuItem[] = [
  {
    key: "overview",
    label: "Overview",
    to: "/",
    icon: "grid-outline",
    description: "Review performance insights across your barbershop operations.",
  },
  {
    key: "bookings",
    label: "Bookings",
    to: "/bookings",
    icon: "calendar-outline",
    description: "Monitor upcoming appointments and confirm recent services.",
  },
  {
    key: "services",
    label: "Services",
    to: "/services",
    icon: "cut-outline",
    description: "Keep service offerings and pricing up to date.",
  },
  {
    key: "packages",
    label: "Packages",
    to: "/packages",
    icon: "cube-outline",
    description: "Bundle services together to drive repeat visits.",
  },
  {
    key: "products",
    label: "Products",
    to: "/products",
    icon: "pricetag-outline",
    description: "Track retail inventory and manage product catalog.",
  },
  {
    key: "cash-register",
    label: "Cash register",
    to: "/cash-register",
    icon: "cash-outline",
    description: "Record sales activity and reconcile daily cash flow.",
  },
  {
    key: "assistant",
    label: "Assistant",
    to: "/assistant",
    icon: "sparkles-outline",
    description: "Chat with the AI assistant for operational support.",
  },
  {
    key: "support",
    label: "Support",
    to: "/support",
    icon: "help-buoy-outline",
    description: "Reach the support team for troubleshooting.",
  },
  {
    key: "team",
    label: "Team members",
    to: "/team",
    icon: "people-outline",
    description: "Manage staff access and roles.",
  },
  {
    key: "settings",
    label: "Settings",
    to: "/settings",
    icon: "settings-outline",
    description: "Adjust preferences and workspace configuration.",
  },
];

export function TanstackNavigationLayout(): React.ReactElement {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [collapsed, setCollapsed] = React.useState(true);

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
          <View style={styles.menuContainer}>
            {MENU_ITEMS.map((item) => {
              const active = pathname === item.to;
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
                  accessibilityLabel={item.label}
                >
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={active ? "#38bdf8" : "#cbd5f5"}
                  />
                  <View style={styles.menuCopy}>
                    <Text style={[styles.menuLabel, active && styles.menuLabelActive]}>{item.label}</Text>
                    <Text style={styles.menuDescription}>{item.description}</Text>
                  </View>
                </Pressable>
              );
            })}
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
          <Ionicons name="chevron-back" size={18} color="#f8fafc" />
        </Pressable>
      ) : null}
    </View>
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
    flex: 1,
    gap: 12,
    paddingHorizontal: 12,
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
    gap: 4,
  },
  menuLabel: {
    color: "#e2e8f0",
    fontWeight: "700",
  },
  menuLabelActive: {
    color: "#38bdf8",
  },
  menuDescription: {
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 16,
  },
  content: {
    flex: 1,
  },
});

export default TanstackNavigationLayout;
