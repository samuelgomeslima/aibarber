import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

const NEWS_ITEMS = [
  {
    title: "Launch your digital shelves",
    description:
      "The upcoming release will let you connect promotions from the assistant directly to your storefront, so recommendations instantly become shoppable moments.",
  },
  {
    title: "Stay in sync with bookings",
    description:
      "Product availability and service bookings will soon share the same calendar, ensuring clients never see an out-of-stock upsell again.",
  },
  {
    title: "Early access program",
    description:
      "We are preparing a feedback cohort to test online product bundles and curated news sections. Keep an eye out for invites inside your dashboard.",
  },
];

export default function BarbershopNews(): React.ReactElement {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Barbershop news</Text>
        <Text style={styles.subtitle}>
          Follow the roadmap for the new online experience as we refactor the current app structure.
        </Text>
      </View>

      <View style={styles.list}>
        {NEWS_ITEMS.map((item) => (
          <View key={item.title} style={styles.newsCard}>
            <Text style={styles.newsTitle}>{item.title}</Text>
            <Text style={styles.newsDescription}>{item.description}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    gap: 24,
  },
  header: {
    gap: 12,
  },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    color: "#334155",
  },
  list: {
    gap: 16,
  },
  newsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 8,
  },
  newsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0f172a",
  },
  newsDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: "#475569",
  },
});
