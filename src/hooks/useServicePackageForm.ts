import { useCallback, useEffect, useMemo, useState } from "react";

import type { Service, ServicePackage } from "../lib/domain";
import {
  createServicePackage,
  updateServicePackage,
  type ServicePackagePayload,
} from "../lib/servicePackages";
import type { ServicePackageFormCopy } from "../locales/types";
import { centsToInput, parsePrice } from "./useServiceForm";

type ServicePackageFormMode = "create" | "edit";

type UseServicePackageFormOptions = {
  mode: ServicePackageFormMode;
  servicePackage: ServicePackage | null | undefined;
  services: Service[];
  copy: ServicePackageFormCopy;
  onCreated?: (servicePackage: ServicePackage) => void;
  onUpdated?: (servicePackage: ServicePackage) => void;
};

type SubmitStatus = "invalid" | "created" | "updated";

type SubmitResult = {
  status: SubmitStatus;
  servicePackage?: ServicePackage;
};

type PackageFormItem = {
  id: string;
  serviceId: string;
  quantityText: string;
};

type PackageFormItemError = {
  service?: string;
  quantity?: string;
};

type UseServicePackageFormReturn = {
  isEditMode: boolean;
  name: string;
  setName: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  priceText: string;
  handlePriceChange: (text: string) => void;
  regularPriceText: string;
  handleRegularPriceChange: (text: string) => void;
  items: PackageFormItem[];
  addItem: () => void;
  removeItem: (id: string) => void;
  updateItemService: (id: string, serviceId: string) => void;
  updateItemQuantity: (id: string, quantity: string) => void;
  errors: { name?: string; price?: string; regularPrice?: string; items?: string };
  itemErrors: Record<string, PackageFormItemError>;
  valid: boolean;
  saving: boolean;
  submit: () => Promise<SubmitResult>;
};

const createItemId = () => `pkg-item-${Math.random().toString(36).slice(2, 10)}`;

const createEmptyItem = (services: Service[]): PackageFormItem => ({
  id: createItemId(),
  serviceId: services[0]?.id ?? "",
  quantityText: "1",
});

export function useServicePackageForm({
  mode,
  servicePackage = null,
  services,
  copy,
  onCreated,
  onUpdated,
}: UseServicePackageFormOptions): UseServicePackageFormReturn {
  const isEditMode = mode === "edit";

  const [name, setName] = useState(() => (isEditMode && servicePackage ? servicePackage.name : ""));
  const [description, setDescription] = useState(() =>
    isEditMode && servicePackage && servicePackage.description ? servicePackage.description : "",
  );
  const [priceText, setPriceText] = useState(() =>
    isEditMode && servicePackage ? centsToInput(servicePackage.price_cents) : copy.fields.pricePlaceholder,
  );
  const [regularPriceText, setRegularPriceText] = useState(() =>
    isEditMode && servicePackage && servicePackage.regular_price_cents !== null
      ? centsToInput(servicePackage.regular_price_cents)
      : "",
  );
  const [items, setItems] = useState<PackageFormItem[]>(() => {
    if (isEditMode && servicePackage) {
      return servicePackage.items.map((item) => ({
        id: createItemId(),
        serviceId: item.service_id,
        quantityText: String(item.quantity ?? 1),
      }));
    }
    return [createEmptyItem(services)];
  });
  const [saving, setSaving] = useState(false);

  const resetFromPackage = useCallback(
    (pkg: ServicePackage | null) => {
      if (pkg) {
        setName(pkg.name);
        setDescription(pkg.description ?? "");
        setPriceText(centsToInput(pkg.price_cents));
        setRegularPriceText(pkg.regular_price_cents !== null ? centsToInput(pkg.regular_price_cents) : "");
        setItems(
          pkg.items.length > 0
            ? pkg.items.map((item) => ({
                id: createItemId(),
                serviceId: item.service_id,
                quantityText: String(item.quantity ?? 1),
              }))
            : [createEmptyItem(services)],
        );
      } else {
        setName("");
        setDescription("");
        setPriceText(copy.fields.pricePlaceholder);
        setRegularPriceText("");
        setItems([createEmptyItem(services)]);
      }
    },
    [copy.fields.pricePlaceholder, services],
  );

  useEffect(() => {
    if (isEditMode && servicePackage) {
      resetFromPackage(servicePackage);
    } else if (!isEditMode) {
      resetFromPackage(null);
    }
  }, [isEditMode, resetFromPackage, servicePackage]);

  useEffect(() => {
    setItems((prev) => {
      if (prev.length > 0) {
        return prev;
      }
      return [createEmptyItem(services)];
    });
  }, [services]);

  const handlePriceChange = useCallback((text: string) => {
    setPriceText(text.replace(/[^0-9.,]/g, ""));
  }, []);

  const handleRegularPriceChange = useCallback((text: string) => {
    setRegularPriceText(text.replace(/[^0-9.,]/g, ""));
  }, []);

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, createEmptyItem(services)]);
  }, [services]);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateItemService = useCallback((id: string, serviceId: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, serviceId } : item)),
    );
  }, []);

  const updateItemQuantity = useCallback((id: string, quantity: string) => {
    const sanitized = quantity.replace(/[^0-9]/g, "");
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantityText: sanitized } : item)),
    );
  }, []);

  const priceCents = useMemo(() => parsePrice(priceText), [priceText]);
  const regularPriceCents = useMemo(() => {
    if (!regularPriceText.trim()) return null;
    const cents = parsePrice(regularPriceText);
    return Number.isFinite(cents) ? cents : NaN;
  }, [regularPriceText]);

  const itemErrors = useMemo(() => {
    const errors: Record<string, PackageFormItemError> = {};
    items.forEach((item) => {
      const current: PackageFormItemError = {};
      if (!item.serviceId || !services.some((svc) => svc.id === item.serviceId)) {
        current.service = copy.fields.itemServiceError;
      }
      const quantityValue = Number(item.quantityText);
      if (!item.quantityText.trim() || !Number.isFinite(quantityValue) || quantityValue <= 0) {
        current.quantity = copy.fields.itemQuantityError;
      }
      if (Object.keys(current).length > 0) {
        errors[item.id] = current;
      }
    });
    return errors;
  }, [copy.fields.itemQuantityError, copy.fields.itemServiceError, items, services]);

  const errors = useMemo(() => {
    const errs: { name?: string; price?: string; regularPrice?: string; items?: string } = {};
    if (!name.trim()) errs.name = copy.fields.nameError;
    if (!Number.isFinite(priceCents) || priceCents < 0) errs.price = copy.fields.priceError;
    if (regularPriceCents !== null && (!Number.isFinite(regularPriceCents) || regularPriceCents < 0)) {
      errs.regularPrice = copy.fields.regularPriceError;
    }
    if ((items ?? []).length === 0) {
      errs.items = copy.fields.itemsEmptyError;
    } else if (Object.keys(itemErrors).length > 0) {
      errs.items = copy.fields.itemsInvalidError;
    }
    return errs;
  }, [
    copy.fields.itemsEmptyError,
    copy.fields.itemsInvalidError,
    copy.fields.nameError,
    copy.fields.priceError,
    copy.fields.regularPriceError,
    itemErrors,
    items,
    name,
    priceCents,
    regularPriceCents,
  ]);

  const readyToSubmit = useMemo(() => {
    if (saving) return false;
    if (isEditMode && !servicePackage) return false;
    if (Object.keys(errors).length > 0) return false;
    return true;
  }, [errors, isEditMode, saving, servicePackage]);

  const buildPayload = useCallback((): ServicePackagePayload | null => {
    if (Object.keys(errors).length > 0) return null;
    const itemsPayload = items.map((item) => ({
      service_id: item.serviceId,
      quantity: Number(item.quantityText || "0"),
    }));

    return {
      name: name.trim(),
      description: description.trim() ? description.trim() : null,
      price_cents: priceCents,
      regular_price_cents: regularPriceCents,
      items: itemsPayload,
    };
  }, [description, errors, items, name, priceCents, regularPriceCents]);

  const submit = useCallback(async (): Promise<SubmitResult> => {
    if (!readyToSubmit) {
      return { status: "invalid" };
    }

    const payload = buildPayload();
    if (!payload) {
      return { status: "invalid" };
    }

    setSaving(true);
    try {
      if (isEditMode && servicePackage) {
        const updated = await updateServicePackage(servicePackage.id, payload);
        onUpdated?.(updated);
        resetFromPackage(updated);
        return { status: "updated", servicePackage: updated };
      }

      const created = await createServicePackage(payload);
      onCreated?.(created);
      resetFromPackage(null);
      return { status: "created", servicePackage: created };
    } finally {
      setSaving(false);
    }
  }, [
    buildPayload,
    isEditMode,
    onCreated,
    onUpdated,
    readyToSubmit,
    resetFromPackage,
    servicePackage,
  ]);

  const valid = readyToSubmit;

  return {
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
  };
}
