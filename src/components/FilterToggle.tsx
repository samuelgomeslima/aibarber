import React, { useState } from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type Props = {
  children: React.ReactNode;
  initiallyOpen?: boolean;
  showLabel: string;
  hideLabel: string;
  colors: {
    text: string;
    subtext: string;
    border: string;
    surface: string;
    accent: string;
    accentFgOn: string;
  };
};

export default function FilterToggle({
  children,
  initiallyOpen = false,
  showLabel,
  hideLabel,
  colors,
}: Props) {
  const [open, setOpen] = useState(initiallyOpen);

  const toggle = () => {
    setOpen((prev) => !prev);
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={toggle}
        style={[styles.button, { borderColor: colors.border, backgroundColor: colors.surface }]}
        accessibilityRole="button"
        accessibilityLabel={open ? hideLabel : showLabel}
      >
        <MaterialCommunityIcons
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.subtext}
        />
        <Text style={[styles.buttonText, { color: colors.text }]}>{open ? hideLabel : showLabel}</Text>
      </Pressable>
      {open ? <View style={styles.content}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  button: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  buttonText: {
    fontWeight: "700",
    fontSize: 14,
  },
  content: {
    gap: 12,
  },
});
