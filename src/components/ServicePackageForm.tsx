import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
  Modal,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import type { Service, ServicePackage } from "../lib/domain";
import { formatPrice } from "../lib/domain";
import {
  createServicePackage,
  updateServicePackage,
  type ServicePackageInput,
} from "../lib/servicePackages";
import { centsToInput, parsePrice } from "../hooks/useServiceForm";
import { defaultComponentCopy } from "../locales/componentCopy";
import type { ServicePackageFormCopy } from "../locales/types";
import { formCardColors, type FormCardColors } from "../theme/colors";

type PackageFormMode = "create" | "edit";

type PackageItemState = {
  id: string;
  serviceId: string | null;
  quantityText: string;
};

type Props = {
  mode?: PackageFormMode;
  package?: ServicePackage | null;
  services: Service[];
  onCreated?: (pkg: ServicePackage) => void;
  onUpdated?: (pkg: ServicePackage) => void;
  onCancel?: () => void;
  colors?: FormCardColors;
  copy?: ServicePackageFormCopy;
};

const DEFAULT_MODE: PackageFormMode = "create";

const generateLocalId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

export default function ServicePackageForm({
  mode = DEFAULT_MODE,
  package: current,
  services,
  onCreated,
  onUpdated,
  onCancel,
  colors = formCardColors,
  copy = defaultComponentCopy.servicePackageForm,
}: Props) {
  const isEditMode = mode === "edit";

  const [name, setName] = useState(() => (isEditMode && current ? current.name : ""));
  const [priceText, setPriceText] = useState(() =>
    isEditMode && current ? centsToInput(current.price_cents) : copy.fields.pricePlaceholder.replace(/[^0-9.,]/g, ""),
  );
  const [items, setItems] = useState<PackageItemState[]>(() => {
    if (isEditMode && current) {
      return current.items.map((item) => ({
        id: item.id || generateLocalId("pkg_item"),
        serviceId: item.service_id,
        quantityText: String(item.quantity),
      }));
    }
    return [];
  });
  const [saving, setSaving] = useState(false);
  const [servicePickerItemId, setServicePickerItemId] = useState<string | null>(null);
  const [serviceSearch, setServiceSearch] = useState("");

  useEffect(() => {
    if (isEditMode && current) {
      setName(current.name);
      setPriceText(centsToInput(current.price_cents));
      setItems(
        current.items.map((item) => ({
          id: item.id || generateLocalId("pkg_item"),
          serviceId: item.service_id,
          quantityText: String(item.quantity),
        })),
      );
    }
    if (!isEditMode && !current) {
      setName("");
      setPriceText(copy.fields.pricePlaceholder.replace(/[^0-9.,]/g, ""));
      setItems([]);
    }
  }, [copy.fields.pricePlaceholder, current, isEditMode]);

  const serviceMap = useMemo(() => new Map(services.map((svc) => [svc.id, svc])), [services]);

  const sortedServices = useMemo(() => {
    return [...services].sort((a, b) => a.name.localeCompare(b.name));
  }, [services]);

  const filteredServices = useMemo(() => {
    const query = serviceSearch.trim().toLowerCase();
    if (!query) return sortedServices;
    return sortedServices.filter((svc) => svc.name.toLowerCase().includes(query));
  }, [serviceSearch, sortedServices]);

  const priceCents = useMemo(() => parsePrice(priceText), [priceText]);

  const basePriceCents = useMemo(() => {
    return items.reduce((total, item) => {
      if (!item.serviceId) return total;
      const svc = serviceMap.get(item.serviceId);
      if (!svc) return total;
      const quantity = Number(item.quantityText);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return total;
      }
      return total + svc.price_cents * Math.round(quantity);
    }, 0);
  }, [items, serviceMap]);

  const discountPercent = useMemo(() => {
    if (!Number.isFinite(priceCents) || basePriceCents <= 0) return 0;
    if (priceCents >= basePriceCents) return 0;
    const ratio = 1 - priceCents / basePriceCents;
    return Math.max(0, Math.round(ratio * 100));
  }, [basePriceCents, priceCents]);

  const itemValidation = useMemo(() => {
    const serviceCounts = new Map<string, number>();
    items.forEach((item) => {
      if (item.serviceId) {
        serviceCounts.set(item.serviceId, (serviceCounts.get(item.serviceId) ?? 0) + 1);
      }
    });
    const duplicateIds = new Set<string>();
    for (const [serviceId, count] of serviceCounts.entries()) {
      if (count > 1) duplicateIds.add(serviceId);
    }
    return items.map((item) => {
      const quantity = Number(item.quantityText);
      const serviceValid = !!item.serviceId && serviceMap.has(item.serviceId);
      const quantityValid = Number.isFinite(quantity) && quantity > 0;
      return {
        id: item.id,
        serviceValid,
        quantityValid,
        isDuplicate: item.serviceId ? duplicateIds.has(item.serviceId) : false,
      };
    });
  }, [items, serviceMap]);

  const itemsError = useMemo(() => {
    if (items.length === 0) return copy.errors.noItems;
    if (itemValidation.some((item) => item.isDuplicate)) return copy.errors.duplicateServices;
    if (itemValidation.some((item) => !item.serviceValid || !item.quantityValid)) {
      return copy.errors.invalidItems;
    }
    return null;
  }, [copy.errors.duplicateServices, copy.errors.invalidItems, copy.errors.noItems, itemValidation, items.length]);

  const canSubmit = useMemo(() => {
    if (!name.trim()) return false;
    if (!Number.isFinite(priceCents) || priceCents < 0) return false;
    if (itemsError) return false;
    if (isEditMode && !current) return false;
    return !saving;
  }, [current, isEditMode, itemsError, name, priceCents, saving]);

  const handlePriceChange = useCallback((text: string) => {
    setPriceText(text.replace(/[^0-9.,]/g, ""));
  }, []);

  const handleQuantityChange = useCallback((id: string, text: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              quantityText: text.replace(/[^0-9]/g, ""),
            }
          : item,
      ),
    );
  }, []);

  const handleOpenServicePicker = useCallback((id: string) => {
    setServicePickerItemId(id);
    setServiceSearch("");
  }, []);

  const handleSelectService = useCallback((serviceId: string) => {
    if (!servicePickerItemId) return;
    setItems((prev) =>
      prev.map((item) => (item.id === servicePickerItemId ? { ...item, serviceId } : item)),
    );
    setServicePickerItemId(null);
    setServiceSearch("");
  }, [servicePickerItemId]);

  const handleAddItem = useCallback(() => {
    const usedIds = new Set(items.map((item) => item.serviceId).filter(Boolean) as string[]);
    const defaultService = sortedServices.find((svc) => !usedIds.has(svc.id))?.id ?? null;
    const id = generateLocalId("pkg_item");
    setItems((prev) => [
      ...prev,
      {
        id,
        serviceId: defaultService,
        quantityText: "1",
      },
    ]);
    if (!defaultService) {
      setServicePickerItemId(id);
    }
  }, [items, sortedServices]);

  const handleRemoveItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) {
      return;
    }
    const normalizedItems = items.map((item) => ({
      service_id: item.serviceId!,
      quantity: Math.round(Number(item.quantityText)),
    }));

    const payload: ServicePackageInput = {
      name: name.trim(),
      price_cents: Math.round(Number(priceCents)),
      regular_price_cents: basePriceCents,
      description: current?.description ?? null,
      items: normalizedItems,
    };

    setSaving(true);
    try {
      if (isEditMode && current) {
        const updated = await updateServicePackage(current.id, payload);
        Alert.alert(copy.alerts.updatedTitle, copy.alerts.updatedMessage(updated.name));
        onUpdated?.(updated);
      } else {
        const created = await createServicePackage(payload);
        Alert.alert(copy.alerts.createdTitle, copy.alerts.createdMessage(created.name));
        onCreated?.(created);
        setName("");
        setPriceText(copy.fields.pricePlaceholder.replace(/[^0-9.,]/g, ""));
        setItems([]);
      }
    } catch (error: any) {
      Alert.alert(
        isEditMode ? copy.alerts.updateErrorTitle : copy.alerts.createErrorTitle,
        error?.message ?? String(error),
      );
    } finally {
      setSaving(false);
    }
  }, [
    basePriceCents,
    canSubmit,
    copy.alerts.createdMessage,
    copy.alerts.createdTitle,
    copy.alerts.createErrorTitle,
    copy.alerts.updateErrorTitle,
    copy.alerts.updatedMessage,
    copy.alerts.updatedTitle,
    copy.fields.pricePlaceholder,
    current,
    isEditMode,
    items,
    name,
    onCreated,
    onUpdated,
    priceCents,
  ]);

  const servicePickerVisible = servicePickerItemId !== null;

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.text }]}>{isEditMode ? copy.editTitle : copy.createTitle}</Text>
      <Text style={[styles.subtitle, { color: colors.subtext }]}>
        {isEditMode ? copy.editSubtitle : copy.createSubtitle}
      </Text>

      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: colors.subtext }]}>{copy.fields.nameLabel}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={copy.fields.namePlaceholder}
          placeholderTextColor="#94a3b8"
          style={[styles.input, { borderColor: !name.trim() ? colors.danger : colors.border, color: colors.text }]}
        />
        {!name.trim() ? <Text style={[styles.errorText, { color: colors.danger }]}>{copy.fields.nameError}</Text> : null}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: colors.subtext }]}>{copy.fields.priceLabel}</Text>
        <TextInput
          value={priceText}
          onChangeText={handlePriceChange}
          keyboardType="decimal-pad"
          placeholder={copy.fields.pricePlaceholder}
          placeholderTextColor="#94a3b8"
          style={[
            styles.input,
            {
              borderColor: !Number.isFinite(priceCents) || priceCents < 0 ? colors.danger : colors.border,
              color: colors.text,
            },
          ]}
        />
        {!Number.isFinite(priceCents) || priceCents < 0 ? (
          <Text style={[styles.errorText, { color: colors.danger }]}>{copy.fields.priceError}</Text>
        ) : null}
      </View>

      <View style={styles.itemsHeader}>
        <Text style={[styles.label, { color: colors.subtext }]}>{copy.items.label}</Text>
        <Text style={[styles.helper, { color: colors.subtext }]}>{copy.items.helper}</Text>
      </View>

      <View style={{ gap: 12 }}>
        {items.map((item) => {
          const validation = itemValidation.find((entry) => entry.id === item.id);
          const service = item.serviceId ? serviceMap.get(item.serviceId) : null;
          const serviceLabel = service?.name ?? copy.lineItem.servicePlaceholder;
          const hasServiceIssue = !validation?.serviceValid || validation?.isDuplicate;
          return (
            <View key={item.id} style={[styles.itemRow, { borderColor: colors.border }]}> 
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={[styles.label, { color: colors.subtext }]}>{copy.lineItem.serviceLabel}</Text>
                <Pressable
                  onPress={() => handleOpenServicePicker(item.id)}
                  style={[styles.selector, { borderColor: hasServiceIssue ? colors.danger : colors.border }]}
                  accessibilityRole="button"
                  accessibilityLabel={copy.accessibility.openServicePicker}
                >
                  <Text style={{ color: service ? colors.text : colors.subtext }} numberOfLines={1}>
                    {serviceLabel}
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={18} color={colors.subtext} />
                </Pressable>
              </View>
              <View style={{ width: 110, gap: 6 }}>
                <Text style={[styles.label, { color: colors.subtext }]}>{copy.lineItem.quantityLabel}</Text>
                <TextInput
                  value={item.quantityText}
                  onChangeText={(text) => handleQuantityChange(item.id, text)}
                  keyboardType="number-pad"
                  placeholder={copy.lineItem.quantityPlaceholder}
                  placeholderTextColor="#94a3b8"
                  style={[
                    styles.input,
                    {
                      borderColor: validation?.quantityValid ? colors.border : colors.danger,
                      color: colors.text,
                    },
                  ]}
                />
                {!validation?.quantityValid ? (
                  <Text style={[styles.errorText, { color: colors.danger }]}>{copy.lineItem.quantityError}</Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => handleRemoveItem(item.id)}
                style={[styles.removeBtn, { borderColor: colors.border }]}
                accessibilityRole="button"
                accessibilityLabel={copy.items.removeAccessibility(service?.name ?? copy.lineItem.servicePlaceholder)}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.danger} />
              </Pressable>
            </View>
          );
        })}
        {items.length === 0 ? (
          <Text style={[styles.emptyItems, { color: colors.subtext }]}>{copy.items.empty}</Text>
        ) : null}
        {itemsError ? <Text style={[styles.errorText, { color: colors.danger }]}>{itemsError}</Text> : null}
      </View>

      <Pressable
        onPress={handleAddItem}
        style={[styles.addItemBtn, { borderColor: colors.border, backgroundColor: "rgba(37,99,235,0.05)" }]}
        accessibilityRole="button"
        accessibilityLabel={copy.accessibility.addItem}
      >
        <MaterialCommunityIcons name="plus" size={18} color={colors.accent} />
        <Text style={{ color: colors.accent, fontWeight: "700" }}>{copy.items.addLabel}</Text>
      </Pressable>

      <View style={styles.summaryRow}>
        <Text style={[styles.summaryText, { color: colors.subtext }]}>
          {copy.summary.basePrice(formatPrice(basePriceCents))}
        </Text>
        {discountPercent > 0 ? (
          <Text style={[styles.discountBadge, { color: colors.accent }]}>
            {copy.summary.discount(String(discountPercent))}
          </Text>
        ) : null}
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          onPress={onCancel}
          style={[styles.secondaryBtn, { borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel={copy.accessibility.cancel}
        >
          <Text style={{ color: colors.subtext, fontWeight: "700" }}>{copy.buttons.cancel}</Text>
        </Pressable>
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={[
            styles.primaryBtn,
            {
              backgroundColor: canSubmit ? colors.accent : "rgba(148, 163, 184, 0.4)",
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={isEditMode ? copy.accessibility.submitEdit : copy.accessibility.submitCreate}
        >
          <Text style={{ color: colors.accentFgOn, fontWeight: "800" }}>
            {saving ? copy.buttons.saving : isEditMode ? copy.buttons.edit : copy.buttons.create}
          </Text>
        </Pressable>
      </View>

      <Modal
        transparent
        visible={servicePickerVisible}
        animationType="fade"
        onRequestClose={() => setServicePickerItemId(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { borderColor: colors.border, backgroundColor: colors.surface }]}> 
            <Text style={[styles.modalTitle, { color: colors.text }]}>{copy.servicePicker.title}</Text>
            <TextInput
              value={serviceSearch}
              onChangeText={setServiceSearch}
              placeholder={copy.servicePicker.searchPlaceholder}
              placeholderTextColor="#94a3b8"
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              autoCapitalize="none"
            />
            <ScrollView style={{ maxHeight: 280 }}>
              {filteredServices.map((svc) => (
                <Pressable
                  key={svc.id}
                  onPress={() => handleSelectService(svc.id)}
                  style={[styles.modalOption, { borderColor: colors.border }]}
                >
                  <Text style={{ color: colors.text }}>{svc.name}</Text>
                </Pressable>
              ))}
              {filteredServices.length === 0 ? (
                <Text style={{ color: colors.subtext, paddingVertical: 12 }}>{copy.items.empty}</Text>
              ) : null}
            </ScrollView>
            <Pressable
              onPress={() => setServicePickerItemId(null)}
              style={[styles.secondaryBtn, { borderColor: colors.border, alignSelf: "flex-end" }]}
            >
              <Text style={{ color: colors.subtext, fontWeight: "700" }}>{copy.buttons.cancel}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
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
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  helper: {
    fontSize: 12,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: "600",
    backgroundColor: "rgba(15,23,42,0.3)",
  },
  errorText: {
    fontSize: 12,
    fontWeight: "600",
  },
  itemsHeader: {
    gap: 4,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderRadius: 14,
  },
  selector: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(15,23,42,0.3)",
  },
  removeBtn: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    alignSelf: "flex-end",
  },
  addItemBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyItems: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryText: {
    fontSize: 13,
    fontWeight: "700",
  },
  discountBadge: {
    fontSize: 13,
    fontWeight: "800",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  modalOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
});
