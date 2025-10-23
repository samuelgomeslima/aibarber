import React from "react";
import { StyleSheet, Text, View, useColorScheme } from "react-native";

export default function BarbershopOnlineProducts(): React.ReactElement {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const backgroundColor = isDarkMode ? "#0F172A" : "#F8FAFC";
  const titleColor = isDarkMode ? "#F8FAFC" : "#0F172A";
  const subtitleColor = isDarkMode ? "#CBD5F5" : "#475569";

  return (
    <View style={[styles.container, { backgroundColor }]}> 
      <Text style={[styles.title, { color: titleColor }]}>Barbershop online products</Text>
      <Text style={[styles.subtitle, { color: subtitleColor }]}>There are no products available yet.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
  },
});
