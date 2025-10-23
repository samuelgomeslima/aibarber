import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function BarbershopOnlineProducts(): React.ReactElement {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Barbershop Online Products</Text>
      <Text style={styles.subtitle}>
        Manage your digital storefront, update featured products, and curate promotions
        for your clients.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Coming Soon</Text>
        <Text style={styles.cardBody}>
          This space will host tools to publish new items, update inventory, and track
          online performance metrics. For now, use the classic Products section while we
          build the full experience here.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#101820",
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: "#4b5563",
  },
  card: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 20,
    borderColor: "#e2e8f0",
    borderWidth: 1,
    gap: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
  },
  cardBody: {
    fontSize: 16,
    lineHeight: 22,
    color: "#475569",
  },
});

