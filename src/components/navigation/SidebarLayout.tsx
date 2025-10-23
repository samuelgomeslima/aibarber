import React from "react";
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Link, Slot, usePathname } from "expo-router";

import { useSidebar } from "../../providers/SidebarProvider";

type SidebarLayoutProps = {
  children?: React.ReactNode;
};

type MenuItem = {
  href: string;
  label: string;
  shortLabel: string;
};

const MENU_ITEMS: MenuItem[] = [
  {
    href: "/barbershop-online-products",
    label: "Barbershop Online Products",
    shortLabel: "Products",
  },
  {
    href: "/barbershop-news",
    label: "Barbershop News",
    shortLabel: "News",
  },
];

export function SidebarLayout({ children }: SidebarLayoutProps): React.ReactElement {
  const { isCollapsed, toggleCollapse } = useSidebar();
  const pathname = usePathname();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={[styles.sidebar, isCollapsed && styles.sidebarCollapsed]}>
          <Pressable onPress={toggleCollapse} style={styles.toggleButton}>
            <Text style={styles.toggleText}>{isCollapsed ? "⮞" : "⮜"}</Text>
          </Pressable>

          <View style={styles.menuContainer}>
            {MENU_ITEMS.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link href={item.href} key={item.href} asChild>
                  <Pressable
                    accessibilityRole="button"
                    style={[styles.menuItem, isActive && styles.menuItemActive]}
                  >
                    <Text
                      style={[
                        styles.menuText,
                        isActive && styles.menuTextActive,
                        isCollapsed && styles.menuTextCollapsed,
                      ]}
                      numberOfLines={1}
                    >
                      {isCollapsed ? item.shortLabel : item.label}
                    </Text>
                  </Pressable>
                </Link>
              );
            })}
          </View>
        </View>

        <View style={styles.content}>
          {children ?? <Slot />}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f2f2f2",
  },
  container: {
    flex: 1,
    flexDirection: "row",
  },
  sidebar: {
    width: 260,
    backgroundColor: "#101820",
    paddingVertical: 24,
    paddingHorizontal: 16,
    gap: 16,
  },
  sidebarCollapsed: {
    width: 96,
    paddingHorizontal: 12,
  },
  toggleButton: {
    backgroundColor: "#1f2933",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: "flex-end",
  },
  toggleText: {
    color: "#f2f2f2",
    fontSize: 16,
  },
  menuContainer: {
    flex: 1,
    gap: 12,
  },
  menuItem: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "transparent",
  },
  menuItemActive: {
    backgroundColor: "#243447",
  },
  menuText: {
    color: "#d6dee6",
    fontSize: 16,
    fontWeight: "600",
  },
  menuTextActive: {
    color: "#ffffff",
  },
  menuTextCollapsed: {
    textAlign: "center",
  },
  content: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
});

