// src/components/BarberSelector.tsx
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export type Barber = {
  id: string;
  name: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
};

const BARBERS: Barber[] = [
  { id: "joao", name: "João", icon: "account" },
  { id: "maria", name: "Maria", icon: "account-outline" },
  { id: "carlos", name: "Carlos", icon: "account-tie" },
];

export default function BarberSelector({
  selected,
  onChange,
}: {
  selected: Barber;
  onChange: (b: Barber) => void;
}) {
  return (
    <View style={styles.row}>
      {BARBERS.map((b) => {
        const active = selected.id === b.id;
        return (
          <Pressable
            key={b.id}
            onPress={() => onChange(b)}
            style={[styles.card, active && styles.activeCard]}
          >
            <MaterialCommunityIcons
              name={b.icon}
              size={20}
              color={active ? "#0b0d13" : "#cbd5e1"}
            />
            <Text style={[styles.text, active && styles.activeText]}>
              {b.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 12,
    marginBottom: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  activeCard: {
    backgroundColor: "#60a5fa",
    borderColor: "#60a5fa",
  },
  text: { color: "#cbd5e1", fontWeight: "600" },
  activeText: { color: "#0b0d13", fontWeight: "700" },
});
