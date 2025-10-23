import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function BarbershopNews(): React.ReactElement {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Barbershop news</Text>
        <Text style={styles.description}>
          Share updates, campaigns, and announcements with your customers. This
          screen prepares the experience for future content tools that will live
          in the revamped navigation structure.
        </Text>
        <Text style={styles.helper}>
          Use this area to plan how news posts will integrate with the rest of
          the dashboard once the migration is complete.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: "#f5f7fa",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: "#374151",
    lineHeight: 24,
    marginBottom: 8,
  },
  helper: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 8,
  },
});
