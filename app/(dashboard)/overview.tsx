import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function DashboardHome(): React.ReactElement {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Welcome to the Refined Workspace</Text>
      <Text style={styles.subtitle}>
        Explore the first modules of the new navigation system. Existing features now sit
        inside the Operations area so you can continue running the barbershop while we
        incrementally move experiences into this layout.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>What&apos;s New?</Text>
        <Text style={styles.cardBody}>
          Use the sidebar to jump between the Operations hub, Online Products, and News
          sections. The collapsible menu keeps focus on the task at hand while providing
          quick access to future modules as they arrive.
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

