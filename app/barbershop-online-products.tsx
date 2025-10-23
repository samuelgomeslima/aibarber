import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function BarbershopOnlineProducts(): React.ReactElement {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Barbershop online products</Text>
        <Text style={styles.description}>
          Organize the catalog that will appear in the online experience of your
          barbershop. This is a placeholder space for upcoming product management
          tools that will live in the new navigation menu.
        </Text>
        <Text style={styles.helper}>
          We will migrate additional controls to this page as part of the
          refactoring roadmap.
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
