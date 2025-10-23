import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

const FEATURED_PRODUCTS = [
  {
    id: "kits",
    title: "Curated grooming kits",
    description:
      "Bundle clippers, styling products, and aftercare essentials to create irresistible online offers.",
  },
  {
    id: "subscriptions",
    title: "Subscription refills",
    description:
      "Automate recurring deliveries for beard oil, shampoo, and pomades so loyal clients never run out.",
  },
  {
    id: "limited",
    title: "Limited seasonal drops",
    description:
      "Highlight exclusive drops to create urgency and keep the digital storefront feeling fresh.",
  },
];

export function BarbershopOnlineProductsRoute(): React.ReactElement {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Barbershop online products</Text>
        <Text style={styles.subtitle}>
          Craft the upcoming e-commerce experience. Curate product bundles, subscriptions, and highlight
          promotions while we prepare the full migration to the new router.
        </Text>
      </View>
      <View style={styles.cardGrid}>
        {FEATURED_PRODUCTS.map((product) => (
          <View key={product.id} style={styles.card}>
            <Text style={styles.cardTitle}>{product.title}</Text>
            <Text style={styles.cardDescription}>{product.description}</Text>
          </View>
        ))}
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerTitle}>Coming up next</Text>
        <Text style={styles.footerDescription}>
          This page will soon connect to live catalog data and checkout flows. The new TanStack router layout
          keeps it side-by-side with the current dashboard, easing the upcoming refactor.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 32,
    gap: 32,
    backgroundColor: "#0b1120",
  },
  header: {
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#f8fafc",
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    color: "#cbd5f5",
  },
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
  },
  card: {
    flexBasis: "45%",
    minWidth: 240,
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1f2937",
    gap: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f1f5f9",
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: "#cbd5f5",
  },
  footer: {
    gap: 8,
    padding: 20,
    borderRadius: 12,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  footerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f8fafc",
  },
  footerDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: "#cbd5f5",
  },
});

export default BarbershopOnlineProductsRoute;
