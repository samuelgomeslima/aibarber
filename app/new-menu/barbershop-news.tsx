import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

const NEWS_ITEMS = [
  {
    title: "AI-driven grooming tips",
    description:
      "Share weekly AI-personalized grooming articles that your customers can read from any device.",
  },
  {
    title: "Launch new campaigns",
    description:
      "Coordinate marketing pushes, newsletter topics, and announcements before they go live.",
  },
  {
    title: "Track engagement",
    description:
      "Soon you will visualize reach, clicks, and bookings attributed to each content piece.",
  },
];

export default function BarbershopNews(): React.ReactElement {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.title}>Barbershop news</Text>
        <Text style={styles.subtitle}>
          Curate announcements, campaigns, and storytelling for the community around your shop.
        </Text>
        <Text style={styles.body}>
          While we finish migrating the legacy screens, this space helps us validate the navigation
          model and responsive behavior of the new collapsible menu. Use the options on the left to
          return to the existing dashboard whenever you need to manage daily operations.
        </Text>
      </View>
      <View style={styles.grid}>
        {NEWS_ITEMS.map((item) => (
          <View key={item.title} style={styles.gridCard}>
            <Text style={styles.gridTitle}>{item.title}</Text>
            <Text style={styles.gridBody}>{item.description}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 32,
    gap: 28,
  },
  headerCard: {
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  gridCard: {
    flexBasis: 280,
    flexGrow: 1,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  gridTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 10,
  },
  gridBody: {
    fontSize: 14,
    lineHeight: 20,
    color: "#4b5563",
  },
});
