import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useRefactorMenuContext } from "../../components/refactor/RefactorMenuContext";

export function RefactorWelcomeScreen(): React.ReactElement {
  const { colors } = useRefactorMenuContext();

  return (
    <View style={[styles.container, { borderColor: colors.border, backgroundColor: colors.surface }]}> 
      <Text style={[styles.title, { color: colors.text }]}>Select an experimental page</Text>
      <Text style={[styles.description, { color: colors.subtext }]}> 
        Use the collapsible menu to preview new experiences we are building with TanStack Router. This area will host the
        refactored navigation as existing screens migrate over time.
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
  title: {
    fontSize: 18,
    fontWeight: "800",
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
});
