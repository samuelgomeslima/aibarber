import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import type { Service } from "../lib/domain";
import { createService } from "../lib/services";

const DEFAULT_COLORS = {
  text: "#e5e7eb",
  subtext: "#cbd5e1",
  border: "rgba(255,255,255,0.12)",
  surface: "rgba(255,255,255,0.06)",
  accent: "#60a5fa",
  accentFgOn: "#091016",
  danger: "#ef4444",
};

type Props = {
  onCreated?: (service: Service) => void;
  colors?: typeof DEFAULT_COLORS;
};

export default function ServiceForm({ onCreated, colors = DEFAULT_COLORS }: Props) {
  const [name, setName] = useState("");
  const [minutesText, setMinutesText] = useState("30");
  const [priceText, setPriceText] = useState("30.00");
  const [iconName, setIconName] = useState("content-cut");
  const [saving, setSaving] = useState(false);

  const minutes = useMemo(() => {
    const numeric = Number(minutesText);
    return Number.isFinite(numeric) ? Math.round(numeric) : NaN;
  }, [minutesText]);

  const priceCents = useMemo(() => parsePrice(priceText), [priceText]);
  const iconValid = useMemo(() => !!MaterialCommunityIcons.glyphMap[iconName as keyof typeof MaterialCommunityIcons.glyphMap], [iconName]);

  const errors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required";
    if (!Number.isFinite(minutes) || minutes <= 0) errs.minutes = "Enter minutes > 0";
    if (!Number.isFinite(priceCents) || priceCents < 0) errs.price = "Enter a valid price";
    if (!iconValid) errs.icon = "Unknown icon";
    return errs;
  }, [name, minutes, priceCents, iconValid]);

  const valid = Object.keys(errors).length === 0 && !saving;

  const handleSubmit = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      const created = await createService({
        name: name.trim(),
        estimated_minutes: minutes,
        price_cents: priceCents,
        icon: iconName as keyof typeof MaterialCommunityIcons.glyphMap,
      });
      Alert.alert("Service created", `${created.name} (${created.estimated_minutes} min)`);
      setName("");
      setMinutesText("30");
      setPriceText("30.00");
      setIconName("content-cut");
      onCreated?.(created);
    } catch (err: any) {
      Alert.alert("Create service failed", err?.message ?? String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.text }]}>Register a service</Text>
      <Text style={[styles.subtitle, { color: colors.subtext }]}>Services define the duration and price of each booking.</Text>

      <FormField
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="Cut & Style"
        error={errors.name}
        colors={colors}
      />

      <View style={styles.row}>
        <FormField
          label="Duration (minutes)"
          value={minutesText}
          onChangeText={(text) => setMinutesText(text.replace(/[^0-9]/g, ""))}
          keyboardType="number-pad"
          placeholder="45"
          error={errors.minutes}
          colors={colors}
          style={{ flex: 1 }}
        />
        <FormField
          label="Price"
          value={priceText}
          onChangeText={(text) => setPriceText(text.replace(/[^0-9.,]/g, ""))}
          keyboardType="decimal-pad"
          placeholder="30.00"
          error={errors.price}
          colors={colors}
          style={{ flex: 1 }}
        />
      </View>

      <FormField
        label="Icon (MaterialCommunityIcons)"
        value={iconName}
        onChangeText={(text) => setIconName(text.trim())}
        autoCapitalize="none"
        placeholder="content-cut"
        error={errors.icon}
        colors={colors}
      />

      <View style={styles.iconPreview}>
        <Text style={[styles.previewLabel, { color: colors.subtext }]}>Preview:</Text>
        <MaterialCommunityIcons
          name={(iconValid ? iconName : "help-circle") as keyof typeof MaterialCommunityIcons.glyphMap}
          size={26}
          color={iconValid ? colors.accent : colors.danger}
        />
      </View>

      <Pressable
        onPress={handleSubmit}
        disabled={!valid}
        style={[
          styles.button,
          {
            backgroundColor: valid ? colors.accent : "rgba(255,255,255,0.08)",
            borderColor: valid ? colors.accent : colors.border,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Create service"
      >
        <Text style={[styles.buttonText, { color: valid ? colors.accentFgOn : colors.subtext }]}>
          {saving ? "Saving…" : "Create service"}
        </Text>
      </Pressable>
    </View>
  );
}

function FormField({ label, error, colors, style, ...rest }: {
  label: string;
  error?: string;
  colors: typeof DEFAULT_COLORS;
  style?: any;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={[{ marginBottom: 12 }, style]}>
      <Text style={[styles.label, { color: colors.subtext }]}>{label}</Text>
      <TextInput
        {...rest}
        placeholderTextColor="#94a3b8"
        style={[styles.input, { borderColor: error ? colors.danger : colors.border, color: colors.text }]}
      />
      {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

function parsePrice(input: string): number {
  if (!input) return NaN;
  const normalized = input.replace(/[^0-9.,]/g, "").replace(/,/g, ".");
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value)) return NaN;
  return Math.round(value * 100);
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  title: { fontSize: 18, fontWeight: "800" },
  subtitle: { fontSize: 13, fontWeight: "600" },
  row: { flexDirection: "row", gap: 12 },
  label: { fontSize: 12, fontWeight: "700", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: "700",
    backgroundColor: "rgba(15,23,42,0.35)",
  },
  errorText: { marginTop: 4, fontSize: 12, fontWeight: "700" },
  iconPreview: { flexDirection: "row", alignItems: "center", gap: 10 },
  previewLabel: { fontSize: 12, fontWeight: "700" },
  button: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: { fontSize: 14, fontWeight: "800" },
});
