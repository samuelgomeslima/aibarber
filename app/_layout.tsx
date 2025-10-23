import React, { useMemo, useState } from "react";
import { Slot, Link, usePathname } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AuthGate } from "../src/components/AuthGate";

type NavigationItem = {
  href: string;
  label: string;
};

const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    href: "/barbershop-online-products",
    label: "Barbershop online products",
  },
  {
    href: "/barbershop-news",
    label: "Barbershop news",
  },
];

export default function RootLayout(): React.ReactElement {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const items = useMemo(
    () =>
      NAVIGATION_ITEMS.map((item) => ({
        ...item,
        isActive:
          pathname === item.href ||
          (!!pathname && pathname.startsWith(`${item.href}/`)),
      })),
    [pathname],
  );

  return (
    <AuthGate>
      <View style={styles.container}>
        <View style={[styles.sidebar, isCollapsed && styles.sidebarCollapsed]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              isCollapsed ? "Open auxiliary navigation menu" : "Close auxiliary navigation menu"
            }
            onPress={() => setIsCollapsed((prev) => !prev)}
            style={styles.toggleButton}
          >
            <Text style={styles.toggleButtonText}>{
              isCollapsed ? "☰" : "⨯"
            }</Text>
          </Pressable>
          {!isCollapsed && (
            <View style={styles.navigationContainer}>
              <Text style={styles.navigationHeader}>Explore</Text>
              {items.map((item) => (
                <Link key={item.href} href={item.href} asChild>
                  <Pressable
                    accessibilityRole="button"
                    style={[styles.navigationItem, item.isActive && styles.navigationItemActive]}
                  >
                    <Text
                      style={[styles.navigationText, item.isActive && styles.navigationTextActive]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                </Link>
              ))}
            </View>
          )}
        </View>
        <View style={styles.content}>
          <Slot />
        </View>
      </View>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#f6f6f6",
  },
  sidebar: {
    width: 260,
    backgroundColor: "#ffffff",
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: "#e0e0e0",
    paddingTop: 16,
    paddingHorizontal: 12,
  },
  sidebarCollapsed: {
    width: 54,
    paddingHorizontal: 0,
    alignItems: "center",
  },
  toggleButton: {
    alignSelf: "flex-end",
    borderRadius: 20,
    height: 36,
    width: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f0f0",
  },
  toggleButtonText: {
    fontSize: 18,
    fontWeight: "600",
  },
  navigationContainer: {
    marginTop: 24,
  },
  navigationHeader: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555555",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  navigationItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  navigationItemActive: {
    backgroundColor: "#0a7cff10",
  },
  navigationText: {
    fontSize: 15,
    color: "#222222",
  },
  navigationTextActive: {
    fontWeight: "600",
    color: "#0a7cff",
  },
  content: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
});
