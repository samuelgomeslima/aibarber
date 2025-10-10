import { useCallback, useEffect, useMemo, useState } from "react";

import type { Service, ServicePackage } from "../lib/domain";
import { createServicePackage, updateServicePackage } from "../lib/servicePackages";
import type { ServicePackageFormCopy } from "../locales/types";
import { centsToInput, parsePrice } from "./useServiceForm";

type ServicePackageFormMode = "create" | "edit";

type UseServicePackageFormOptions = {
  mode: ServicePackageFormMode;
  services: Service[];
  servicePackage: ServicePackage | null | undefined;
  copy: ServicePackageFormCopy;
  onCreated?: (servicePackage: ServicePackage) => void;
  onUpdated?: (servicePackage: ServicePackage) => void;
};

type SubmitStatus = "invalid" | "created" | "updated";

type SubmitResult = {
  status: SubmitStatus;
  servicePackage?: ServicePackage;
};

type QuantityMap = Record<string, string>;

type UseServicePackageFormReturn = {
  isEditMode: boolean;
  name: string;
  setName: (value: string) => void;
  priceText: string;
  handlePriceChange: (text: string) => void;
  quantities: QuantityMap;
  handleQuantityChange: (serviceId: string, text: string) => void;
  selectedItems: ReadonlyArray<{ service_id: string; quantity: number }>;
  totalUnits: number;
  originalPriceCents: number;
  packagePriceCents: number;
  discountValueCents: number;
  discountPercent: number;
  errors: Record<string, string>;
  valid: boolean;
  saving: boolean;
  submit: () => Promise<SubmitResult>;
};

function sanitizeNumericInput(text: string) {
  return text.replace(/[^0-9]/g, "");
}

export function useServicePackageForm({
  mode,
  services,
  servicePackage = null,
  copy,
  onCreated,
  onUpdated,
}: UseServicePackageFormOptions): UseServicePackageFormReturn {
  const isEditMode = mode === "edit";

  const [name, setName] = useState(() => (isEditMode && servicePackage ? servicePackage.name : ""));
  const [priceText, setPriceText] = useState(() =>
    isEditMode && servicePackage
      ? centsToInput(servicePackage.price_cents)
      : copy.fields.pricePlaceholder.replace(/[^0-9.,]/g, ""),
  );
  const [quantities, setQuantities] = useState<QuantityMap>(() => {
    if (!isEditMode || !servicePackage) return {};
    const entries: QuantityMap = {};
    servicePackage.items.forEach((item) => {
      entries[item.service_id] = String(item.quantity);
    });
    return entries;
  });
  const [saving, setSaving] = useState(false);

  const setFromPackage = useCallback(
    (pkg: ServicePackage | null) => {
      if (pkg) {
        setName(pkg.name);
        setPriceText(centsToInput(pkg.price_cents));
        setQuantities(() => {
          const next: QuantityMap = {};
          pkg.items.forEach((item) => {
            next[item.service_id] = String(item.quantity);
          });
          return next;
        });
      } else {
        setName("");
        setPriceText(copy.fields.pricePlaceholder.replace(/[^0-9.,]/g, ""));
        setQuantities({});
      }
    },
    [copy.fields.pricePlaceholder],
  );

  useEffect(() => {
    if (isEditMode && servicePackage) {
      setFromPackage(servicePackage);
    } else if (!isEditMode) {
      setFromPackage(null);
    }
  }, [isEditMode, servicePackage, setFromPackage]);

  const serviceIdOrder = useMemo(() => services.map((svc) => svc.id), [services]);
  const servicePriceMap = useMemo(() => {
    const map = new Map<string, number>();
    services.forEach((svc) => {
      map.set(svc.id, Number(svc.price_cents) || 0);
    });
    return map;
  }, [services]);

  const packagePriceCents = useMemo(() => parsePrice(priceText), [priceText]);

  const selectedItems = useMemo(() => {
    const knownIds = new Set(serviceIdOrder);
    const extras = Object.keys(quantities).filter((id) => !knownIds.has(id));
    const allIds = [...serviceIdOrder, ...extras];

    const items = allIds
      .map((id) => {
        const value = Number(quantities[id]);
        if (!Number.isFinite(value) || value <= 0) {
          return null;
        }
        return { service_id: id, quantity: Math.round(value) };
      })
      .filter((item): item is { service_id: string; quantity: number } => Boolean(item));

    const combined = new Map<string, number>();
    items.forEach((item) => {
      const current = combined.get(item.service_id) ?? 0;
      combined.set(item.service_id, current + item.quantity);
    });

    return Array.from(combined.entries()).map(([service_id, quantity]) => ({ service_id, quantity }));
  }, [quantities, serviceIdOrder]);

  const totalUnits = useMemo(
    () => selectedItems.reduce((total, item) => total + item.quantity, 0),
    [selectedItems],
  );

  const originalPriceCents = useMemo(() => {
    return selectedItems.reduce((total, item) => {
      const unitPrice = servicePriceMap.get(item.service_id) ?? 0;
      return total + unitPrice * item.quantity;
    }, 0);
  }, [selectedItems, servicePriceMap]);

  const discountValueCents = useMemo(() => {
    if (!Number.isFinite(packagePriceCents) || packagePriceCents < 0) return 0;
    const diff = originalPriceCents - packagePriceCents;
    return diff > 0 ? diff : 0;
  }, [originalPriceCents, packagePriceCents]);

  const discountPercent = useMemo(() => {
    if (!originalPriceCents) return 0;
    return Math.max(0, Math.round((discountValueCents / originalPriceCents) * 100));
  }, [discountValueCents, originalPriceCents]);

  const errors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!name.trim()) {
      errs.name = copy.fields.nameError;
    }
    if (!Number.isFinite(packagePriceCents) || packagePriceCents < 0) {
      errs.price = copy.fields.priceError;
    }
    if (!selectedItems.length) {
      errs.items = copy.fields.itemsError;
    }
    if (
      selectedItems.length &&
      Number.isFinite(packagePriceCents) &&
      packagePriceCents >= originalPriceCents
    ) {
      errs.price = copy.fields.priceDiscountError;
    }
    return errs;
  }, [
    copy.fields.itemsError,
    copy.fields.nameError,
    copy.fields.priceDiscountError,
    copy.fields.priceError,
    name,
    originalPriceCents,
    packagePriceCents,
    selectedItems,
  ]);

  const readyToSubmit = useMemo(
    () => Object.keys(errors).length === 0 && (!isEditMode || !!servicePackage),
    [errors, isEditMode, servicePackage],
  );

  const valid = readyToSubmit && !saving;

  const handlePriceChange = useCallback((text: string) => {
    setPriceText(text.replace(/[^0-9.,]/g, ""));
  }, []);

  const handleQuantityChange = useCallback((serviceId: string, text: string) => {
    setQuantities((prev) => ({ ...prev, [serviceId]: sanitizeNumericInput(text) }));
  }, []);

  const submit = useCallback(async (): Promise<SubmitResult> => {
    if (!readyToSubmit || saving) {
      return { status: "invalid" };
    }
    setSaving(true);
    try {
      if (isEditMode && servicePackage) {
        const updated = await updateServicePackage(servicePackage.id, {
          name: name.trim(),
          price_cents: packagePriceCents,
          original_price_cents: originalPriceCents,
          items: selectedItems,
        });
        setFromPackage(updated);
        onUpdated?.(updated);
        return { status: "updated", servicePackage: updated };
      }

      const created = await createServicePackage({
        name: name.trim(),
        price_cents: packagePriceCents,
        original_price_cents: originalPriceCents,
        items: selectedItems,
      });
      setFromPackage(null);
      onCreated?.(created);
      return { status: "created", servicePackage: created };
    } finally {
      setSaving(false);
    }
  }, [
    readyToSubmit,
    saving,
    isEditMode,
    servicePackage,
    name,
    packagePriceCents,
    originalPriceCents,
    selectedItems,
    setFromPackage,
    onUpdated,
    onCreated,
  ]);

  return {
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
  };
}
