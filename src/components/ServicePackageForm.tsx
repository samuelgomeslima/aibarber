import React, { useCallback, useMemo } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import type { Service, ServicePackage } from "../lib/domain";
import { formatPrice } from "../lib/domain";
import { useServicePackageForm } from "../hooks/useServicePackageForm";
import { defaultComponentCopy } from "../locales/componentCopy";
import type { ServicePackageFormCopy } from "../locales/types";
import { formCardColors, type FormCardColors } from "../theme/colors";

type Props = {
  mode?: "create" | "edit";
  services: Service[];
  localizedServices: Service[];
  servicePackage?: ServicePackage | null;
  onCreated?: (servicePackage: ServicePackage) => void;
  onUpdated?: (servicePackage: ServicePackage) => void;
  onCancel?: () => void;
  colors?: FormCardColors;
  copy?: ServicePackageFormCopy;
};

export default function ServicePackageForm({
  mode = "create",
  services,
  localizedServices,
  servicePackage = null,
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
    priceText,
    handlePriceChange,
    quantities,
    handleQuantityChange,
    selectedItems,
    totalUnits,
    originalPriceCents,
    packagePriceCents,
    discountValueCents,
    discountPercent,
    errors,
    valid,
    saving,
    submit,
  } = useServicePackageForm({
    mode,
    services,
    servicePackage,
    copy,
    onCreated,
    onUpdated,
  });

  const displayServices = useMemo(() => {
    const baseMap = new Map<string, Service>();
    services.forEach((svc) => baseMap.set(svc.id, svc));
    const localizedMap = new Map<string, Service>();
    localizedServices.forEach((svc) => localizedMap.set(svc.id, svc));
    const ids = new Set<string>([
      ...services.map((svc) => svc.id),
      ...localizedServices.map((svc) => svc.id),
      ...Object.keys(quantities),
    ]);
    return Array.from(ids).map((id) => ({
      id,
      base: baseMap.get(id) ?? null,
      localized: localizedMap.get(id) ?? baseMap.get(id) ?? null,
    }));
  }, [localizedServices, quantities, services]);

  const packagePriceDisplay =
    Number.isFinite(packagePriceCents) && packagePriceCents >= 0 ? formatPrice(packagePriceCents) : "—";
  const originalPriceDisplay = formatPrice(originalPriceCents);
  const discountValueDisplay = formatPrice(discountValueCents);
  const discountPercentDisplay = `${discountPercent}%`;

  const handleSubmit = useCallback(async () => {
    try {
      const result = await submit();
      if (!result || result.status === "invalid" || !result.servicePackage) {
        return;
      }

      if (result.status === "created") {
        Alert.alert(
          copy.alerts.createdTitle,
          copy.alerts.createdMessage(result.servicePackage.name, totalUnits),
        );
      } else if (result.status === "updated") {
        Alert.alert(
          copy.alerts.updatedTitle,
          copy.alerts.updatedMessage(result.servicePackage.name, totalUnits),
        );
      }
    } catch (err: any) {
      Alert.alert(
        isEditMode ? copy.alerts.updateErrorTitle : copy.alerts.createErrorTitle,
        err?.message ?? String(err),
      );
    }
  }, [copy.alerts, isEditMode, submit, totalUnits]);

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
        label={copy.fields.priceLabel}
        value={priceText}
        onChangeText={handlePriceChange}
        placeholder={copy.fields.pricePlaceholder}
        error={errors.price}
        colors={colors}
        keyboardType="decimal-pad"
        helper={copy.fields.priceHelper}
      />

      <View style={{ gap: 6 }}>
        <Text style={[styles.label, { color: colors.subtext }]}>{copy.fields.servicesLabel}</Text>
        <Text style={[styles.helper, { color: colors.subtext }]}>{copy.fields.servicesHelper}</Text>
        <View style={[styles.serviceList, { borderColor: colors.border }]}> 
          <ScrollView style={{ maxHeight: 280 }} nestedScrollEnabled>
            <View style={{ gap: 10 }}>
              {displayServices.map(({ id, base, localized }) => {
                const quantityText = quantities[id] ?? "";
                const selected = Number(quantityText) > 0;
                const iconName = (base?.icon ?? "help-circle") as keyof typeof MaterialCommunityIcons.glyphMap;
                const priceMeta = base
                  ? copy.fields.serviceMeta(base.estimated_minutes, formatPrice(base.price_cents))
                  : copy.fields.missingServicePrice;
                const label = localized?.name ?? base?.name ?? id;
                return (
                  <View
                    key={id}
                    style={[
                      styles.serviceRow,
                      {
                        borderColor: selected ? colors.accent : colors.border,
                        backgroundColor: selected ? "rgba(96,165,250,0.12)" : "rgba(15,23,42,0.35)",
                      },
                    ]}
                  >
                    <View style={styles.serviceInfo}>
                      <MaterialCommunityIcons name={iconName} size={22} color={colors.accent} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.serviceName, { color: colors.text }]} numberOfLines={1}>
                          {label}
                        </Text>
                        <Text style={[styles.serviceMeta, { color: colors.subtext }]}>{priceMeta}</Text>
                      </View>
                    </View>
                    <View style={styles.quantityColumn}>
                      <Text style={[styles.quantityLabel, { color: colors.subtext }]}>
                        {copy.fields.quantityLabel}
                      </Text>
                      <TextInput
                        value={quantityText}
                        onChangeText={(text) => handleQuantityChange(id, text)}
                        placeholder={copy.fields.quantityPlaceholder}
                        placeholderTextColor="#94a3b8"
                        keyboardType="number-pad"
                        style={[
                          styles.quantityInput,
                          { borderColor: selected ? colors.accent : colors.border, color: colors.text },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
        {errors.items ? <Text style={[styles.errorText, { color: colors.danger }]}>{errors.items}</Text> : null}
      </View>

      <View style={[styles.summaryCard, { borderColor: colors.border, backgroundColor: "rgba(15,23,42,0.35)" }]}> 
        <Text style={[styles.summaryTitle, { color: colors.subtext }]}>{copy.summary.title}</Text>
        {selectedItems.length === 0 ? (
          <Text style={[styles.summaryEmpty, { color: colors.subtext }]}>{copy.summary.empty}</Text>
        ) : (
          <View style={{ gap: 4 }}>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {copy.summary.totalUnits(totalUnits)}
            </Text>
            <Text style={[styles.summaryMeta, { color: colors.subtext }]}>
              {copy.summary.packagePrice(packagePriceDisplay)}
            </Text>
            <Text style={[styles.summaryMeta, { color: colors.subtext }]}>
              {copy.summary.originalPrice(originalPriceDisplay)}
            </Text>
            <Text style={[styles.summaryMeta, { color: colors.subtext }]}>
              {copy.summary.discountValue(discountValueDisplay)}
            </Text>
            <Text style={[styles.summaryMeta, { color: colors.subtext }]}>
              {copy.summary.discountPercent(discountPercentDisplay)}
            </Text>
          </View>
        )}
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

function FormField({
  label,
  error,
  helper,
  colors,
  style,
  ...rest
}: {
  label: string;
  error?: string;
  helper?: string;
  colors: FormCardColors;
  style?: any;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={[{ gap: 6 }, style]}>
      <Text style={[styles.label, { color: colors.subtext }]}>{label}</Text>
      <TextInput
        {...rest}
        placeholderTextColor="#94a3b8"
        style={[styles.input, { borderColor: error ? colors.danger : colors.border, color: colors.text }]}
      />
      {helper ? <Text style={[styles.helper, { color: colors.subtext }]}>{helper}</Text> : null}
      {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
  },
  title: { fontSize: 18, fontWeight: "800" },
  subtitle: { fontSize: 13, fontWeight: "600" },
  label: { fontSize: 12, fontWeight: "700" },
  helper: { fontSize: 11, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: "700",
    backgroundColor: "rgba(15,23,42,0.35)",
  },
  errorText: { fontSize: 12, fontWeight: "700" },
  serviceList: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    backgroundColor: "rgba(15,23,42,0.2)",
  },
  serviceRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  serviceInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  serviceName: { fontSize: 14, fontWeight: "800" },
  serviceMeta: { fontSize: 12, fontWeight: "600" },
  quantityColumn: { gap: 4, width: 90 },
  quantityLabel: { fontSize: 11, fontWeight: "700" },
  quantityInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    backgroundColor: "rgba(8,15,35,0.45)",
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  summaryTitle: { fontSize: 12, fontWeight: "700" },
  summaryEmpty: { fontSize: 12, fontWeight: "600" },
  summaryValue: { fontSize: 16, fontWeight: "800" },
  summaryMeta: { fontSize: 12, fontWeight: "600" },
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
