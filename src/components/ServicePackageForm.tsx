import React, { useCallback } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView } from "react-native";

import type { Service, ServicePackage } from "../lib/domain";
import { formatPrice } from "../lib/domain";
import { useServicePackageForm } from "../hooks/useServicePackageForm";
import { defaultComponentCopy } from "../locales/componentCopy";
import type { ServicePackageFormCopy } from "../locales/types";
import { formCardColors, type FormCardColors } from "../theme/colors";

type Props = {
  mode?: "create" | "edit";
  servicePackage?: ServicePackage | null;
  services: Service[];
  onCreated?: (pkg: ServicePackage) => void;
  onUpdated?: (pkg: ServicePackage) => void;
  onCancel?: () => void;
  colors?: FormCardColors;
  copy?: ServicePackageFormCopy;
};

export default function ServicePackageForm({
  mode = "create",
  servicePackage = null,
  services,
  onCreated,
  onUpdated,
  onCancel,
  colors = formCardColors,
  copy = defaultComponentCopy.servicePackageForm,
}: Props) {
  const {
    isEditMode,
    name,
    setName,
    description,
    setDescription,
    priceText,
    handlePriceChange,
    serviceEntries,
    updateQuantity,
    incrementQuantity,
    decrementQuantity,
    totalSessions,
    regularPriceCents,
    packagePriceCents,
    discountPercent,
    errors,
    valid,
    saving,
    submit,
  } = useServicePackageForm({
    mode,
    servicePackage,
    services,
    copy,
    onCreated,
    onUpdated,
  });

  const handleSubmit = useCallback(async () => {
    try {
      const result = await submit();
      if (!result || result.status === "invalid") return;
      if (!result.servicePackage) return;

      if (result.status === "created") {
        Alert.alert(copy.alerts.createdTitle, copy.alerts.createdMessage(result.servicePackage.name));
      } else if (result.status === "updated") {
        Alert.alert(copy.alerts.updatedTitle, copy.alerts.updatedMessage(result.servicePackage.name));
      }
    } catch (error: any) {
      Alert.alert(
        isEditMode ? copy.alerts.updateErrorTitle : copy.alerts.createErrorTitle,
        error?.message ?? String(error),
      );
    }
  }, [copy, isEditMode, submit]);

  const formattedRegular = regularPriceCents > 0 ? formatPrice(regularPriceCents) : "—";
  const formattedPackage = Number.isFinite(packagePriceCents) && packagePriceCents > 0
    ? formatPrice(packagePriceCents)
    : "—";
  const discountLabel = discountPercent > 0 ? copy.summary.discountLabel(`${discountPercent.toFixed(1)}%`) : null;

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

      <FormField
        label={copy.fields.descriptionLabel}
        value={description}
        onChangeText={setDescription}
        placeholder={copy.fields.descriptionPlaceholder}
        colors={colors}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      <FormField
        label={copy.fields.priceLabel}
        value={priceText}
        onChangeText={handlePriceChange}
        placeholder={copy.fields.pricePlaceholder}
        keyboardType="decimal-pad"
        error={errors.price}
        colors={colors}
      />

      <View style={styles.summaryBlock}>
        <Text style={[styles.summaryText, { color: colors.subtext }]}>{copy.summary.sessionsLabel(totalSessions)}</Text>
        <Text style={[styles.summaryText, { color: colors.subtext }]}>
          {copy.summary.regularPriceLabel(formattedRegular)}
        </Text>
        <Text style={[styles.summaryText, { color: colors.subtext }]}>
          {copy.summary.packagePriceLabel(formattedPackage)}
        </Text>
        {discountLabel ? (
          <Text style={[styles.discountText, { color: colors.accent }]}>{discountLabel}</Text>
        ) : null}
      </View>

      <View>
        <Text style={[styles.label, { color: colors.subtext }]}>{copy.fields.servicesLabel}</Text>
        <Text style={[styles.helperText, { color: colors.subtext }]}>{copy.fields.servicesHelper}</Text>
      </View>

      <ScrollView style={styles.serviceList} contentContainerStyle={{ gap: 8 }}>
        {serviceEntries.map((entry) => {
          const total = entry.totalPriceCents > 0 ? formatPrice(entry.totalPriceCents) : "—";
          return (
            <View key={entry.service.id} style={[styles.serviceRow, { borderColor: colors.border }]}> 
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.serviceName, { color: colors.text }]}>{entry.service.name}</Text>
                <Text style={[styles.serviceMeta, { color: colors.subtext }]}>
                  {copy.fields.serviceMeta(formatPrice(entry.service.price_cents), entry.quantity, total)}
                </Text>
              </View>
              <View style={styles.quantityControls}>
                <Pressable
                  onPress={() => decrementQuantity(entry.service.id)}
                  style={[styles.quantityButton, { borderColor: colors.border }]}
                  accessibilityRole="button"
                  accessibilityLabel={copy.accessibility.decrease(entry.service.name)}
                >
                  <Text style={[styles.quantityButtonText, { color: colors.subtext }]}>−</Text>
                </Pressable>
                <TextInput
                  value={entry.quantityText}
                  onChangeText={(text) => updateQuantity(entry.service.id, text)}
                  keyboardType="number-pad"
                  style={[styles.quantityInput, { borderColor: colors.border, color: colors.text }]}
                  accessibilityLabel={copy.accessibility.quantityInput(entry.service.name)}
                />
                <Pressable
                  onPress={() => incrementQuantity(entry.service.id)}
                  style={[styles.quantityButton, { borderColor: colors.border }]}
                  accessibilityRole="button"
                  accessibilityLabel={copy.accessibility.increase(entry.service.name)}
                >
                  <Text style={[styles.quantityButtonText, { color: colors.subtext }]}>+</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>
      {errors.services ? <Text style={[styles.errorText, { color: colors.danger }]}>{errors.services}</Text> : null}

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
        accessibilityLabel={
          isEditMode ? copy.accessibility.submitEdit : copy.accessibility.submitCreate
        }
      >
        <Text style={[styles.buttonText, { color: valid ? colors.accentFgOn : colors.subtext }]}>
          {saving ? copy.buttons.saving : isEditMode ? copy.buttons.edit : copy.buttons.create}
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
  colors: FormCardColors;
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
  label: { fontSize: 12, fontWeight: "700", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: "700",
    backgroundColor: "rgba(15,23,42,0.35)",
  },
  errorText: { marginTop: 4, fontSize: 12, fontWeight: "700" },
  summaryBlock: { gap: 4 },
  summaryText: { fontSize: 12, fontWeight: "700" },
  discountText: { fontSize: 12, fontWeight: "800" },
  helperText: { fontSize: 12, fontWeight: "600" },
  serviceList: { maxHeight: 260 },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "rgba(15,23,42,0.2)",
  },
  serviceName: { fontSize: 14, fontWeight: "800" },
  serviceMeta: { fontSize: 12, fontWeight: "600" },
  quantityControls: { flexDirection: "row", alignItems: "center", gap: 6 },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityButtonText: { fontSize: 18, fontWeight: "800" },
  quantityInput: {
    width: 56,
    borderWidth: 1,
    borderRadius: 10,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "800",
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: "rgba(15,23,42,0.35)",
  },
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
