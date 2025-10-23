import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function BarbershopOnlineProducts(): React.ReactElement {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Barbershop online products</Text>
        <Text style={styles.subtitle}>
          Configure and promote the digital catalog that your customers will see when booking
          appointments online.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardHeading}>Start with your storefront</Text>
        <Text style={styles.cardBody}>
          Add hero images, featured collections, and highlight limited editions. This space will
          evolve to host management tools that connect directly with your existing inventory.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardHeading}>Plan future integrations</Text>
        <Text style={styles.cardBody}>
          When the refactor is complete, expect integrations with marketing automations, product
          availability tracking, and unified checkout options.
        </Text>
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
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 12,
  },
  cardHeading: {
    fontSize: 20,
    fontWeight: "600",
    color: "#0f172a",
  },
  cardBody: {
    fontSize: 15,
    lineHeight: 22,
    color: "#475569",
  },
});
