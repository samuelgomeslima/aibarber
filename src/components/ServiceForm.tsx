import React, { useCallback } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, Modal, ScrollView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import type { Service } from "../lib/domain";
import { useServiceForm } from "../hooks/useServiceForm";

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
    iconLabel: "Icon",
    iconPlaceholder: "Choose an icon",
    iconError: "Select an icon",
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
  const {
    isEditMode,
    name,
    setName,
    minutesText,
    handleMinutesChange,
    priceText,
    handlePriceChange,
    iconName,
    selectIcon,
    iconPickerVisible,
    showIconPicker,
    hideIconPicker,
    iconSearch,
    setIconSearch,
    filteredIcons,
    iconValid,
    errors,
    valid,
    saving,
    submit,
  } = useServiceForm({
    mode,
    service,
    copy,
    onCreated,
    onUpdated,
  });

  const handleSubmit = useCallback(async () => {
    try {
      const result = await submit();
      if (!result || result.status === "invalid" || !result.service) {
        return;
      }

      if (result.status === "created") {
        Alert.alert(
          copy.alerts.createdTitle,
          copy.alerts.createdMessage(result.service.name, result.service.estimated_minutes),
        );
      } else if (result.status === "updated") {
        Alert.alert(
          copy.alerts.updatedTitle,
          copy.alerts.updatedMessage(result.service.name, result.service.estimated_minutes),
        );
      }
    } catch (err: any) {
      Alert.alert(
        isEditMode ? copy.alerts.updateErrorTitle : copy.alerts.createErrorTitle,
        err?.message ?? String(err),
      );
    }
  }, [copy.alerts, isEditMode, submit]);

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
          onChangeText={handleMinutesChange}
          keyboardType="number-pad"
          placeholder={copy.fields.durationPlaceholder}
          error={errors.minutes}
          colors={colors}
          style={{ flex: 1 }}
        />
        <FormField
          label={copy.fields.priceLabel}
          value={priceText}
          onChangeText={handlePriceChange}
          keyboardType="decimal-pad"
          placeholder={copy.fields.pricePlaceholder}
          error={errors.price}
          colors={colors}
          style={{ flex: 1 }}
        />
      </View>

      <View>
        <Text style={[styles.label, { color: colors.subtext }]}>{copy.fields.iconLabel}</Text>
        <Pressable
          onPress={showIconPicker}
          style={[
            styles.iconSelector,
            {
              borderColor: errors.icon ? colors.danger : colors.border,
              backgroundColor: "rgba(15,23,42,0.35)",
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={copy.fields.iconLabel}
        >
          <View style={styles.iconSelectorContent}>
            <MaterialCommunityIcons
              name={(iconValid ? iconName : "help-circle") as keyof typeof MaterialCommunityIcons.glyphMap}
              size={22}
              color={iconValid ? colors.accent : colors.danger}
            />
            <Text style={[styles.iconSelectorText, { color: colors.text }]} numberOfLines={1}>
              {iconValid ? iconName : copy.fields.iconPlaceholder}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-down" size={20} color={colors.subtext} />
        </Pressable>
        {errors.icon ? <Text style={[styles.errorText, { color: colors.danger }]}>{errors.icon}</Text> : null}
      </View>

      <Modal
        transparent
        visible={iconPickerVisible}
        animationType="fade"
        onRequestClose={hideIconPicker}
      >
        <View style={styles.iconModalBackdrop}>
          <View style={[styles.iconModalCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.iconModalTitle, { color: colors.text }]}>{copy.fields.iconLabel}</Text>
            <Text style={[styles.iconModalSubtitle, { color: colors.subtext }]}>{copy.fields.iconPlaceholder}</Text>
            <TextInput
              value={iconSearch}
              onChangeText={setIconSearch}
              placeholder="Search icons"
              placeholderTextColor="#94a3b8"
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              autoCapitalize="none"
            />
            <ScrollView style={{ maxHeight: 320 }}>
              <View style={styles.iconGrid}>
                {filteredIcons.map((option) => {
                  const selected = option === iconName;
                  return (
                    <Pressable
                      key={option}
                      onPress={() => selectIcon(option)}
                      style={[
                        styles.iconOption,
                        {
                          borderColor: selected ? colors.accent : colors.border,
                          backgroundColor: selected ? "rgba(96,165,250,0.15)" : "transparent",
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={option}
                    >
                      <MaterialCommunityIcons name={option} size={24} color={colors.text} />
                      <Text style={[styles.iconOptionLabel, { color: colors.subtext }]} numberOfLines={1}>
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
            <Pressable
              onPress={hideIconPicker}
              style={[styles.iconCloseButton, { borderColor: colors.border }]}
              accessibilityRole="button"
              accessibilityLabel={copy.buttons.cancel}
            >
              <Text style={[styles.iconCloseText, { color: colors.subtext }]}>{copy.buttons.cancel}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

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
  iconSelector: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  iconSelectorContent: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  iconSelectorText: { fontSize: 14, fontWeight: "700", flexShrink: 1 },
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
  iconModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 20,
  },
  iconModalCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  iconModalTitle: { fontSize: 18, fontWeight: "800" },
  iconModalSubtitle: { fontSize: 12, fontWeight: "700" },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  iconOption: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    width: "30%",
    minWidth: 96,
    flexGrow: 1,
    gap: 6,
  },
  iconOptionLabel: { fontSize: 11, fontWeight: "700", textAlign: "center" },
  iconCloseButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  iconCloseText: { fontSize: 13, fontWeight: "800" },
});
