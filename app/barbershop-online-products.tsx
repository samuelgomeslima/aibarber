import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

const FEATURED_PRODUCTS = [
  {
    id: "bundle",
    title: "Seasonal grooming bundle",
    description: "Curated kits with the best-selling pomades, oils, and aftershaves.",
  },
  {
    id: "subscription",
    title: "Monthly beard care subscription",
    description: "Recurring deliveries to keep loyal customers stocked year-round.",
  },
  {
    id: "merch",
    title: "Barbershop merch",
    description: "Caps, tees, and accessories designed to extend your brand beyond the chair.",
  },
];

const ONLINE_CHANNELS = [
  "Marketplace integrations",
  "Direct-to-consumer storefront",
  "Social commerce campaigns",
];

export default function BarbershopOnlineProducts(): React.ReactElement {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Barbershop online products</Text>
      <Text style={styles.lead}>
        Experiment with digital shelves without disrupting the daily operations dashboard. Use this
        area to prototype ecommerce journeys before migrating them into the main navigation.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Focus areas</Text>
        {ONLINE_CHANNELS.map((channel) => (
          <View key={channel} style={styles.card}>
            <Text style={styles.cardTitle}>{channel}</Text>
            <Text style={styles.cardDescription}>
              Explore how {channel.toLowerCase()} can extend in-person product sales with unified
              inventory and analytics.
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Featured concepts</Text>
        {FEATURED_PRODUCTS.map((product) => (
          <View key={product.id} style={styles.card}>
            <Text style={styles.cardTitle}>{product.title}</Text>
            <Text style={styles.cardDescription}>{product.description}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingVertical: 40,
    paddingHorizontal: 32,
    gap: 24,
    backgroundColor: "#0B0F1A",
  },
  header: {
    fontSize: 28,
    fontWeight: "700",
    color: "#F8F9FF",
  },
  lead: {
    fontSize: 16,
    lineHeight: 22,
    color: "#B9C2D8",
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#F1F4FF",
  },
  card: {
    backgroundColor: "#131A2C",
    borderRadius: 16,
    padding: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: "#1F2B47",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F8F9FF",
  },
  cardDescription: {
    fontSize: 15,
    lineHeight: 20,
    color: "#A7B4CE",
  },
});
