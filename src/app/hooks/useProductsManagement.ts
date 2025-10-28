import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Platform } from "react-native";

import type { Product } from "../../lib/domain";
import {
  listProducts,
  deleteProduct,
  sellProduct,
  restockProduct,
  listProductSalesTotals,
} from "../../lib/products";
import { recordProductSale, type CashEntry } from "../../lib/cashRegister";
import { polyglotProductName } from "../../lib/polyglot";
import type { SupportedLanguage } from "../../locales/language";
import type { AuthenticatedAppCopy } from "../copy/authenticatedAppCopy";

type ProductsCopy = AuthenticatedAppCopy[SupportedLanguage]["productsPage"];
type ProductFormCopy = AuthenticatedAppCopy[SupportedLanguage]["productForm"];
type CashRegisterCopy = AuthenticatedAppCopy[SupportedLanguage]["cashRegisterPage"];

type UseProductsManagementOptions = {
  productsCopy: ProductsCopy;
  productFormCopy: ProductFormCopy;
  cashRegisterCopy: CashRegisterCopy;
  language: SupportedLanguage;
  locale: string;
  appendCashEntry: (entry: CashEntry) => void;
  getProductDisplayName: (product: Product) => string;
  getDisplayProduct: (product: Product) => Product;
};

export function useProductsManagement({
  productsCopy,
  productFormCopy,
  cashRegisterCopy,
  language,
  locale,
  appendCashEntry,
  getProductDisplayName,
  getDisplayProduct,
}: UseProductsManagementOptions) {
  const [products, setProducts] = useState<Product[]>([]);
  const [productSalesTotals, setProductSalesTotals] = useState<Record<string, number>>({});
  const [productsLoading, setProductsLoading] = useState(false);
  const [productFormVisible, setProductFormVisible] = useState(false);
  const [productFormMode, setProductFormMode] = useState<"create" | "edit">("create");
  const [productBeingEdited, setProductBeingEdited] = useState<Product | null>(null);
  const [stockModalProduct, setStockModalProduct] = useState<Product | null>(null);
  const [stockModalMode, setStockModalMode] = useState<"sell" | "restock">("sell");
  const [stockQuantityText, setStockQuantityText] = useState("1");
  const [stockSaving, setStockSaving] = useState(false);

  const sortProducts = useCallback(
    (list: Product[]) =>
      [...list].sort((a, b) =>
        polyglotProductName(a, language).localeCompare(polyglotProductName(b, language), locale, {
          sensitivity: "base",
        }),
      ),
    [language, locale],
  );

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const [rows, totals] = await Promise.all([listProducts(), listProductSalesTotals()]);
      setProducts(sortProducts(rows));
      setProductSalesTotals(() => {
        const next: Record<string, number> = {};
        rows.forEach((product) => {
          next[product.id] = totals[product.id] ?? 0;
        });
        return next;
      });
    } catch (error: any) {
      console.error(error);
      Alert.alert(productsCopy.alerts.loadTitle, error?.message ?? String(error));
      setProducts([]);
      setProductSalesTotals({});
    } finally {
      setProductsLoading(false);
    }
  }, [productsCopy.alerts.loadTitle, sortProducts]);

  const handleProductFormClose = useCallback(() => {
    setProductFormVisible(false);
    setProductBeingEdited(null);
    setProductFormMode("create");
  }, []);

  const handleOpenCreateProduct = useCallback(() => {
    setProductFormMode("create");
    setProductBeingEdited(null);
    setProductFormVisible(true);
  }, []);

  const handleOpenEditProduct = useCallback((product: Product) => {
    setProductFormMode("edit");
    setProductBeingEdited(product);
    setProductFormVisible(true);
  }, []);

  const handleProductCreated = useCallback(
    (product: Product) => {
      setProducts((prev) => sortProducts([...prev, product]));
      setProductSalesTotals((prev) => ({
        ...prev,
        [product.id]: prev[product.id] ?? 0,
      }));
      handleProductFormClose();
    },
    [handleProductFormClose, sortProducts],
  );

  const handleProductUpdated = useCallback(
    (product: Product) => {
      setProducts((prev) => sortProducts(prev.map((item) => (item.id === product.id ? product : item))));
      setProductSalesTotals((prev) => ({
        ...prev,
        [product.id]: prev[product.id] ?? 0,
      }));
      handleProductFormClose();
    },
    [handleProductFormClose, sortProducts],
  );

  const handleDeleteProduct = useCallback(
    (product: Product) => {
      if (!product?.id) {
        return;
      }

      const displayName = getProductDisplayName(product);
      const confirmPrompt = `${productsCopy.alerts.deleteTitle}\n\n${productsCopy.alerts.deleteMessage(displayName)}`;

      const executeDelete = async () => {
        try {
          await deleteProduct(product.id);
          setProducts((prev) => prev.filter((item) => item.id !== product.id));
          setProductSalesTotals((prev) => {
            const { [product.id]: _ignored, ...rest } = prev;
            return rest;
          });
        } catch (error: any) {
          console.error(error);
          Alert.alert(productsCopy.alerts.deleteErrorTitle, error?.message ?? String(error));
        }
      };

      if (Platform.OS === "web" && typeof window !== "undefined") {
        const confirmed = window.confirm(confirmPrompt);
        if (confirmed) {
          void executeDelete();
        }
        return;
      }

      Alert.alert(productsCopy.alerts.deleteTitle, productsCopy.alerts.deleteMessage(displayName), [
        { text: productsCopy.alerts.cancel, style: "cancel" },
        {
          text: productsCopy.alerts.confirm,
          style: "destructive",
          onPress: () => void executeDelete(),
        },
      ]);
    },
    [getProductDisplayName, productsCopy],
  );

  const handleOpenSellProduct = useCallback((product: Product) => {
    setStockModalMode("sell");
    setStockModalProduct(product);
    setStockQuantityText("1");
  }, []);

  const handleOpenRestockProduct = useCallback((product: Product) => {
    setStockModalMode("restock");
    setStockModalProduct(product);
    setStockQuantityText("1");
  }, []);

  const handleCloseStockModal = useCallback(() => {
    setStockModalProduct(null);
    setStockQuantityText("1");
    setStockSaving(false);
  }, []);

  const handleStockQuantityChange = useCallback((text: string) => {
    setStockQuantityText(text.replace(/[^0-9]/g, ""));
  }, []);

  const handleConfirmStockModal = useCallback(async () => {
    if (!stockModalProduct) {
      return;
    }

    const numericText = stockQuantityText.replace(/[^0-9]/g, "");
    const quantity = Number(numericText);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      Alert.alert(productsCopy.stockModal.quantityError);
      return;
    }

    setStockSaving(true);
    try {
      let updated: Product;
      if (stockModalMode === "sell") {
        updated = await sellProduct(stockModalProduct.id, quantity);
        try {
          const entry = await recordProductSale({
            productId: updated.id,
            productName: updated.name,
            unitPriceCents: updated.price_cents,
            quantity,
          });
          appendCashEntry(entry);
        } catch (registerError: any) {
          console.error(registerError);
          Alert.alert(
            cashRegisterCopy.alerts.recordSaleFailedTitle,
            cashRegisterCopy.alerts.recordSaleFailedMessage(polyglotProductName(updated, language)),
          );
        }
        Alert.alert(
          productsCopy.stockModal.sellSuccessTitle,
          productsCopy.stockModal.sellSuccessMessage(polyglotProductName(updated, language), quantity),
        );
      } else {
        updated = await restockProduct(stockModalProduct.id, quantity);
        Alert.alert(
          productsCopy.stockModal.restockSuccessTitle,
          productsCopy.stockModal.restockSuccessMessage(polyglotProductName(updated, language), quantity),
        );
      }

      setProducts((prev) => sortProducts(prev.map((item) => (item.id === updated.id ? updated : item))));
      if (stockModalMode === "sell") {
        setProductSalesTotals((prev) => ({
          ...prev,
          [updated.id]: (prev[updated.id] ?? 0) + quantity,
        }));
      }
      handleCloseStockModal();
    } catch (error: any) {
      const title =
        stockModalMode === "sell"
          ? productsCopy.alerts.sellErrorTitle
          : productsCopy.alerts.restockErrorTitle;
      console.error(error);
      Alert.alert(title, error?.message ?? String(error));
    } finally {
      setStockSaving(false);
    }
  }, [
    appendCashEntry,
    cashRegisterCopy.alerts,
    handleCloseStockModal,
    language,
    productsCopy.alerts,
    productsCopy.stockModal,
    sortProducts,
    stockModalMode,
    stockModalProduct,
    stockQuantityText,
  ]);

  const stockModalDisplayProduct = useMemo(() => {
    if (!stockModalProduct) {
      return null;
    }
    return getDisplayProduct(stockModalProduct);
  }, [getDisplayProduct, stockModalProduct]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    setProducts((prev) => sortProducts(prev));
  }, [sortProducts]);

  return {
    products,
    productSalesTotals,
    productsLoading,
    productFormVisible,
    productFormMode,
    productBeingEdited,
    stockModalProduct,
    stockModalMode,
    stockModalDisplayProduct,
    stockQuantityText,
    stockSaving,
    loadProducts,
    handleProductFormClose,
    handleOpenCreateProduct,
    handleOpenEditProduct,
    handleProductCreated,
    handleProductUpdated,
    handleDeleteProduct,
    handleOpenSellProduct,
    handleOpenRestockProduct,
    handleCloseStockModal,
    handleStockQuantityChange,
    handleConfirmStockModal,
  };
}

export type UseProductsManagementReturn = ReturnType<typeof useProductsManagement>;
