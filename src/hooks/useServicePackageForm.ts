import { useCallback, useEffect, useMemo, useState } from "react";
import type { Service, ServicePackage } from "../lib/domain";
import {
  createServicePackage,
  updateServicePackage,
} from "../lib/servicePackages";
import type { ServicePackageFormCopy } from "../locales/types";
import { centsToInput, parsePrice } from "./useServiceForm";

type ServicePackageFormMode = "create" | "edit";

type ServiceQuantityEntry = {
  service: Service;
  quantityText: string;
  quantity: number;
  totalPriceCents: number;
};

type UseServicePackageFormOptions = {
  mode: ServicePackageFormMode;
  servicePackage: ServicePackage | null | undefined;
  services: Service[];
  copy: ServicePackageFormCopy;
  onCreated?: (pkg: ServicePackage) => void;
  onUpdated?: (pkg: ServicePackage) => void;
};

type SubmitStatus = "invalid" | "created" | "updated";

type SubmitResult = { status: SubmitStatus; servicePackage?: ServicePackage };

export type UseServicePackageFormReturn = {
  isEditMode: boolean;
  name: string;
  setName: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  priceText: string;
  handlePriceChange: (text: string) => void;
  serviceEntries: ServiceQuantityEntry[];
  updateQuantity: (serviceId: string, text: string) => void;
  incrementQuantity: (serviceId: string) => void;
  decrementQuantity: (serviceId: string) => void;
  totalSessions: number;
  regularPriceCents: number;
  packagePriceCents: number;
  discountPercent: number;
  errors: Record<string, string>;
  valid: boolean;
  saving: boolean;
  submit: () => Promise<SubmitResult>;
};

function sanitizeQuantity(text: string) {
  return text.replace(/[^0-9]/g, "");
}

function toQuantity(text: string): number {
  const value = Number(text);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

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
    isEditMode && servicePackage ? servicePackage.description ?? "" : "",
  );
  const [priceText, setPriceText] = useState(() =>
    isEditMode && servicePackage
      ? centsToInput(servicePackage.price_cents)
      : copy.fields.pricePlaceholder.replace(/[^0-9.,]/g, ""),
  );
  const [quantities, setQuantities] = useState<Record<string, string>>(() => {
    if (isEditMode && servicePackage) {
      const entries: Record<string, string> = {};
      for (const item of servicePackage.items) {
        entries[item.service_id] = String(item.quantity);
      }
      return entries;
    }
    return {};
  });
  const [saving, setSaving] = useState(false);

  const serviceIdSet = useMemo(() => new Set(services.map((svc) => svc.id)), [services]);

  const resetFromPackage = useCallback(
    (pkg: ServicePackage | null) => {
      if (pkg) {
        setName(pkg.name);
        setDescription(pkg.description ?? "");
        setPriceText(centsToInput(pkg.price_cents));
        const entries: Record<string, string> = {};
        for (const item of pkg.items) {
          entries[item.service_id] = String(item.quantity);
        }
        setQuantities(entries);
      } else {
        setName("");
        setDescription("");
        setPriceText(copy.fields.pricePlaceholder.replace(/[^0-9.,]/g, ""));
        setQuantities({});
      }
    },
    [copy.fields.pricePlaceholder],
  );

  useEffect(() => {
    if (isEditMode && servicePackage) {
      resetFromPackage(servicePackage);
    } else if (!isEditMode) {
      resetFromPackage(null);
    }
  }, [isEditMode, servicePackage, resetFromPackage]);

  const serviceEntries = useMemo(() => {
    return services.map((service) => {
      const quantityText = quantities[service.id] ?? "0";
      const quantity = toQuantity(quantityText);
      return {
        service,
        quantityText,
        quantity,
        totalPriceCents: service.price_cents * quantity,
      } satisfies ServiceQuantityEntry;
    });
  }, [quantities, services]);

  const totalSessions = useMemo(
    () => serviceEntries.reduce((sum, entry) => sum + entry.quantity, 0),
    [serviceEntries],
  );

  const regularPriceCents = useMemo(
    () => serviceEntries.reduce((sum, entry) => sum + entry.totalPriceCents, 0),
    [serviceEntries],
  );

  const packagePriceCents = useMemo(() => parsePrice(priceText), [priceText]);

  const discountPercent = useMemo(() => {
    if (!Number.isFinite(packagePriceCents) || !Number.isFinite(regularPriceCents)) return 0;
    if (regularPriceCents <= 0 || packagePriceCents <= 0) return 0;
    if (packagePriceCents >= regularPriceCents) return 0;
    return ((regularPriceCents - packagePriceCents) / regularPriceCents) * 100;
  }, [packagePriceCents, regularPriceCents]);

  const errors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = copy.fields.nameError;
    if (totalSessions <= 0) errs.services = copy.fields.servicesError;
    if (!Number.isFinite(regularPriceCents) || regularPriceCents <= 0) {
      errs.services = copy.fields.servicesError;
    }
    if (!Number.isFinite(packagePriceCents) || packagePriceCents <= 0) {
      errs.price = copy.fields.priceError;
    } else if (packagePriceCents >= regularPriceCents) {
      errs.price = copy.fields.discountError;
    }
    return errs;
  }, [
    copy.fields.discountError,
    copy.fields.nameError,
    copy.fields.priceError,
    copy.fields.servicesError,
    name,
    packagePriceCents,
    regularPriceCents,
    totalSessions,
  ]);

  const readyToSubmit = useMemo(
    () => Object.keys(errors).length === 0 && (!isEditMode || !!servicePackage),
    [errors, isEditMode, servicePackage],
  );

  const valid = readyToSubmit && !saving;

  const updateQuantity = useCallback((serviceId: string, text: string) => {
    setQuantities((prev) => ({ ...prev, [serviceId]: sanitizeQuantity(text) }));
  }, []);

  const incrementQuantity = useCallback((serviceId: string) => {
    setQuantities((prev) => {
      const current = toQuantity(prev[serviceId] ?? "0");
      return { ...prev, [serviceId]: String(Math.min(current + 1, 999)) };
    });
  }, []);

  const decrementQuantity = useCallback((serviceId: string) => {
    setQuantities((prev) => {
      const current = toQuantity(prev[serviceId] ?? "0");
      const next = Math.max(0, current - 1);
      return { ...prev, [serviceId]: String(next) };
    });
  }, []);

  useEffect(() => {
    if (!isEditMode) return;
    if (!servicePackage) return;
    const missing = servicePackage.items.filter((item) => !serviceIdSet.has(item.service_id));
    if (missing.length === 0) return;
    setQuantities((prev) => {
      const next = { ...prev };
      for (const item of missing) {
        if (!(item.service_id in next)) {
          next[item.service_id] = String(item.quantity);
        }
      }
      return next;
    });
  }, [isEditMode, serviceIdSet, servicePackage]);

  const submit = useCallback(async (): Promise<SubmitResult> => {
    if (!readyToSubmit || saving) {
      return { status: "invalid" };
    }

    const items = Object.entries(quantities)
      .map(([serviceId, text]) => ({ serviceId, quantity: toQuantity(text) }))
      .filter((entry) => entry.quantity > 0);

    setSaving(true);
    try {
      if (isEditMode && servicePackage) {
        const updated = await updateServicePackage(servicePackage.id, {
          name: name.trim(),
          description: description.trim() || null,
          price_cents: packagePriceCents,
          regular_price_cents: regularPriceCents,
          items: items.map((item) => ({ service_id: item.serviceId, quantity: item.quantity })),
        });
        onUpdated?.(updated);
        resetFromPackage(updated);
        return { status: "updated", servicePackage: updated };
      }

      const created = await createServicePackage({
        name: name.trim(),
        description: description.trim() || null,
        price_cents: packagePriceCents,
        regular_price_cents: regularPriceCents,
        items: items.map((item) => ({ service_id: item.serviceId, quantity: item.quantity })),
      });
      onCreated?.(created);
      resetFromPackage(null);
      return { status: "created", servicePackage: created };
    } finally {
      setSaving(false);
    }
  }, [
    description,
    isEditMode,
    name,
    onCreated,
    onUpdated,
    packagePriceCents,
    quantities,
    readyToSubmit,
    regularPriceCents,
    resetFromPackage,
    saving,
    servicePackage,
  ]);

  return {
    isEditMode,
    name,
    setName,
    description,
    setDescription,
    priceText,
    handlePriceChange: (text: string) => setPriceText(text.replace(/[^0-9.,]/g, "")),
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
  };
}
