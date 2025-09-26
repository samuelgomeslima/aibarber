// src/components/BarberSelector.tsx
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { BARBERS, type Barber as DomainBarber } from "../lib/domain";

export type Barber = DomainBarber;

type Props = {
  selected: Barber;
  onChange: (b: Barber) => void;
  /** novo */
  disabled?: boolean;
};

export default function BarberSelector({ selected, onChange, disabled = false }: Props) {
  return (
    <View
      style={[
        styles.row,
        disabled && { opacity: 0.6 },
      ]}
      // Quando desabilitado, não deixa clicar
      pointerEvents={disabled ? "none" : "auto"}
    >
      {BARBERS.map((b) => {
        const active = b.id === selected.id;
        return (
          <Pressable
            key={b.id}
            onPress={() => onChange(b)}
            style={[styles.card, active && styles.cardActive]}
          >
            <MaterialCommunityIcons
              name={b.icon}
              size={18}
              color={active ? "#091016" : "#cbd5e1"}
            />
            <Text style={[styles.name, active && styles.nameActive]}>{b.name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    backgroundColor: "rgba(255,255,255,0.045)",
  },
  cardActive: {
    backgroundColor: "#60a5fa",
    borderColor: "#60a5fa",
  },
  name: {
    color: "#cbd5e1",
    fontWeight: "800",
  },
  nameActive: {
    color: "#091016",
  },
});
