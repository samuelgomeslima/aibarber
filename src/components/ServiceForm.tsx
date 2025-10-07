import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import type { Service } from "../lib/domain";
import { createService, updateService } from "../lib/services";

const DEFAULT_COLORS = {
  text: "#e5e7eb",
  subtext: "#cbd5e1",
  border: "rgba(255,255,255,0.12)",
  surface: "rgba(255,255,255,0.06)",
  accent: "#60a5fa",
  accentFgOn: "#091016",
  danger: "#ef4444",
};

type ServiceFormCopy = {
  createTitle: string;
  editTitle: string;
  createSubtitle: string;
  editSubtitle: string;
  fields: {
    nameLabel: string;
    namePlaceholder: string;
    nameError: string;
    durationLabel: string;
    durationPlaceholder: string;
    durationError: string;
    priceLabel: string;
    pricePlaceholder: string;
    priceError: string;
    iconLabel: string;
    iconPlaceholder: string;
    iconError: string;
    previewLabel: string;
  };
  buttons: {
    create: string;
    edit: string;
    saving: string;
    cancel: string;
  };
  accessibility: {
    submitCreate: string;
    submitEdit: string;
    cancel: string;
  };
  alerts: {
    createdTitle: string;
    createdMessage: (name: string, minutes: number) => string;
    updatedTitle: string;
    updatedMessage: (name: string, minutes: number) => string;
    createErrorTitle: string;
    updateErrorTitle: string;
  };
};

const DEFAULT_COPY: ServiceFormCopy = {
  createTitle: "Register a service",
  editTitle: "Edit service",
  createSubtitle: "Services define the duration and price of each booking.",
  editSubtitle: "Adjust the duration, price, or icon for this service.",
  fields: {
    nameLabel: "Name",
    namePlaceholder: "Cut & Style",
    nameError: "Name is required",
    durationLabel: "Duration (minutes)",
    durationPlaceholder: "45",
    durationError: "Enter minutes > 0",
    priceLabel: "Price",
    pricePlaceholder: "30.00",
    priceError: "Enter a valid price",
    iconLabel: "Icon (MaterialCommunityIcons)",
    iconPlaceholder: "content-cut",
    iconError: "Unknown icon",
    previewLabel: "Preview:",
  },
  buttons: {
    create: "Create service",
    edit: "Save changes",
    saving: "Saving…",
    cancel: "Cancel",
  },
  accessibility: {
    submitCreate: "Create service",
    submitEdit: "Save service changes",
    cancel: "Cancel service form",
  },
  alerts: {
    createdTitle: "Service created",
    createdMessage: (name: string, minutes: number) => `${name} (${minutes} min)`,
    updatedTitle: "Service updated",
    updatedMessage: (name: string, minutes: number) => `${name} (${minutes} min)`,
    createErrorTitle: "Create service failed",
    updateErrorTitle: "Update service failed",
  },
};

type Props = {
  mode?: "create" | "edit";
  service?: Service | null;
  onCreated?: (service: Service) => void;
  onUpdated?: (service: Service) => void;
  onCancel?: () => void;
  colors?: typeof DEFAULT_COLORS;
  copy?: ServiceFormCopy;
};

export default function ServiceForm({
  mode = "create",
  service = null,
  onCreated,
  onUpdated,
  onCancel,
  colors = DEFAULT_COLORS,
  copy = DEFAULT_COPY,
}: Props) {
  const isEditMode = mode === "edit";

  const [name, setName] = useState(() => (isEditMode && service ? service.name : ""));
  const [minutesText, setMinutesText] = useState(() =>
    isEditMode && service
      ? String(service.estimated_minutes)
      : copy.fields.durationPlaceholder.replace(/[^0-9]/g, ""),
  );
  const [priceText, setPriceText] = useState(() =>
    isEditMode && service
      ? centsToInput(service.price_cents)
      : copy.fields.pricePlaceholder.replace(/[^0-9.,]/g, ""),
  );
  const [iconName, setIconName] = useState(() => (isEditMode && service ? service.icon : "content-cut"));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEditMode && service) {
      setName(service.name);
      setMinutesText(String(service.estimated_minutes));
      setPriceText(centsToInput(service.price_cents));
      setIconName(service.icon);
    } else if (!isEditMode) {
      setName("");
      setMinutesText(copy.fields.durationPlaceholder.replace(/[^0-9]/g, ""));
      setPriceText(copy.fields.pricePlaceholder.replace(/[^0-9.,]/g, ""));
      setIconName("content-cut");
    }
  }, [copy.fields.durationPlaceholder, copy.fields.pricePlaceholder, isEditMode, service]);

  const minutes = useMemo(() => {
    const numeric = Number(minutesText);
    return Number.isFinite(numeric) ? Math.round(numeric) : NaN;
  }, [minutesText]);

  const priceCents = useMemo(() => parsePrice(priceText), [priceText]);
  const iconValid = useMemo(() => !!MaterialCommunityIcons.glyphMap[iconName as keyof typeof MaterialCommunityIcons.glyphMap], [
    iconName,
  ]);

  const errors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = copy.fields.nameError;
    if (!Number.isFinite(minutes) || minutes <= 0) errs.minutes = copy.fields.durationError;
    if (!Number.isFinite(priceCents) || priceCents < 0) errs.price = copy.fields.priceError;
    if (!iconValid) errs.icon = copy.fields.iconError;
    return errs;
  }, [
    copy.fields.durationError,
    copy.fields.iconError,
    copy.fields.nameError,
    copy.fields.priceError,
    iconValid,
    minutes,
    name,
    priceCents,
  ]);

  const valid = Object.keys(errors).length === 0 && !saving && (!isEditMode || !!service);

  const handleSubmit = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      if (isEditMode && service) {
        const updated = await updateService(service.id, {
          name: name.trim(),
          estimated_minutes: minutes,
          price_cents: priceCents,
          icon: iconName as keyof typeof MaterialCommunityIcons.glyphMap,
        });
        Alert.alert(
          copy.alerts.updatedTitle,
          copy.alerts.updatedMessage(updated.name, updated.estimated_minutes),
        );
        setName(updated.name);
        setMinutesText(String(updated.estimated_minutes));
        setPriceText(centsToInput(updated.price_cents));
        setIconName(updated.icon);
        onUpdated?.(updated);
      } else {
        const created = await createService({
          name: name.trim(),
          estimated_minutes: minutes,
          price_cents: priceCents,
          icon: iconName as keyof typeof MaterialCommunityIcons.glyphMap,
        });
        Alert.alert(
          copy.alerts.createdTitle,
          copy.alerts.createdMessage(created.name, created.estimated_minutes),
        );
        setName("");
        setMinutesText(copy.fields.durationPlaceholder.replace(/[^0-9]/g, ""));
        setPriceText(copy.fields.pricePlaceholder.replace(/[^0-9.,]/g, ""));
        setIconName("content-cut");
        onCreated?.(created);
      }
    } catch (err: any) {
      Alert.alert(
        isEditMode ? copy.alerts.updateErrorTitle : copy.alerts.createErrorTitle,
        err?.message ?? String(err),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        {isEditMode ? copy.editTitle : copy.createTitle}
      </Text>
      <Text style={[styles.subtitle, { color: colors.subtext }]}>
        {isEditMode ? copy.editSubtitle : copy.createSubtitle}
      </Text>

      <FormField
        label={copy.fields.nameLabel}
        value={name}
        onChangeText={setName}
        placeholder={copy.fields.namePlaceholder}
        error={errors.name}
        colors={colors}
      />

      <View style={styles.row}>
        <FormField
          label={copy.fields.durationLabel}
          value={minutesText}
          onChangeText={(text) => setMinutesText(text.replace(/[^0-9]/g, ""))}
          keyboardType="number-pad"
          placeholder={copy.fields.durationPlaceholder}
          error={errors.minutes}
          colors={colors}
          style={{ flex: 1 }}
        />
        <FormField
          label={copy.fields.priceLabel}
          value={priceText}
          onChangeText={(text) => setPriceText(text.replace(/[^0-9.,]/g, ""))}
          keyboardType="decimal-pad"
          placeholder={copy.fields.pricePlaceholder}
          error={errors.price}
          colors={colors}
          style={{ flex: 1 }}
        />
      </View>

      <FormField
        label={copy.fields.iconLabel}
        value={iconName}
        onChangeText={(text) => setIconName(text.trim())}
        autoCapitalize="none"
        placeholder={copy.fields.iconPlaceholder}
        error={errors.icon}
        colors={colors}
      />

      <View style={styles.iconPreview}>
        <Text style={[styles.previewLabel, { color: colors.subtext }]}>{copy.fields.previewLabel}</Text>
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
        accessibilityLabel={isEditMode ? copy.accessibility.submitEdit : copy.accessibility.submitCreate}
      >
        <Text style={[styles.buttonText, { color: valid ? colors.accentFgOn : colors.subtext }]}>
          {saving
            ? copy.buttons.saving
            : isEditMode
              ? copy.buttons.edit
              : copy.buttons.create}
        </Text>
      </Pressable>

      {onCancel ? (
        <Pressable
          onPress={() => {
            if (!saving) onCancel();
          }}
          style={[styles.secondaryButton, { borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel={copy.accessibility.cancel}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.subtext }]}>{copy.buttons.cancel}</Text>
        </Pressable>
      ) : null}
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

function centsToInput(cents: number) {
  if (!Number.isFinite(cents)) return "0.00";
  return (Math.round(cents) / 100).toFixed(2);
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
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryButtonText: { fontSize: 13, fontWeight: "800" },
});
