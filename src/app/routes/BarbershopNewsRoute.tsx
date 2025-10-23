import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

const NEWS_ITEMS = [
  {
    id: "ai-consults",
    headline: "AI consultations expanding",
    body:
      "Soon, stylists will be able to launch AI-driven consultations that pull customer history and preferences into each booking.",
  },
  {
    id: "inventory-sync",
    headline: "Inventory sync beta",
    body:
      "The inventory team is integrating supplier feeds so online sales and in-shop stock always match in real time.",
  },
  {
    id: "community",
    headline: "Community spotlight",
    body:
      "Share barbershop stories from around the world. The newsroom will surface top stories directly inside the dashboard.",
  },
];

export function BarbershopNewsRoute(): React.ReactElement {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>What's new</Text>
        <Text style={styles.heroTitle}>Barbershop news</Text>
        <Text style={styles.heroSubtitle}>
          Track product releases, platform updates, and community highlights without leaving the workspace.
        </Text>
      </View>
      <View style={styles.newsList}>
        {NEWS_ITEMS.map((item) => (
          <View key={item.id} style={styles.newsCard}>
            <Text style={styles.newsHeadline}>{item.headline}</Text>
            <Text style={styles.newsBody}>{item.body}</Text>
          </View>
        ))}
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerHeading}>Stay tuned</Text>
        <Text style={styles.footerCopy}>
          This lightweight newsroom lives inside the TanStack router space. We'll gradually migrate the legacy
          dashboard panels here as the refactor evolves.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 32,
    gap: 28,
    backgroundColor: "#0f172a",
  },
  hero: {
    gap: 10,
  },
  heroEyebrow: {
    color: "#38bdf8",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#f8fafc",
  },
  heroSubtitle: {
    color: "#cbd5f5",
    fontSize: 16,
    lineHeight: 22,
  },
  newsList: {
    gap: 16,
  },
  newsCard: {
    backgroundColor: "#111c36",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1d2845",
    gap: 8,
  },
  newsHeadline: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f1f5f9",
  },
  newsBody: {
    fontSize: 14,
    lineHeight: 20,
    color: "#cbd5f5",
  },
  footer: {
    backgroundColor: "#0b1120",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#1d2845",
    gap: 8,
  },
  footerHeading: {
    fontSize: 16,
    fontWeight: "700",
    color: "#f8fafc",
  },
  footerCopy: {
    fontSize: 14,
    lineHeight: 20,
    color: "#cbd5f5",
  },
});

export default BarbershopNewsRoute;
