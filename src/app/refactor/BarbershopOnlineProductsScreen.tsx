import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useRefactorMenuContext } from "../../components/refactor/RefactorMenuContext";

export function BarbershopOnlineProductsScreen(): React.ReactElement {
  const { colors } = useRefactorMenuContext();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
      <View style={[styles.header, { borderBottomColor: colors.border }]}> 
        <Ionicons name="bag-handle-outline" size={20} color={colors.accent} />
        <Text style={[styles.title, { color: colors.text }]}>Barbershop online products</Text>
      </View>
      <Text style={[styles.paragraph, { color: colors.subtext }]}> 
        Showcase curated inventory and launch targeted campaigns for your digital storefront. This new section is powered by
        TanStack Router so we can migrate existing commerce flows gradually without disrupting the current dashboard.
      </Text>
      <Text style={[styles.paragraph, { color: colors.subtext }]}> 
        Start planning the content architecture for subscriptions, featured bundles, and seasonal highlights. The router keeps
        navigation isolated, allowing the team to iterate on this experiment safely.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingBottom: 8,
    marginBottom: 4,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 20,
  },
});
