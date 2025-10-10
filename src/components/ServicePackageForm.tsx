import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import type { Service, ServicePackage } from "../lib/domain";
import { formatPrice } from "../lib/domain";
import { defaultComponentCopy } from "../locales/componentCopy";
import type { ServicePackageFormCopy } from "../locales/types";
import { formCardColors, type FormCardColors } from "../theme/colors";
import { useServicePackageForm } from "../hooks/useServicePackageForm";

type Props = {
  mode?: "create" | "edit";
  services: Service[];
  servicePackage?: ServicePackage | null;
  onCreated?: (value: ServicePackage) => void;
  onUpdated?: (value: ServicePackage) => void;
  onCancel?: () => void;
  colors?: FormCardColors;
  copy?: ServicePackageFormCopy;
};

export default function ServicePackageForm({
  mode = "create",
  services,
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
    description,
    setDescription,
    regularPriceText,
    handleRegularPriceChange,
    packagePriceText,
    handlePackagePriceChange,
    items,
    itemErrors,
    addItem,
    removeItem,
    updateItemService,
    updateItemQuantity,
    canAddService,
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

  const [pickerItemKey, setPickerItemKey] = useState<string | null>(null);

  const serviceMap = useMemo(() => Object.fromEntries(services.map((svc) => [svc.id, svc])), [services]);

  const handleSubmit = useCallback(async () => {
    try {
      const result = await submit();
      if (!result || result.status === "invalid" || !result.servicePackage) return;

      const { servicePackage: pkg, status } = result;
      if (status === "created") {
        Alert.alert(copy.alerts.createdTitle, copy.alerts.createdMessage(pkg.name));
      } else if (status === "updated") {
        Alert.alert(copy.alerts.updatedTitle, copy.alerts.updatedMessage(pkg.name));
      }
    } catch (error: any) {
      Alert.alert(
        isEditMode ? copy.alerts.updateErrorTitle : copy.alerts.createErrorTitle,
        error?.message ?? String(error),
      );
    }
  }, [copy.alerts, isEditMode, submit]);

  const pickerVisible = pickerItemKey !== null;
  const pickerItem = pickerItemKey ? items.find((item) => item.key === pickerItemKey) : null;

  const handleSelectService = useCallback(
    (serviceId: string) => {
      if (pickerItemKey) {
        updateItemService(pickerItemKey, serviceId);
        setPickerItemKey(null);
      }
    },
    [pickerItemKey, updateItemService],
  );

  const handleCancelPicker = useCallback(() => setPickerItemKey(null), []);

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
        colors={colors}
        error={errors.name}
      />

      <FormField
        label={copy.fields.descriptionLabel}
        value={description}
        onChangeText={setDescription}
        placeholder={copy.fields.descriptionPlaceholder}
        colors={colors}
        multiline
        numberOfLines={4}
        style={{ height: 96, textAlignVertical: "top" }}
      />

      <View style={styles.row}>
        <FormField
          label={copy.fields.regularPriceLabel}
          value={regularPriceText}
          onChangeText={handleRegularPriceChange}
          placeholder={copy.fields.regularPricePlaceholder}
          keyboardType="decimal-pad"
          colors={colors}
          error={errors.regularPrice}
          containerStyle={{ flex: 1, marginBottom: 0 }}
        />
        <FormField
          label={copy.fields.priceLabel}
          value={packagePriceText}
          onChangeText={handlePackagePriceChange}
          placeholder={copy.fields.pricePlaceholder}
          keyboardType="decimal-pad"
          colors={colors}
          error={errors.packagePrice}
          containerStyle={{ flex: 1, marginBottom: 0 }}
        />
      </View>

      <View style={{ gap: 8 }}>
        <Text style={[styles.label, { color: colors.subtext }]}>{copy.fields.servicesLabel}</Text>
        <Text style={[styles.helper, { color: colors.subtext }]}>{copy.fields.servicesHelper}</Text>

        {items.map((item, index) => {
          const currentService = item.serviceId ? serviceMap[item.serviceId] : null;
          const currentErrors = itemErrors[item.key];
          return (
            <View key={item.key} style={[styles.packageRow, { borderColor: colors.border }]}>
              <Pressable
                onPress={() => setPickerItemKey(item.key)}
                style={[styles.serviceSelector, { borderColor: colors.border }]}
                accessibilityRole="button"
                accessibilityLabel={copy.accessibility.selectService}
              >
                <MaterialCommunityIcons
                  name={currentService ? currentService.icon : "clipboard-alert"}
                  size={20}
                  color={currentService ? colors.accent : colors.subtext}
                />
                <Text style={{ color: colors.text, fontWeight: "700", flex: 1 }} numberOfLines={1}>
                  {currentService ? currentService.name : copy.fields.servicesEmpty}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color={colors.subtext} />
              </Pressable>
              {currentErrors?.service ? (
                <Text style={[styles.errorText, { color: colors.danger }]}>{currentErrors.service}</Text>
              ) : null}

              <FormField
                label={copy.fields.quantityLabel}
                value={item.quantityText}
                onChangeText={(value) => updateItemQuantity(item.key, value)}
                placeholder={copy.fields.quantityPlaceholder}
                keyboardType="number-pad"
                colors={colors}
                error={currentErrors?.quantity}
              />

              <Pressable
                onPress={() => removeItem(item.key)}
                style={[styles.removeButton, { borderColor: colors.border }]}
                accessibilityRole="button"
                accessibilityLabel={copy.accessibility.removeService(
                  currentService?.name ?? copy.fields.servicesEmpty,
                )}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.danger} />
                <Text style={{ color: colors.danger, fontWeight: "700" }}>{copy.buttons.removeService}</Text>
              </Pressable>
            </View>
          );
        })}

        {errors.items ? <Text style={[styles.errorText, { color: colors.danger }]}>{errors.items}</Text> : null}

        <Pressable
          onPress={addItem}
          disabled={!canAddService}
          style={[
            styles.addButton,
            {
              borderColor: colors.accent,
              backgroundColor: canAddService ? "rgba(59,130,246,0.12)" : "transparent",
              opacity: canAddService ? 1 : 0.5,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={copy.accessibility.addService}
        >
          <MaterialCommunityIcons name="plus-circle-outline" size={18} color={colors.accent} />
          <Text style={{ color: colors.accent, fontWeight: "700" }}>{copy.buttons.addService}</Text>
        </Pressable>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={() => {
            if (!saving) onCancel?.();
          }}
          disabled={saving}
          style={[styles.actionButton, { borderColor: colors.border }, saving && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel={copy.accessibility.cancel}
        >
          <Text style={{ color: colors.subtext, fontWeight: "700" }}>{copy.buttons.cancel}</Text>
        </Pressable>
        <Pressable
          onPress={handleSubmit}
          disabled={!valid}
          style={[
            styles.actionButton,
            {
              borderColor: colors.accent,
              backgroundColor: valid ? "rgba(37,99,235,0.15)" : "rgba(148,163,184,0.2)",
            },
            !valid && { opacity: 0.6 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={isEditMode ? copy.accessibility.submitEdit : copy.accessibility.submitCreate}
        >
          <Text style={{ color: colors.accent, fontWeight: "700" }}>
            {saving ? copy.buttons.saving : isEditMode ? copy.buttons.edit : copy.buttons.create}
          </Text>
        </Pressable>
      </View>

      <Modal transparent visible={pickerVisible} animationType="fade" onRequestClose={handleCancelPicker}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { borderColor: colors.border, backgroundColor: colors.surface }]}> 
            <Text style={[styles.modalTitle, { color: colors.text }]}>{copy.fields.servicesLabel}</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {services.map((svc) => (
                <Pressable
                  key={svc.id}
                  onPress={() => handleSelectService(svc.id)}
                  style={[
                    styles.modalOption,
                    {
                      borderColor:
                        pickerItem?.serviceId === svc.id ? colors.accent : colors.border,
                      backgroundColor:
                        pickerItem?.serviceId === svc.id ? "rgba(96,165,250,0.15)" : "transparent",
                    },
                  ]}
                >
                  <MaterialCommunityIcons name={svc.icon} size={20} color={colors.text} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: "700" }}>{svc.name}</Text>
                    <Text style={{ color: colors.subtext, fontSize: 12 }}>
                      {svc.estimated_minutes} min • {formatPrice(svc.price_cents)}
                    </Text>
                  </View>
                </Pressable>
              ))}
              {services.length === 0 ? (
                <Text style={{ color: colors.subtext, textAlign: "center", paddingVertical: 16 }}>
                  {copy.fields.servicesEmpty}
                </Text>
              ) : null}
            </ScrollView>
            <Pressable
              onPress={handleCancelPicker}
              style={[styles.actionButton, { borderColor: colors.border, alignSelf: "flex-end" }]}
              accessibilityRole="button"
              accessibilityLabel={copy.buttons.cancel}
            >
              <Text style={{ color: colors.subtext, fontWeight: "700" }}>{copy.buttons.cancel}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

type FormFieldProps = React.ComponentProps<typeof TextInput> & {
  label: string;
  error?: string;
  colors: FormCardColors;
  containerStyle?: any;
};

function FormField({ label, error, colors, containerStyle, style, ...rest }: FormFieldProps) {
  return (
    <View style={[{ marginBottom: 12 }, containerStyle]}>
      <Text style={[styles.label, { color: colors.subtext }]}>{label}</Text>
      <TextInput
        {...rest}
        style={[
          styles.input,
          style,
          { borderColor: error ? colors.danger : colors.border, color: colors.text },
        ]}
        placeholderTextColor="#94a3b8"
      />
      {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 16,
    gap: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
  },
  helper: {
    fontSize: 12,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(15,23,42,0.35)",
    fontSize: 15,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 12,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  packageRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  serviceSelector: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  removeButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "flex-end",
  },
  actionButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.65)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    gap: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  modalOption: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
});
