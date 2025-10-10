import React, { useCallback, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView, Modal } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

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
    regularPriceText,
    handleRegularPriceChange,
    items,
    addItem,
    removeItem,
    updateItemService,
    updateItemQuantity,
    errors,
    itemErrors,
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

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerItemId, setPickerItemId] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");

  const openPicker = useCallback((itemId: string) => {
    setPickerItemId(itemId);
    setPickerSearch("");
    setPickerVisible(true);
  }, []);

  const closePicker = useCallback(() => {
    setPickerVisible(false);
    setPickerItemId(null);
    setPickerSearch("");
  }, []);

  const filteredServices = useMemo(() => {
    const query = pickerSearch.trim().toLowerCase();
    if (!query) return services;
    return services.filter((svc) => svc.name.toLowerCase().includes(query));
  }, [pickerSearch, services]);

  const currentPickerItem = useMemo(
    () => (pickerItemId ? items.find((item) => item.id === pickerItemId) ?? null : null),
    [items, pickerItemId],
  );

  const selectedServiceName = useCallback(
    (serviceId: string) => services.find((svc) => svc.id === serviceId)?.name ?? "",
    [services],
  );

  const handleSubmit = useCallback(async () => {
    try {
      const result = await submit();
      if (!result || result.status === "invalid" || !result.servicePackage) {
        return;
      }

      if (result.status === "created") {
        Alert.alert(copy.alerts.createdTitle, copy.alerts.createdMessage(result.servicePackage.name));
      } else if (result.status === "updated") {
        Alert.alert(copy.alerts.updatedTitle, copy.alerts.updatedMessage(result.servicePackage.name));
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
          label={copy.fields.regularPriceLabel}
          value={regularPriceText}
          onChangeText={handleRegularPriceChange}
          keyboardType="decimal-pad"
          placeholder={copy.fields.regularPricePlaceholder}
          helperText={copy.fields.regularPriceHelper}
          error={errors.regularPrice}
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

      <View style={{ gap: 8 }}>
        <Text style={[styles.label, { color: colors.subtext }]}>{copy.fields.itemsLabel}</Text>
        {errors.items ? <Text style={[styles.errorText, { color: colors.danger }]}>{errors.items}</Text> : null}
        {items.map((item, index) => {
          const errorsForItem = itemErrors[item.id] ?? {};
          const serviceName = selectedServiceName(item.serviceId);
          const canRemove = items.length > 1;
          return (
            <View key={item.id} style={[styles.itemCard, { borderColor: colors.border }]}> 
              <View style={styles.itemHeader}>
                <Text style={[styles.itemTitle, { color: colors.text }]}>
                  {copy.fields.itemTitle(index + 1)}
                </Text>
                <Pressable
                  onPress={() => {
                    if (canRemove) removeItem(item.id);
                  }}
                  disabled={!canRemove}
                  style={styles.removeButton}
                  accessibilityRole="button"
                  accessibilityLabel={copy.accessibility.removeItem(index + 1)}
                >
                  <MaterialCommunityIcons
                    name="trash-can-outline"
                    size={18}
                    color={canRemove ? colors.danger : colors.subtext}
                  />
                </Pressable>
              </View>

              <Text style={[styles.fieldLabel, { color: colors.subtext }]}>{copy.fields.itemServiceLabel}</Text>
              <Pressable
                onPress={() => openPicker(item.id)}
                style={[styles.serviceSelector, { borderColor: errorsForItem.service ? colors.danger : colors.border }]}
                accessibilityRole="button"
                accessibilityLabel={copy.accessibility.openServicePicker(index + 1)}
              >
                <Text style={{ color: serviceName ? colors.text : colors.subtext }} numberOfLines={1}>
                  {serviceName || copy.fields.itemServicePlaceholder}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color={colors.subtext} />
              </Pressable>
              {errorsForItem.service ? (
                <Text style={[styles.errorText, { color: colors.danger }]}>{errorsForItem.service}</Text>
              ) : null}

              <Text style={[styles.fieldLabel, { color: colors.subtext }]}>{copy.fields.itemQuantityLabel}</Text>
              <TextInput
                value={item.quantityText}
                onChangeText={(text) => updateItemQuantity(item.id, text)}
                keyboardType="number-pad"
                placeholder={copy.fields.itemQuantityPlaceholder}
                placeholderTextColor="#94a3b8"
                style={[styles.quantityInput, { borderColor: errorsForItem.quantity ? colors.danger : colors.border, color: colors.text }]}
              />
              {errorsForItem.quantity ? (
                <Text style={[styles.errorText, { color: colors.danger }]}>{errorsForItem.quantity}</Text>
              ) : null}
            </View>
          );
        })}

        <Pressable
          onPress={addItem}
          style={[styles.addButton, { borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel={copy.accessibility.addItem}
        >
          <MaterialCommunityIcons name="plus" size={18} color={colors.accent} />
          <Text style={[styles.addButtonText, { color: colors.accent }]}>{copy.fields.addItemLabel}</Text>
        </Pressable>
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

      <Modal transparent visible={pickerVisible} animationType="fade" onRequestClose={closePicker}>
        <View style={styles.pickerBackdrop}>
          <View style={[styles.pickerCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.pickerTitle, { color: colors.text }]}>{copy.fields.pickerTitle}</Text>
            <Text style={[styles.pickerSubtitle, { color: colors.subtext }]}>{copy.fields.pickerSubtitle}</Text>
            <TextInput
              value={pickerSearch}
              onChangeText={setPickerSearch}
              placeholder={copy.fields.pickerSearchPlaceholder}
              placeholderTextColor="#94a3b8"
              style={[styles.pickerSearch, { borderColor: colors.border, color: colors.text }]}
              autoCapitalize="none"
            />
            <ScrollView style={{ maxHeight: 320 }}>
              {filteredServices.map((svc) => {
                const selected = currentPickerItem?.serviceId === svc.id;
                return (
                  <Pressable
                    key={svc.id}
                    onPress={() => {
                      if (pickerItemId) {
                        updateItemService(pickerItemId, svc.id);
                      }
                      closePicker();
                    }}
                    style={[
                      styles.pickerOption,
                      {
                        borderColor: selected ? colors.accent : colors.border,
                        backgroundColor: selected ? "rgba(96,165,250,0.15)" : "transparent",
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={copy.accessibility.selectService(svc.name)}
                  >
                    <Text style={[styles.pickerOptionTitle, { color: colors.text }]}>{svc.name}</Text>
                    <Text style={[styles.pickerOptionSubtitle, { color: colors.subtext }]}>
                      {copy.fields.pickerOptionMeta(svc.estimated_minutes, formatPrice(svc.price_cents))}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable
              onPress={closePicker}
              style={[styles.secondaryButton, { borderColor: colors.border, marginTop: 16 }]}
              accessibilityRole="button"
              accessibilityLabel={copy.accessibility.closePicker}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.subtext }]}>{copy.fields.pickerCloseLabel}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function FormField({
  label,
  helperText,
  error,
  colors,
  style,
  ...rest
}: {
  label: string;
  helperText?: string | null;
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
        style={[
          styles.input,
          {
            borderColor: error ? colors.danger : colors.border,
            color: colors.text,
          },
        ]}
      />
      {helperText ? <Text style={[styles.helperText, { color: colors.subtext }]}>{helperText}</Text> : null}
      {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 80,
    fontSize: 15,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: {
    fontWeight: "700",
    fontSize: 15,
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontWeight: "600",
    fontSize: 14,
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
  },
  helperText: {
    marginTop: 4,
    fontSize: 12,
  },
  itemCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemTitle: {
    fontWeight: "700",
  },
  removeButton: {
    padding: 4,
    marginRight: -4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  serviceSelector: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quantityInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
  },
  addButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addButtonText: {
    fontWeight: "700",
    fontSize: 14,
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.65)",
    justifyContent: "center",
    padding: 20,
  },
  pickerCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  pickerSubtitle: {
    fontSize: 13,
    fontWeight: "500",
  },
  pickerSearch: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pickerOption: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 4,
    marginBottom: 8,
  },
  pickerOptionTitle: {
    fontWeight: "700",
  },
  pickerOptionSubtitle: {
    fontSize: 12,
  },
});
