import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import type { Service, ServicePackage } from "../lib/domain";
import { formatPrice } from "../lib/domain";
import { createServicePackage } from "../lib/servicePackages";
import { defaultComponentCopy } from "../locales/componentCopy";
import type { ServicePackageFormCopy } from "../locales/types";
import { formCardColors, type FormCardColors } from "../theme/colors";
import { parsePrice } from "../hooks/useServiceForm";

type Props = {
  services: Service[];
  onCreated?: (pkg: ServicePackage) => void;
  onCancel?: () => void;
  colors?: FormCardColors;
  copy?: ServicePackageFormCopy;
};

type PackageItemInput = {
  serviceId: string;
  quantity: number;
};

type FormErrors = {
  name?: string;
  discount?: string;
  items?: string;
};

export default function ServicePackageForm({
  services,
  onCreated,
  onCancel,
  colors = formCardColors,
  copy = defaultComponentCopy.servicePackageForm,
}: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [discountPriceText, setDiscountPriceText] = useState("");
  const [items, setItems] = useState<PackageItemInput[]>([]);
  const [servicePickerVisible, setServicePickerVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const serviceMap = useMemo(() => new Map(services.map((svc) => [svc.id, svc])), [services]);

  const availableServices = useMemo(() => {
    const selectedIds = new Set(items.map((item) => item.serviceId));
    return services
      .filter((svc) => !selectedIds.has(svc.id))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }, [items, services]);

  const standardPriceCents = useMemo(
    () =>
      items.reduce((total, item) => {
        const svc = serviceMap.get(item.serviceId);
        if (!svc) return total;
        return total + Math.max(0, item.quantity) * Math.max(0, svc.price_cents);
      }, 0),
    [items, serviceMap],
  );

  const discountPriceCents = useMemo(() => parsePrice(discountPriceText), [discountPriceText]);

  const totalServices = useMemo(
    () => items.reduce((total, item) => total + Math.max(0, item.quantity), 0),
    [items],
  );

  const discountDifferenceCents = useMemo(() => {
    if (!Number.isFinite(discountPriceCents)) return 0;
    return Math.max(0, standardPriceCents - Number(discountPriceCents));
  }, [discountPriceCents, standardPriceCents]);

  const readyToSubmit =
    name.trim().length > 0 &&
    items.length > 0 &&
    Number.isFinite(discountPriceCents) &&
    Number(discountPriceCents) > 0 &&
    standardPriceCents > 0 &&
    Number(discountPriceCents) < standardPriceCents;

  const closePicker = useCallback(() => {
    setServicePickerVisible(false);
  }, []);

  const handleAddService = useCallback(
    (serviceId: string) => {
      setItems((prev) => {
        if (prev.some((item) => item.serviceId === serviceId)) {
          return prev;
        }
        return [...prev, { serviceId, quantity: 1 }];
      });
      setErrors((prev) => ({ ...prev, items: undefined }));
      closePicker();
    },
    [closePicker],
  );

  const handleQuantityChange = useCallback((serviceId: string, value: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.serviceId !== serviceId) return item;
        const numeric = Number.parseInt(value.replace(/[^0-9]/g, ""), 10);
        const nextQuantity = Number.isFinite(numeric) && numeric > 0 ? numeric : 1;
        return { ...item, quantity: nextQuantity };
      }),
    );
  }, []);

  const handleRemoveService = useCallback((serviceId: string) => {
    setItems((prev) => prev.filter((item) => item.serviceId !== serviceId));
  }, []);

  const validate = useCallback((): FormErrors => {
    const issues: FormErrors = {};
    if (!name.trim()) {
      issues.name = copy.validation.nameRequired;
    }
    if (items.length === 0) {
      issues.items = copy.validation.atLeastOneService;
    }
    if (!Number.isFinite(discountPriceCents) || Number(discountPriceCents) <= 0) {
      issues.discount = copy.validation.discountRequired;
    } else if (standardPriceCents <= 0 || Number(discountPriceCents) >= standardPriceCents) {
      issues.discount = copy.validation.discountLessThanStandard;
    }
    return issues;
  }, [copy.validation, discountPriceCents, items.length, name, standardPriceCents]);

  const resetForm = useCallback(() => {
    setName("");
    setDescription("");
    setDiscountPriceText("");
    setItems([]);
    setErrors({});
  }, []);

  const handleSubmit = useCallback(async () => {
    if (saving) return;
    const issues = validate();
    setErrors(issues);
    if (Object.keys(issues).length > 0) {
      return;
    }

    try {
      setSaving(true);
      const created = await createServicePackage({
        name: name.trim(),
        description: description.trim() || null,
        standard_price_cents: standardPriceCents,
        discount_price_cents: Number(discountPriceCents),
        items: items.map((item) => ({ service_id: item.serviceId, quantity: item.quantity })),
      });
      Alert.alert(copy.alerts.createdTitle, copy.alerts.createdMessage(created.name, formatPrice(created.discount_price_cents)));
      onCreated?.(created);
      resetForm();
    } catch (error: any) {
      Alert.alert(copy.alerts.createErrorTitle, error?.message ?? String(error));
    } finally {
      setSaving(false);
    }
  }, [
    copy.alerts,
    description,
    discountPriceCents,
    items,
    name,
    onCreated,
    resetForm,
    saving,
    standardPriceCents,
    validate,
  ]);

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}> 
      <Text style={[styles.title, { color: colors.text }]}>{copy.title}</Text>
      <Text style={[styles.subtitle, { color: colors.subtext }]}>{copy.subtitle}</Text>

      <FormField
        label={copy.fields.nameLabel}
        value={name}
        onChangeText={(value) => {
          setName(value);
          if (errors.name) {
            setErrors((prev) => ({ ...prev, name: undefined }));
          }
        }}
        placeholder={copy.fields.namePlaceholder}
        error={errors.name}
        colors={colors}
      />

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

      <FormField
        label={copy.fields.discountPriceLabel}
        value={discountPriceText}
        onChangeText={(value) => {
          setDiscountPriceText(value);
          if (errors.discount) {
            setErrors((prev) => ({ ...prev, discount: undefined }));
          }
        }}
        keyboardType="decimal-pad"
        placeholder={copy.fields.discountPricePlaceholder}
        error={errors.discount}
        colors={colors}
      />

      <View style={{ marginBottom: 12 }}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.label, { color: colors.subtext }]}>{copy.items.title}</Text>
          <Pressable
            onPress={() => setServicePickerVisible(true)}
            disabled={availableServices.length === 0}
            style={[
              styles.addServiceButton,
              {
                borderColor: colors.border,
                backgroundColor:
                  availableServices.length === 0 ? "rgba(255,255,255,0.04)" : colors.accent,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={copy.accessibility.openServicePicker}
          >
            <Text
              style={[
                styles.addServiceButtonText,
                { color: availableServices.length === 0 ? colors.subtext : colors.accentFgOn },
              ]}
            >
              {copy.items.addService}
            </Text>
          </Pressable>
        </View>
        {items.length === 0 ? (
          <Text style={[styles.empty, { color: colors.subtext }]}>{copy.items.empty}</Text>
        ) : (
          items.map((item) => {
            const svc = serviceMap.get(item.serviceId);
            const serviceName = svc?.name ?? item.serviceId;
            return (
              <View key={item.serviceId} style={[styles.itemRow, { borderColor: colors.border }]}> 
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                  <MaterialCommunityIcons name={svc?.icon ?? "briefcase-outline"} size={20} color={colors.accent} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: "700" }}>{copy.items.selectedLabel(serviceName)}</Text>
                    <Text style={{ color: colors.subtext, fontSize: 12 }}>
                      {formatPrice((svc?.price_cents ?? 0) * item.quantity)}
                    </Text>
                  </View>
                </View>
                <View style={styles.quantityContainer}>
                  <Text style={[styles.quantityLabel, { color: colors.subtext }]}>{copy.items.quantityLabel}</Text>
                  <TextInput
                    value={String(item.quantity)}
                    onChangeText={(value) => handleQuantityChange(item.serviceId, value)}
                    keyboardType="number-pad"
                    accessibilityLabel={copy.items.quantityAccessibility(serviceName)}
                    placeholder={copy.items.quantityPlaceholder}
                    placeholderTextColor="#94a3b8"
                    style={[styles.quantityInput, { borderColor: colors.border, color: colors.text }]}
                  />
                </View>
                <Pressable
                  onPress={() => handleRemoveService(item.serviceId)}
                  style={[styles.removeButton, { borderColor: colors.border }]}
                  accessibilityRole="button"
                  accessibilityLabel={copy.items.removeAccessibility(serviceName)}
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.danger} />
                  <Text style={{ color: colors.danger, fontWeight: "700", fontSize: 12 }}>
                    {copy.items.removeLabel}
                  </Text>
                </Pressable>
              </View>
            );
          })
        )}
        {errors.items ? <Text style={[styles.errorText, { color: colors.danger }]}>{errors.items}</Text> : null}
      </View>

      <View style={[styles.summaryCard, { borderColor: colors.border, backgroundColor: colors.surface }]}> 
        <Text style={[styles.summaryTitle, { color: colors.text }]}>{copy.summary.header}</Text>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.subtext }]}>{copy.summary.standardLabel}</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{formatPrice(standardPriceCents)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.subtext }]}>{copy.summary.discountLabel}</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {Number.isFinite(discountPriceCents) && Number(discountPriceCents) > 0
              ? formatPrice(Number(discountPriceCents))
              : "—"}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.subtext }]}>
            {copy.summary.totalServicesLabel(totalServices)}
          </Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {totalServices.toString()}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.subtext }]}>
            {copy.summary.discountDifference(formatPrice(discountDifferenceCents))}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={handleSubmit}
        disabled={!readyToSubmit || saving}
        style={[
          styles.primaryButton,
          {
            backgroundColor: readyToSubmit && !saving ? colors.accent : "rgba(255,255,255,0.08)",
            borderColor: readyToSubmit && !saving ? colors.accent : colors.border,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={copy.accessibility.submit}
      >
        <Text style={[styles.primaryButtonText, { color: readyToSubmit && !saving ? colors.accentFgOn : colors.subtext }]}>
          {saving ? copy.buttons.saving : copy.buttons.submit}
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

      <Modal visible={servicePickerVisible} animationType="fade" transparent onRequestClose={closePicker}>
        <Pressable style={styles.pickerBackdrop} onPress={closePicker} />
        <View style={[styles.pickerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <Text style={[styles.pickerTitle, { color: colors.text }]}>{copy.items.pickerTitle}</Text>
          {availableServices.length === 0 ? (
            <Text style={{ color: colors.subtext, paddingVertical: 12 }}>{copy.items.servicesUnavailable}</Text>
          ) : (
            <ScrollView style={{ maxHeight: 320 }}>
              {availableServices.map((svc) => (
                <Pressable
                  key={svc.id}
                  onPress={() => handleAddService(svc.id)}
                  style={[styles.pickerRow, { borderColor: colors.border }]}
                  accessibilityRole="button"
                  accessibilityLabel={copy.items.addServiceAccessibility}
                >
                  <MaterialCommunityIcons name={svc.icon} size={20} color={colors.accent} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: "700" }}>{svc.name}</Text>
                    <Text style={{ color: colors.subtext, fontSize: 12 }}>{formatPrice(svc.price_cents)}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </Modal>
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
        style={[styles.input, { borderColor: colors.border, color: colors.text }]}
        placeholderTextColor="#94a3b8"
      />
      {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
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
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: "600",
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: "600",
    minHeight: 80,
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  addServiceButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  addServiceButtonText: {
    fontWeight: "700",
    fontSize: 13,
  },
  empty: {
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.8,
  },
  itemRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  quantityInput: {
    width: 64,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  quantityContainer: {
    alignItems: "center",
    gap: 4,
  },
  quantityLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  removeButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  primaryButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    fontWeight: "800",
    fontSize: 15,
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontWeight: "700",
    fontSize: 14,
  },
  pickerBackdrop: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(15,23,42,0.6)",
  },
  pickerCard: {
    marginHorizontal: 24,
    marginTop: 120,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    elevation: 4,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  pickerRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
});
