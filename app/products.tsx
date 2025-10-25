import React from "react";
import { Modal, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";

import AuthenticatedApp, {
  type ProductsScreenProps,
  type ProductsScreenRenderer,
} from "../src/app/AuthenticatedApp";
import { LanguageProvider } from "../src/contexts/LanguageContext";
import ProductForm from "../src/components/ProductForm";
import { formatPrice } from "../src/lib/domain";
import { applyAlpha, mixHexColor } from "../src/utils/color";
import { cashRegisterRenderer } from "./cash-register";
import { bookingsRenderer } from "./bookings";
import { servicesRenderer } from "./services";

export function ProductsScreen({
  isCompactLayout,
  colors,
  styles,
  productsCopy,
  productsLoading,
  loadProducts,
  handleOpenCreateProduct,
  productFormVisible,
  productFormMode,
  productBeingEdited,
  handleProductCreated,
  handleProductUpdated,
  handleProductFormClose,
  productFormCopy,
  localizedProducts,
  productMap,
  resolvedTheme,
  handleOpenSellProduct,
  handleOpenRestockProduct,
  handleOpenEditProduct,
  handleDeleteProduct,
  stockModalProduct,
  stockModalDisplayProduct,
  stockModalMode,
  stockQuantityText,
  handleStockQuantityChange,
  handleCloseStockModal,
  handleConfirmStockModal,
  stockSaving,
}: ProductsScreenProps): React.ReactElement {
  return (
    <>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: isCompactLayout ? 16 : 20, gap: 16 }}
        refreshControl={<RefreshControl refreshing={productsLoading} onRefresh={loadProducts} />}
      >
        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 12 }]}>
          <View style={[styles.listHeaderRow, isCompactLayout && styles.listHeaderRowCompact]}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.title, { color: colors.text }]}>{productsCopy.title}</Text>
              <Text style={{ color: colors.subtext, fontSize: 13, fontWeight: "600" }}>
                {productsCopy.subtitle}
              </Text>
            </View>
            <Pressable
              onPress={handleOpenCreateProduct}
              style={[styles.defaultCta, { marginTop: 0 }, isCompactLayout && styles.fullWidthButton]}
              accessibilityRole="button"
              accessibilityLabel={productsCopy.createCta.accessibility}
            >
              <Text style={styles.defaultCtaText}>{productsCopy.createCta.label}</Text>
            </Pressable>
          </View>
        </View>

        {productFormVisible ? (
          <ProductForm
            mode={productFormMode}
            product={productFormMode === "edit" ? productBeingEdited : null}
            onCreated={handleProductCreated}
            onUpdated={handleProductUpdated}
            onCancel={handleProductFormClose}
            colors={{
              text: colors.text,
              subtext: colors.subtext,
              border: colors.border,
              surface: colors.surface,
              accent: colors.accent,
              accentFgOn: colors.accentFgOn,
              danger: colors.danger,
            }}
            copy={productFormCopy}
          />
        ) : null}

        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 12 }]}>
          <Text style={[styles.title, { color: colors.text }]}>{productsCopy.listTitle}</Text>
          {localizedProducts.length === 0 ? (
            <Text style={[styles.empty, { marginVertical: 8 }]}>{productsCopy.empty}</Text>
          ) : (
            localizedProducts.map((product) => {
              const original = productMap.get(product.id) ?? product;
              const disableSell = original.stock_quantity <= 0;
              const isLowStock = original.stock_quantity <= 5;
              const stockBorderColor = mixHexColor(
                colors.border,
                isLowStock ? colors.danger : colors.accent,
                0.45,
              );
              const stockBackgroundColor = applyAlpha(
                isLowStock ? colors.danger : colors.accent,
                resolvedTheme === "dark" ? 0.28 : 0.12,
              );
              const stockLabelColor = isLowStock ? colors.danger : colors.accent;
              return (
                <View
                  key={product.id}
                  style={[
                    styles.productCard,
                    {
                      borderColor: mixHexColor(colors.border, colors.accent, 0.25),
                      backgroundColor: mixHexColor(
                        colors.surface,
                        colors.accent,
                        resolvedTheme === "dark" ? 0.14 : 0.06,
                      ),
                    },
                    isCompactLayout && styles.productCardCompact,
                  ]}
                >
                  <View style={styles.productHeader}>
                    <Text style={[styles.productName, { color: colors.text }]}>{product.name}</Text>
                    {original.sku ? (
                      <View
                        style={[
                          styles.productChip,
                          styles.productSkuChip,
                          {
                            borderColor: mixHexColor(colors.border, colors.surface, 0.45),
                            backgroundColor: mixHexColor(
                              colors.surface,
                              colors.border,
                              resolvedTheme === "dark" ? 0.38 : 0.18,
                            ),
                          },
                        ]}
                      >
                        <Text style={[styles.productChipLabel, { color: colors.subtext }]}>
                          {productsCopy.skuLabel}
                        </Text>
                        <Text style={[styles.productChipValue, { color: colors.subtext }]}>
                          {original.sku}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.productChipRow}>
                    <View
                      style={[
                        styles.productChip,
                        {
                          borderColor: mixHexColor(colors.border, colors.accent, 0.35),
                          backgroundColor: applyAlpha(
                            colors.accent,
                            resolvedTheme === "dark" ? 0.25 : 0.1,
                          ),
                        },
                      ]}
                    >
                      <Text style={[styles.productChipLabel, { color: colors.accent }]}>
                        {productsCopy.priceLabel}
                      </Text>
                      <Text style={[styles.productChipValue, { color: colors.text }]}>
                        {formatPrice(original.price_cents)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.productChip,
                        {
                          borderColor: stockBorderColor,
                          backgroundColor: stockBackgroundColor,
                        },
                      ]}
                    >
                      <Text style={[styles.productChipLabel, { color: stockLabelColor }]}>
                        {productsCopy.stockLabel}
                      </Text>
                      <Text style={[styles.productChipValue, { color: colors.text }]}>
                        {productsCopy.stockValue(original.stock_quantity)}
                      </Text>
                    </View>
                  </View>

                  {original.description ? (
                    <View style={styles.productDescriptionBlock}>
                      <Text style={[styles.productChipLabel, { color: colors.subtext }]}>
                        {productsCopy.descriptionLabel}
                      </Text>
                      <Text style={[styles.productDescription, { color: colors.subtext }]}>
                        {original.description}
                      </Text>
                    </View>
                  ) : null}

                  <View
                    style={[
                      styles.productActionsContainer,
                      isCompactLayout && styles.productActionsContainerStacked,
                    ]}
                  >
                    <Pressable
                      onPress={() => handleOpenSellProduct(original)}
                      disabled={disableSell}
                      style={[
                        styles.productActionButton,
                        styles.productPrimaryAction,
                        disableSell && styles.productActionDisabled,
                        isCompactLayout && styles.productActionButtonFullWidth,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={productsCopy.actions.sell.accessibility(product.name)}
                    >
                      <Text
                        style={[
                          styles.productActionLabel,
                          styles.productActionPrimaryLabel,
                          disableSell && styles.productActionDisabledLabel,
                        ]}
                      >
                        {productsCopy.actions.sell.label}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleOpenRestockProduct(original)}
                      style={[
                        styles.productActionButton,
                        styles.productPrimaryAction,
                        isCompactLayout && styles.productActionButtonFullWidth,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={productsCopy.actions.restock.accessibility(product.name)}
                    >
                      <Text style={[styles.productActionLabel, styles.productActionPrimaryLabel]}>
                        {productsCopy.actions.restock.label}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleOpenEditProduct(original)}
                      style={[
                        styles.productActionButton,
                        styles.productSecondaryAction,
                        isCompactLayout && styles.productActionButtonFullWidth,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={productsCopy.actions.edit.accessibility(product.name)}
                    >
                      <Text style={[styles.productActionLabel, styles.productActionSecondaryLabel]}>
                        {productsCopy.actions.edit.label}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleDeleteProduct(original)}
                      style={[
                        styles.productActionButton,
                        styles.productDangerAction,
                        isCompactLayout && styles.productActionButtonFullWidth,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={productsCopy.actions.delete.accessibility(product.name)}
                    >
                      <Text style={[styles.productActionLabel, styles.productActionDangerLabel]}>
                        {productsCopy.actions.delete.label}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <Modal
        visible={!!stockModalProduct}
        transparent
        animationType="fade"
        onRequestClose={handleCloseStockModal}
      >
        <View style={styles.stockModalBackdrop}>
          <View
            style={[
              styles.stockModalCard,
              { borderColor: colors.border, backgroundColor: colors.sidebarBg },
            ]}
          >
            <Text style={[styles.stockModalTitle, { color: colors.text }]}>
              {stockModalProduct
                ? stockModalMode === "sell"
                  ? productsCopy.stockModal.sellTitle(
                      stockModalDisplayProduct?.name ?? stockModalProduct.name,
                    )
                  : productsCopy.stockModal.restockTitle(
                      stockModalDisplayProduct?.name ?? stockModalProduct.name,
                    )
                : ""}
            </Text>
            <Text style={[styles.stockModalSubtitle, { color: colors.subtext }]}>
              {stockModalProduct
                ? stockModalMode === "sell"
                  ? productsCopy.stockModal.sellSubtitle(stockModalProduct.stock_quantity)
                  : productsCopy.stockModal.restockSubtitle
                : ""}
            </Text>
            <Text style={[styles.stockModalLabel, { color: colors.subtext }]}>
              {productsCopy.stockModal.quantityLabel}
            </Text>
            <TextInput
              value={stockQuantityText}
              onChangeText={handleStockQuantityChange}
              keyboardType="number-pad"
              placeholder={productsCopy.stockModal.quantityPlaceholder}
              placeholderTextColor="#94a3b8"
              style={[styles.stockQuantityInput, { borderColor: colors.border, color: colors.text }]}
            />
            <View style={styles.stockModalActions}>
              <Pressable
                onPress={handleCloseStockModal}
                style={[styles.smallBtn, { borderColor: colors.border }]}
                accessibilityRole="button"
                accessibilityLabel={productsCopy.stockModal.cancel}
              >
                <Text style={{ color: colors.subtext, fontWeight: "800" }}>
                  {productsCopy.stockModal.cancel}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmStockModal}
                disabled={stockSaving}
                style={[
                  styles.smallBtn,
                  {
                    borderColor: colors.accent,
                    backgroundColor: stockSaving
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(37,99,235,0.12)",
                  },
                  stockSaving && styles.smallBtnDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel={
                  stockModalMode === "sell"
                    ? productsCopy.stockModal.confirmSell
                    : productsCopy.stockModal.confirmRestock
                }
              >
                <Text style={{ color: colors.accent, fontWeight: "800" }}>
                  {stockSaving
                    ? productFormCopy.buttons.saving
                    : stockModalMode === "sell"
                      ? productsCopy.stockModal.confirmSell
                      : productsCopy.stockModal.confirmRestock}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

export const productsRenderer: ProductsScreenRenderer = (props) => <ProductsScreen {...props} />;

export default function Products(): React.ReactElement {
  return (
    <LanguageProvider>
      <AuthenticatedApp
        initialScreen="products"
        renderBookings={bookingsRenderer}
        renderCashRegister={cashRegisterRenderer}
        renderProducts={productsRenderer}
        renderServices={servicesRenderer}
      />
    </LanguageProvider>
  );
}
