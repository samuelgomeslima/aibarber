import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

interface Props {
  title: string;
  description?: string;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
  },
});

export default function TeamPage({ title, description }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
    </ScrollView>
  );
}
