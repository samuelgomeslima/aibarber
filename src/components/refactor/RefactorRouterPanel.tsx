import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View, Pressable, useWindowDimensions, ScrollView } from "react-native";
import { createMemoryHistory, createRootRouteWithContext, createRoute, createRouter, Outlet, RouterProvider, useRouter, useRouterState } from "@tanstack/react-router";
import { Ionicons } from "@expo/vector-icons";

import type { ThemeColors } from "../../app/AuthenticatedApp";
import { RefactorMenuContext, type RefactorMenuContextValue, useRefactorMenuContext } from "./RefactorMenuContext";
import { BarbershopOnlineProductsScreen } from "../../app/refactor/BarbershopOnlineProductsScreen";
import { BarbershopNewsScreen } from "../../app/refactor/BarbershopNewsScreen";
import { RefactorWelcomeScreen } from "../../app/refactor/RefactorWelcomeScreen";

const rootRoute = createRootRouteWithContext<RefactorMenuContextValue>()({
  component: RefactorMenuLayout,
});

const onlineProductsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/online-products",
  component: BarbershopOnlineProductsScreen,
});

const newsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/news",
  component: BarbershopNewsScreen,
});

const welcomeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: RefactorWelcomeScreen,
});

const routeTree = rootRoute.addChildren([welcomeRoute, onlineProductsRoute, newsRoute]);

function createRefactorRouter() {
  return createRouter({
    routeTree,
    history: createMemoryHistory(),
    defaultPreload: "intent",
  });
}

type RefactorRouterPanelProps = {
  colors: ThemeColors;
};

export function RefactorRouterPanel({ colors }: RefactorRouterPanelProps): React.ReactElement {
  const { width: windowWidth } = useWindowDimensions();
  const collapsedWidth = 64;
  const expandedWidth = useMemo(() => {
    const preferred = Math.max(280, Math.min(360, windowWidth * 0.35));
    return Number.isFinite(preferred) ? preferred : 280;
  }, [windowWidth]);

  const [collapsed, setCollapsed] = useState(true);
  const toggle = useCallback(() => setCollapsed((prev) => !prev), []);
  const expand = useCallback(() => setCollapsed(false), []);
  const collapse = useCallback(() => setCollapsed(true), []);

  const [router] = useState(() => createRefactorRouter());

  const contextValue = useMemo<RefactorMenuContextValue>(
    () => ({ colors, collapsed, expand, collapse, toggle, dimensions: { collapsed: collapsedWidth, expanded: expandedWidth } }),
    [colors, collapsed, expand, collapse, toggle, collapsedWidth, expandedWidth],
  );

  useEffect(() => {
    router.update({ context: contextValue });
  }, [router, contextValue]);

  return (
    <RefactorMenuContext.Provider value={contextValue}>
      <View
        style={{
          width: collapsed ? collapsedWidth : expandedWidth,
          backgroundColor: colors.sidebarBg,
          alignSelf: "stretch",
        }}
      >
        <RouterProvider router={router} />
      </View>
    </RefactorMenuContext.Provider>
  );
}

type MenuItem = {
  path: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const MENU_ITEMS: MenuItem[] = [
  { path: "/online-products", label: "Barbershop online products", icon: "cart-outline" },
  { path: "/news", label: "Barbershop news", icon: "newspaper-outline" },
];

function RefactorMenuLayout(): React.ReactElement {
  const { colors, collapsed, toggle, expand, collapse, dimensions } = useRefactorMenuContext();
  const router = useRouter();
  const { location } = useRouterState({ select: (state) => ({ location: state.location }) });

  const handleNavigate = useCallback(
    (path: string) => {
      router.navigate({ to: path });
      expand();
    },
    [router, expand],
  );

  const activePath = location.pathname;

  return (
    <View
      style={[
        styles.container,
        {
          width: collapsed ? dimensions.collapsed : dimensions.expanded,
          borderRightColor: colors.border,
          backgroundColor: colors.sidebarBg,
        },
      ]}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}> 
        <Pressable
          onPress={toggle}
          style={[styles.toggleButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
          accessibilityRole="button"
          accessibilityLabel={collapsed ? "Expand experimental menu" : "Collapse experimental menu"}
        >
          <Ionicons
            name={collapsed ? "chevron-forward" : "chevron-back"}
            size={18}
            color={colors.subtext}
          />
        </Pressable>
        {!collapsed ? (
          <View style={styles.titleArea}>
            <Ionicons name="construct-outline" size={18} color={colors.subtext} />
            <Text style={[styles.title, { color: colors.subtext }]}>Labs</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.menuList}>
        {MENU_ITEMS.map((item) => {
          const isActive = activePath === item.path;
          return (
            <Pressable
              key={item.path}
              onPress={() => handleNavigate(item.path)}
              style={[
                styles.menuItem,
                {
                  backgroundColor: isActive ? colors.accent : "transparent",
                  borderColor: isActive ? colors.accent : "transparent",
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.label}`}
            >
              <Ionicons
                name={item.icon}
                size={18}
                color={isActive ? colors.accentFgOn : colors.subtext}
              />
              {!collapsed ? (
                <Text
                  style={[
                    styles.menuItemLabel,
                    { color: isActive ? colors.accentFgOn : colors.subtext },
                  ]}
                >
                  {item.label}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {!collapsed ? (
        <ScrollView
          style={[styles.contentArea, { borderTopColor: colors.border, backgroundColor: colors.surface }]}
          contentContainerStyle={{ padding: 16 }}
        >
          <Outlet />
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 0,
    alignSelf: "stretch",
    borderRightWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  toggleButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  titleArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0.2,
  },
  menuList: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    gap: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  menuItemLabel: {
    fontWeight: "700",
    fontSize: 13,
  },
  contentArea: {
    flex: 1,
    borderTopWidth: 1,
  },
});

export type RefactorRouter = ReturnType<typeof createRefactorRouter>;

declare module "@tanstack/react-router" {
  interface Register {
    router: RefactorRouter;
  }
}
