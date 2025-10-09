import React, { useCallback } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView } from "react-native";

import type { Product } from "../lib/domain";
import { useProductForm } from "../hooks/useProductForm";
import { defaultComponentCopy } from "../locales/componentCopy";
import type { ProductFormCopy } from "../locales/types";
import { formCardColors, type FormCardColors } from "../theme/colors";

type Props = {
  mode?: "create" | "edit";
  product?: Product | null;
  onCreated?: (product: Product) => void;
  onUpdated?: (product: Product) => void;
  onCancel?: () => void;
  colors?: FormCardColors;
  copy?: ProductFormCopy;
};

export default function ProductForm({
  mode = "create",
  product = null,
  onCreated,
  onUpdated,
  onCancel,
  colors = formCardColors,
  copy = defaultComponentCopy.productForm,
}: Props) {
  const {
    isEditMode,
    name,
    setName,
    sku,
    setSku,
    priceText,
    handlePriceChange,
    costText,
    handleCostChange,
    stockText,
    handleStockChange,
    description,
    setDescription,
    errors,
    valid,
    saving,
    submit,
  } = useProductForm({
    mode,
    product,
    copy,
    onCreated,
    onUpdated,
  });

  const handleSubmit = useCallback(async () => {
    try {
      const result = await submit();
      if (!result || result.status === "invalid" || !result.product) {
        return;
      }

      if (result.status === "created") {
        Alert.alert(
          copy.alerts.createdTitle,
          copy.alerts.createdMessage(result.product.name, result.product.stock_quantity),
        );
      } else if (result.status === "updated") {
        Alert.alert(
          copy.alerts.updatedTitle,
          copy.alerts.updatedMessage(result.product.name, result.product.stock_quantity),
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
          label={copy.fields.priceLabel}
          value={priceText}
          onChangeText={handlePriceChange}
          keyboardType="decimal-pad"
          placeholder={copy.fields.pricePlaceholder}
          error={errors.price}
          colors={colors}
          style={{ flex: 1 }}
        />
        <FormField
          label={copy.fields.costLabel}
          value={costText}
          onChangeText={handleCostChange}
          keyboardType="decimal-pad"
          placeholder={copy.fields.costPlaceholder}
          error={errors.cost}
          colors={colors}
          style={{ flex: 1 }}
        />
      </View>

      <View style={styles.row}>
        <FormField
          label={copy.fields.stockLabel}
          value={stockText}
          onChangeText={handleStockChange}
          keyboardType="number-pad"
          placeholder={copy.fields.stockPlaceholder}
          error={errors.stock}
          colors={colors}
          style={{ flex: 1 }}
        />
        <FormField
          label={copy.fields.skuLabel}
          value={sku}
          onChangeText={setSku}
          placeholder={copy.fields.skuPlaceholder}
          colors={colors}
          style={{ flex: 1 }}
        />
      </View>

      <View style={{ marginBottom: 12 }}>
        <Text style={[styles.label, { color: colors.subtext }]}>{copy.fields.descriptionLabel}</Text>
        <ScrollView style={{ maxHeight: 120 }}>
          <TextInput
            value={description}
            onChangeText={setDescription}
            multiline
            placeholder={copy.fields.descriptionPlaceholder}
            placeholderTextColor="#94a3b8"
            style={[styles.textArea, { borderColor: colors.border, color: colors.text }]}
          />
        </ScrollView>
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
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: "700",
    backgroundColor: "rgba(15,23,42,0.35)",
    minHeight: 96,
  },
  errorText: { marginTop: 4, fontSize: 12, fontWeight: "700" },
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
