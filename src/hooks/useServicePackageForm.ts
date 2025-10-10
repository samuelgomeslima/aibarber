import { useCallback, useEffect, useMemo, useState } from "react";

import type { Service, ServicePackage } from "../lib/domain";
import {
  createServicePackage,
  updateServicePackage,
  type ServicePackageInput,
} from "../lib/packages";
import type { ServicePackageFormCopy } from "../locales/types";
import { centsToInput, parsePrice } from "./useServiceForm";

export type ServicePackageFormMode = "create" | "edit";

type PackageItemState = {
  key: string;
  serviceId: string | null;
  quantityText: string;
};

type PackageItemErrors = {
  service?: string;
  quantity?: string;
};

export type UseServicePackageFormOptions = {
  mode: ServicePackageFormMode;
  servicePackage: ServicePackage | null | undefined;
  services: Service[];
  copy: ServicePackageFormCopy;
  onCreated?: (value: ServicePackage) => void;
  onUpdated?: (value: ServicePackage) => void;
};

type SubmitStatus = "invalid" | "created" | "updated";

export type ServicePackageFormState = {
  isEditMode: boolean;
  name: string;
  setName: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  regularPriceText: string;
  handleRegularPriceChange: (value: string) => void;
  packagePriceText: string;
  handlePackagePriceChange: (value: string) => void;
  items: PackageItemState[];
  itemErrors: Record<string, PackageItemErrors>;
  addItem: () => void;
  removeItem: (key: string) => void;
  updateItemService: (key: string, serviceId: string | null) => void;
  updateItemQuantity: (key: string, value: string) => void;
  canAddService: boolean;
  errors: Record<string, string>;
  valid: boolean;
  saving: boolean;
  submit: () => Promise<{ status: SubmitStatus; servicePackage?: ServicePackage }>;
};

const makeItemKey = () => `pkg_item_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;

export function useServicePackageForm({
  mode,
  servicePackage = null,
  services,
  copy,
  onCreated,
  onUpdated,
}: UseServicePackageFormOptions): ServicePackageFormState {
  const isEditMode = mode === "edit";

  const [name, setName] = useState(() => (isEditMode && servicePackage ? servicePackage.name : ""));
  const [description, setDescription] = useState(() =>
    isEditMode && servicePackage && servicePackage.description ? servicePackage.description : "",
  );
  const [regularPriceText, setRegularPriceText] = useState(() =>
    isEditMode && servicePackage
      ? centsToInput(servicePackage.regular_price_cents)
      : copy.fields.regularPricePlaceholder.replace(/[^0-9.,]/g, ""),
  );
  const [packagePriceText, setPackagePriceText] = useState(() =>
    isEditMode && servicePackage
      ? centsToInput(servicePackage.price_cents)
      : copy.fields.pricePlaceholder.replace(/[^0-9.,]/g, ""),
  );
  const [items, setItems] = useState<PackageItemState[]>(() => {
    if (isEditMode && servicePackage) {
      return servicePackage.items.map((item) => ({
        key: makeItemKey(),
        serviceId: item.service_id,
        quantityText: String(item.quantity),
      }));
    }
    const defaultServiceId = services[0]?.id ?? null;
    return [
      {
        key: makeItemKey(),
        serviceId: defaultServiceId,
        quantityText: copy.fields.quantityPlaceholder.replace(/[^0-9]/g, "") || "1",
      },
    ];
  });
  const [saving, setSaving] = useState(false);

  const setFromPackage = useCallback(
    (pkg: ServicePackage | null) => {
      if (pkg) {
        setName(pkg.name);
        setDescription(pkg.description ?? "");
        setRegularPriceText(centsToInput(pkg.regular_price_cents));
        setPackagePriceText(centsToInput(pkg.price_cents));
        setItems(
          pkg.items.length
            ? pkg.items.map((item) => ({
                key: makeItemKey(),
                serviceId: item.service_id,
                quantityText: String(item.quantity),
              }))
            : [
                {
                  key: makeItemKey(),
                  serviceId: services[0]?.id ?? null,
                  quantityText: copy.fields.quantityPlaceholder.replace(/[^0-9]/g, "") || "1",
                },
              ],
        );
      } else {
        setName("");
        setDescription("");
        setRegularPriceText(copy.fields.regularPricePlaceholder.replace(/[^0-9.,]/g, ""));
        setPackagePriceText(copy.fields.pricePlaceholder.replace(/[^0-9.,]/g, ""));
        setItems([
          {
            key: makeItemKey(),
            serviceId: services[0]?.id ?? null,
            quantityText: copy.fields.quantityPlaceholder.replace(/[^0-9]/g, "") || "1",
          },
        ]);
      }
    },
    [copy.fields.pricePlaceholder, copy.fields.quantityPlaceholder, copy.fields.regularPricePlaceholder, services],
  );

  useEffect(() => {
    if (isEditMode && servicePackage) {
      setFromPackage(servicePackage);
    } else if (!isEditMode) {
      setFromPackage(null);
    }
  }, [isEditMode, servicePackage, setFromPackage]);

  useEffect(() => {
    setItems((current) => {
      if (!services.length) {
        return current.map((item) => ({ ...item, serviceId: null }));
      }
      const firstService = services[0].id;
      return current.map((item) =>
        item.serviceId && services.some((svc) => svc.id === item.serviceId)
          ? item
          : { ...item, serviceId: firstService },
      );
    });
  }, [services]);

  const handleRegularPriceChange = useCallback((value: string) => {
    setRegularPriceText(value.replace(/[^0-9.,]/g, ""));
  }, []);

  const handlePackagePriceChange = useCallback((value: string) => {
    setPackagePriceText(value.replace(/[^0-9.,]/g, ""));
  }, []);

  const addItem = useCallback(() => {
    setItems((current) => [
      ...current,
      {
        key: makeItemKey(),
        serviceId: services[0]?.id ?? null,
        quantityText: copy.fields.quantityPlaceholder.replace(/[^0-9]/g, "") || "1",
      },
    ]);
  }, [copy.fields.quantityPlaceholder, services]);

  const removeItem = useCallback((key: string) => {
    setItems((current) => {
      if (current.length <= 1) {
        return [
          {
            key: makeItemKey(),
            serviceId: services[0]?.id ?? null,
            quantityText: copy.fields.quantityPlaceholder.replace(/[^0-9]/g, "") || "1",
          },
        ];
      }
      return current.filter((item) => item.key !== key);
    });
  }, [copy.fields.quantityPlaceholder, services]);

  const updateItemService = useCallback((key: string, serviceId: string | null) => {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, serviceId } : item)),
    );
  }, []);

  const updateItemQuantity = useCallback((key: string, value: string) => {
    setItems((current) =>
      current.map((item) =>
        item.key === key
          ? { ...item, quantityText: value.replace(/[^0-9]/g, "") }
          : item,
      ),
    );
  }, []);

  const regularPriceCents = useMemo(() => parsePrice(regularPriceText), [regularPriceText]);
  const packagePriceCents = useMemo(() => parsePrice(packagePriceText), [packagePriceText]);

  const itemErrors = useMemo(() => {
    const map: Record<string, PackageItemErrors> = {};
    items.forEach((item) => {
      const errs: PackageItemErrors = {};
      if (!item.serviceId) {
        errs.service = copy.fields.servicesEmpty;
      }
      const quantity = Number(item.quantityText);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        errs.quantity = copy.fields.quantityError;
      }
      if (Object.keys(errs).length > 0) {
        map[item.key] = errs;
      }
    });
    return map;
  }, [copy.fields.quantityError, copy.fields.servicesEmpty, items]);

  const baseErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = copy.fields.nameError;
    if (!Number.isFinite(regularPriceCents) || regularPriceCents < 0)
      errs.regularPrice = copy.fields.regularPriceError;
    if (!Number.isFinite(packagePriceCents) || packagePriceCents < 0)
      errs.packagePrice = copy.fields.priceError;
    if (Number.isFinite(regularPriceCents) && Number.isFinite(packagePriceCents)) {
      if ((regularPriceCents ?? 0) < (packagePriceCents ?? 0)) {
        errs.packagePrice = copy.fields.priceError;
      }
    }
    if (!items.length) {
      errs.items = copy.fields.servicesEmpty;
    }
    return errs;
  }, [
    copy.fields.nameError,
    copy.fields.priceError,
    copy.fields.regularPriceError,
    copy.fields.servicesEmpty,
    items.length,
    name,
    packagePriceCents,
    regularPriceCents,
  ]);

  const readyToSubmit = useMemo(() => {
    if (Object.keys(baseErrors).length > 0) return false;
    if (Object.keys(itemErrors).length > 0) return false;
    if (isEditMode && !servicePackage) return false;
    return true;
  }, [baseErrors, itemErrors, isEditMode, servicePackage]);

  const canAddService = services.length > 0;

  const submit = useCallback(async () => {
    if (!readyToSubmit || saving) {
      return { status: "invalid" as const };
    }

    setSaving(true);
    try {
      const payload: ServicePackageInput = {
        name: name.trim(),
        description: description.trim() || null,
        regular_price_cents: regularPriceCents,
        price_cents: packagePriceCents,
        items: items.map((item) => ({
          service_id: item.serviceId ?? "",
          quantity: Number(item.quantityText),
        })),
      };

      if (isEditMode && servicePackage) {
        const updated = await updateServicePackage(servicePackage.id, payload);
        setFromPackage(updated);
        onUpdated?.(updated);
        return { status: "updated" as const, servicePackage: updated };
      }

      const created = await createServicePackage(payload);
      setFromPackage(null);
      onCreated?.(created);
      return { status: "created" as const, servicePackage: created };
    } finally {
      setSaving(false);
    }
  }, [
    description,
    isEditMode,
    items,
    name,
    onCreated,
    onUpdated,
    packagePriceCents,
    readyToSubmit,
    regularPriceCents,
    saving,
    servicePackage,
    setFromPackage,
  ]);

  return {
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
    errors: baseErrors,
    valid: readyToSubmit && !saving,
    saving,
    submit,
  };
}
