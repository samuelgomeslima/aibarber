import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

export default function BarbershopOnlineProducts(): React.ReactElement {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Barbershop online products</Text>
        <Text style={styles.subtitle}>
          Centralize the digital products that keep your barbershop in the spotlight.
        </Text>
        <Text style={styles.body}>
          This page is the first step in migrating the AIBarber dashboard to the new Expo Router
          layout. Here you will orchestrate catalog curation, integrations with ecommerce tools,
          and upcoming automations. For now it serves as a placeholder so we can progressively
          onboard existing workflows without disrupting the current experience.
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>What comes next?</Text>
        <Text style={styles.body}>
          In the next iterations we will plug real datasets, expose synchronization statuses, and
          allow product managers to configure availability and pricing directly inside this view.
          Because the new menu lives alongside the current application, you can explore the future
          navigation without losing access to today&apos;s tools.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 32,
    gap: 24,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 16,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: "#4b5563",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 12,
  },
});
