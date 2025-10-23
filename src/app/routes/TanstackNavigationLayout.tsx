import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";

const MENU_WIDTH = 248;

type MenuItem = {
  key: string;
  label: string;
  to: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
};

const MENU_ITEMS: MenuItem[] = [
  {
    key: "legacy",
    label: "Legacy dashboard",
    to: "/",
    icon: "grid-outline",
    description: "Keep working with the current scheduling tools.",
  },
  {
    key: "online-products",
    label: "Barbershop online products",
    to: "/online-products",
    icon: "cart-outline",
    description: "Draft the future e-commerce experience.",
  },
  {
    key: "news",
    label: "Barbershop news",
    to: "/news",
    icon: "newspaper-outline",
    description: "Read about fresh platform updates and stories.",
  },
];

export function TanstackNavigationLayout(): React.ReactElement {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [collapsed, setCollapsed] = React.useState(false);

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
      <View style={[styles.sidebarWrapper, { width: collapsed ? 0 : MENU_WIDTH }]}>
        {!collapsed ? (
          <View style={styles.sidebar}>
            <Pressable
              onPress={() => setCollapsed(true)}
              style={({ pressed }) => [
                styles.toggle,
                styles.toggleExpanded,
                pressed && styles.togglePressed,
              ]}
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
      </View>
      {collapsed ? (
        <Pressable
          onPress={() => setCollapsed(false)}
          style={({ pressed }) => [
            styles.toggle,
            styles.toggleFloating,
            pressed && styles.togglePressed,
          ]}
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
    flexDirection: "row",
    position: "relative",
    backgroundColor: "#020817",
  },
  content: {
    flex: 1,
  },
  sidebarWrapper: {
    position: "relative",
    overflow: "visible",
    flexShrink: 0,
  },
  sidebar: {
    flex: 1,
    backgroundColor: "#0b1120",
    paddingTop: 24,
    paddingBottom: 24,
    borderLeftWidth: 1,
    borderLeftColor: "#1e293b",
  },
  toggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e293b",
  },
  toggleExpanded: {
    alignSelf: "flex-start",
    marginLeft: 16,
    marginBottom: 16,
  },
  toggleFloating: {
    position: "absolute",
    right: 24,
    top: 104,
    zIndex: 10,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
    elevation: 8,
  },
  togglePressed: {
    backgroundColor: "#1f2a48",
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
});

export default TanstackNavigationLayout;
