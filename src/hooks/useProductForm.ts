import { useCallback, useEffect, useMemo, useState } from "react";

import type { Product } from "../lib/domain";
import { createProduct, updateProduct } from "../lib/products";
import type { ProductFormCopy } from "../locales/types";
import { centsToInput, parsePrice } from "./useServiceForm";

export type ProductFormMode = "create" | "edit";

export type UseProductFormOptions = {
  mode: ProductFormMode;
  product: Product | null | undefined;
  copy: ProductFormCopy;
  onCreated?: (product: Product) => void;
  onUpdated?: (product: Product) => void;
};

export type SubmitStatus = "invalid" | "created" | "updated";

export type SubmitResult = {
  status: SubmitStatus;
  product?: Product;
};

export type UseProductFormReturn = {
  isEditMode: boolean;
  name: string;
  setName: (value: string) => void;
  sku: string;
  setSku: (value: string) => void;
  priceText: string;
  handlePriceChange: (text: string) => void;
  costText: string;
  handleCostChange: (text: string) => void;
  stockText: string;
  handleStockChange: (text: string) => void;
  description: string;
  setDescription: (value: string) => void;
  errors: Record<string, string>;
  valid: boolean;
  saving: boolean;
  submit: () => Promise<SubmitResult>;
};

export function useProductForm({
  mode,
  product = null,
  copy,
  onCreated,
  onUpdated,
}: UseProductFormOptions): UseProductFormReturn {
  const isEditMode = mode === "edit";

  const [name, setName] = useState(() => (isEditMode && product ? product.name : ""));
  const [sku, setSku] = useState(() => (isEditMode && product && product.sku ? product.sku : ""));
  const [priceText, setPriceText] = useState(() =>
    isEditMode && product
      ? centsToInput(product.price_cents)
      : copy.fields.pricePlaceholder.replace(/[^0-9.,]/g, ""),
  );
  const [costText, setCostText] = useState(() =>
    isEditMode && product && Number.isFinite(product.cost_cents)
      ? centsToInput(product.cost_cents ?? 0)
      : "",
  );
  const [stockText, setStockText] = useState(() =>
    isEditMode && product
      ? String(product.stock_quantity)
      : copy.fields.stockPlaceholder.replace(/[^0-9]/g, ""),
  );
  const [description, setDescription] = useState(() =>
    isEditMode && product && product.description ? product.description : "",
  );
  const [saving, setSaving] = useState(false);

  const setFromProduct = useCallback(
    (value: Product | null) => {
      if (value) {
        setName(value.name);
        setSku(value.sku ?? "");
        setPriceText(centsToInput(value.price_cents));
        setCostText(Number.isFinite(value.cost_cents ?? NaN) ? centsToInput(value.cost_cents ?? 0) : "");
        setStockText(String(value.stock_quantity));
        setDescription(value.description ?? "");
      } else {
        setName("");
        setSku("");
        setPriceText(copy.fields.pricePlaceholder.replace(/[^0-9.,]/g, ""));
        setCostText("");
        setStockText(copy.fields.stockPlaceholder.replace(/[^0-9]/g, ""));
        setDescription("");
      }
    },
    [copy.fields.pricePlaceholder, copy.fields.stockPlaceholder],
  );

  useEffect(() => {
    if (isEditMode && product) {
      setFromProduct(product);
    } else if (!isEditMode) {
      setFromProduct(null);
    }
  }, [isEditMode, product, setFromProduct]);

  const priceCents = useMemo(() => parsePrice(priceText), [priceText]);
  const costCents = useMemo(() => {
    if (!costText.trim()) return null;
    const value = parsePrice(costText);
    return Number.isFinite(value) ? value : NaN;
  }, [costText]);
  const stockQuantity = useMemo(() => {
    const numeric = Number(stockText);
    return Number.isFinite(numeric) ? Math.round(numeric) : NaN;
  }, [stockText]);

  const errors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = copy.fields.nameError;
    if (!Number.isFinite(priceCents) || priceCents < 0) errs.price = copy.fields.priceError;
    if (!Number.isFinite(stockQuantity) || stockQuantity < 0)
      errs.stock = copy.fields.stockError;
    if (costCents !== null && !Number.isFinite(costCents)) errs.cost = copy.fields.costError;
    return errs;
  }, [
    copy.fields.costError,
    copy.fields.nameError,
    copy.fields.priceError,
    copy.fields.stockError,
    costCents,
    name,
    priceCents,
    stockQuantity,
  ]);

  const readyToSubmit = useMemo(
    () => Object.keys(errors).length === 0 && (!isEditMode || !!product),
    [errors, isEditMode, product],
  );

  const valid = readyToSubmit && !saving;

  const handlePriceChange = useCallback((text: string) => {
    setPriceText(text.replace(/[^0-9.,]/g, ""));
  }, []);

  const handleCostChange = useCallback((text: string) => {
    setCostText(text.replace(/[^0-9.,]/g, ""));
  }, []);

  const handleStockChange = useCallback((text: string) => {
    setStockText(text.replace(/[^0-9]/g, ""));
  }, []);

  const submit = useCallback(async (): Promise<SubmitResult> => {
    if (!readyToSubmit || saving) {
      return { status: "invalid" };
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        sku: sku.trim() || null,
        price_cents: priceCents,
        stock_quantity: stockQuantity,
        description: description.trim() || null,
        cost_cents: costCents ?? null,
      };

      if (isEditMode && product) {
        const updated = await updateProduct(product.id, payload);
        setFromProduct(updated);
        onUpdated?.(updated);
        return { status: "updated", product: updated };
      }

      const created = await createProduct(payload);
      setFromProduct(null);
      onCreated?.(created);
      return { status: "created", product: created };
    } finally {
      setSaving(false);
    }
  }, [
    costCents,
    description,
    isEditMode,
    name,
    onCreated,
    onUpdated,
    priceCents,
    product,
    readyToSubmit,
    saving,
    setFromProduct,
    sku,
    stockQuantity,
  ]);

  return {
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
  };
}
