import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useRefactorMenuContext } from "../../components/refactor/RefactorMenuContext";

export function BarbershopNewsScreen(): React.ReactElement {
  const { colors } = useRefactorMenuContext();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
      <View style={[styles.header, { borderBottomColor: colors.border }]}> 
        <Ionicons name="megaphone-outline" size={20} color={colors.accent} />
        <Text style={[styles.title, { color: colors.text }]}>Barbershop news</Text>
      </View>
      <Text style={[styles.paragraph, { color: colors.subtext }]}> 
        Centralize communications about product updates, marketing pushes, and local community events. The collapsible layout
        ensures the newsroom stays accessible without overwhelming stylists focused on daily tasks.
      </Text>
      <Text style={[styles.paragraph, { color: colors.subtext }]}> 
        Future iterations can subscribe to Supabase feeds or CMS entries. TanStack Router keeps these explorations scoped so we can
        ship improvements incrementally.
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
