import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function BarbershopNews(): React.ReactElement {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Barbershop News</Text>
      <Text style={styles.subtitle}>
        Centralize marketing updates, social highlights, and community announcements for
        your team.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Latest Updates</Text>
        <Text style={styles.cardBody}>
          We&apos;re preparing a newsroom experience with scheduled posts, announcement
          templates, and performance insights. Keep using your existing communication
          workflows while we bring those capabilities into this unified hub.
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

