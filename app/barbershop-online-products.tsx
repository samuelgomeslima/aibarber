import React from "react";
import { ScrollView, StyleSheet, Text, View, useColorScheme } from "react-native";

export default function BarbershopOnlineProducts(): React.ReactElement {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const backgroundColor = isDark ? "#0f0f0f" : "#f4f4f5";

  return (
    <ScrollView
      style={{ backgroundColor }}
      contentContainerStyle={[styles.container, { backgroundColor }]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: isDark ? "#f4f4f5" : "#18181b" }]}>Barbershop online products</Text>
        <Text style={[styles.subtitle, { color: isDark ? "#a1a1aa" : "#3f3f46" }]}>
          Centralize the catalog that will be available for online purchases and synchronize it
          with your in-store inventory.
        </Text>
      </View>
      <View
        style={[
          styles.body,
          {
            backgroundColor: isDark ? "#18181b" : "#ffffff",
            shadowOpacity: isDark ? 0 : 0.05,
            borderWidth: isDark ? StyleSheet.hairlineWidth : 0,
            borderColor: isDark ? "#27272a" : "transparent",
          },
        ]}
      >
        <Text style={[styles.bodyText, { color: isDark ? "#e4e4e7" : "#27272a" }]}>
          This area is under construction. Soon you will be able to manage highlighted products,
          promotional bundles, and fulfillment integrations for your e-commerce channels.
        </Text>
        <Text style={[styles.bodyText, { color: isDark ? "#e4e4e7" : "#27272a" }]}>
          For now, continue using the existing products section to manage inventory and pricing. We
          will migrate those workflows here as part of the upcoming refactor.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingVertical: 40,
    gap: 24,
  },
  header: {
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  body: {
    gap: 16,
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 22,
  },
});
