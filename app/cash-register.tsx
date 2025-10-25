import React, { useCallback } from "react";
import { Modal, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";

import AuthenticatedApp, {
  type CashRegisterScreenProps,
  type CashRegisterScreenRenderer,
} from "../src/app/AuthenticatedApp";
import { LanguageProvider } from "../src/contexts/LanguageContext";
import { bookingsRenderer } from "./bookings";
import { productsRenderer } from "./products";
import { servicesRenderer } from "./services";
import { formatPrice } from "../src/lib/domain";

export function CashRegisterScreen({
  isCompactLayout,
  colors,
  styles,
  cashRegisterCopy,
  cashLoading,
  loadCashRegister,
  cashSummary,
  cashEntries,
  cashEntryTypeLabels,
  locale,
  adjustmentModalOpen,
  adjustmentAmountText,
  adjustmentNote,
  adjustmentReference,
  adjustmentSaving,
  adjustmentError,
  handleOpenAdjustmentModal,
  handleCloseAdjustmentModal,
  handleAdjustmentAmountChange,
  handleAdjustmentNoteChange,
  handleAdjustmentReferenceChange,
  handleConfirmAdjustment,
}: CashRegisterScreenProps): React.ReactElement {
  const handleRefresh = useCallback(() => {
    void loadCashRegister();
  }, [loadCashRegister]);

  return (
    <>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: isCompactLayout ? 16 : 20, gap: 16 }}
        refreshControl={<RefreshControl refreshing={cashLoading} onRefresh={handleRefresh} />}
      >
        <View
          style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 12 }]}
        >
          <View style={[styles.listHeaderRow, isCompactLayout && styles.listHeaderRowCompact]}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.title, { color: colors.text }]}>{cashRegisterCopy.title}</Text>
              <Text style={{ color: colors.subtext, fontSize: 13, fontWeight: "600" }}>
                {cashRegisterCopy.subtitle}
              </Text>
            </View>
            <View
              style={[
                styles.cashHeaderActions,
                isCompactLayout && styles.cashHeaderActionsCompact,
              ]}
            >
              <Pressable
                onPress={handleOpenAdjustmentModal}
                style={[styles.secondaryCta, isCompactLayout && styles.fullWidthButton]}
                accessibilityRole="button"
                accessibilityLabel={cashRegisterCopy.adjustmentCta.accessibility}
              >
                <Text style={styles.secondaryCtaText}>{cashRegisterCopy.adjustmentCta.label}</Text>
              </Pressable>
              <Pressable
                onPress={handleRefresh}
                style={[styles.defaultCta, { marginTop: 0 }, isCompactLayout && styles.fullWidthButton]}
                accessibilityRole="button"
                accessibilityLabel={cashRegisterCopy.refreshAccessibility}
              >
                <Text style={styles.defaultCtaText}>{cashRegisterCopy.refresh}</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View
          style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 16 }]}
        >
          <Text style={[styles.title, { color: colors.text, fontSize: 18 }]}>
            {cashRegisterCopy.summaryTitle}
          </Text>
          <View style={styles.cashSummaryGrid}>
            {[
              { key: "total", label: cashRegisterCopy.summary.total, amount: cashSummary.total_cents },
              {
                key: "services",
                label: cashRegisterCopy.summary.services,
                amount: cashSummary.service_sales_cents,
              },
              {
                key: "products",
                label: cashRegisterCopy.summary.products,
                amount: cashSummary.product_sales_cents,
              },
              {
                key: "adjustments",
                label: cashRegisterCopy.summary.adjustments,
                amount: cashSummary.adjustments_cents,
              },
            ].map((item) => (
              <View key={item.key} style={[styles.cashSummaryItem, { borderColor: colors.border }]}
              >
                <Text style={styles.cashSummaryLabel}>{item.label}</Text>
                <Text
                  style={[
                    styles.cashSummaryValue,
                    item.amount < 0 ? styles.cashAmountNegative : styles.cashAmountPositive,
                  ]}
                >
                  {formatPrice(item.amount)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View
          style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 12 }]}
        >
          <Text style={[styles.title, { color: colors.text }]}>{cashRegisterCopy.ledgerTitle}</Text>
          {cashEntries.length === 0 ? (
            <Text style={[styles.empty, { marginVertical: 8 }]}>{cashRegisterCopy.empty}</Text>
          ) : (
            cashEntries.map((entry) => {
              const amountStyle =
                entry.amount_cents < 0 ? styles.cashAmountNegative : styles.cashAmountPositive;
              const sourceName = entry.source_name?.trim()
                ? entry.source_name
                : cashEntryTypeLabels[entry.type];
              const created = entry.created_at ? new Date(entry.created_at) : null;
              const dateLabel =
                created && !Number.isNaN(created.getTime())
                  ? created.toLocaleString(locale, { dateStyle: "short", timeStyle: "short" })
                  : entry.created_at;
              const quantityLabel =
                entry.quantity > 1 ? cashRegisterCopy.entryMeta.quantity(entry.quantity) : null;
              const unitLabel =
                entry.unit_amount_cents !== null
                  ? cashRegisterCopy.entryMeta.unitPrice(formatPrice(entry.unit_amount_cents))
                  : null;
              const referenceLabel = entry.reference_id
                ? cashRegisterCopy.entryMeta.reference(entry.reference_id)
                : null;
              return (
                <View key={entry.id} style={[styles.cashEntryRow, { borderColor: colors.border }]}
                >
                  <View style={styles.cashEntryHeader}>
                    <View style={styles.cashEntryInfo}>
                      <Text style={styles.cashEntryType}>{cashEntryTypeLabels[entry.type]}</Text>
                      <Text style={styles.cashEntrySource}>{sourceName}</Text>
                    </View>
                    <Text style={[styles.cashAmount, amountStyle]}>{formatPrice(entry.amount_cents)}</Text>
                  </View>
                  <View style={styles.cashEntryMetaRow}>
                    <Text style={styles.cashEntryMeta}>{dateLabel}</Text>
                    {quantityLabel ? <Text style={styles.cashEntryMeta}>{quantityLabel}</Text> : null}
                    {unitLabel ? <Text style={styles.cashEntryMeta}>{unitLabel}</Text> : null}
                    {referenceLabel ? <Text style={styles.cashEntryMeta}>{referenceLabel}</Text> : null}
                  </View>
                  {entry.note ? (
                    <Text style={styles.cashEntryNote}>{cashRegisterCopy.entryMeta.note(entry.note)}</Text>
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <Modal
        visible={adjustmentModalOpen}
        transparent
        animationType="fade"
        onRequestClose={handleCloseAdjustmentModal}
      >
        <View style={styles.adjustmentModalBackdrop}>
          <View
            style={[
              styles.adjustmentModalCard,
              { borderColor: colors.border, backgroundColor: colors.sidebarBg },
            ]}
          >
            <Text style={[styles.adjustmentModalTitle, { color: colors.text }]}>
              {cashRegisterCopy.adjustmentModal.title}
            </Text>
            <Text style={[styles.adjustmentModalSubtitle, { color: colors.subtext }]}>
              {cashRegisterCopy.adjustmentModal.subtitle}
            </Text>

            <View style={{ gap: 6 }}>
              <Text style={[styles.adjustmentModalLabel, { color: colors.subtext }]}>
                {cashRegisterCopy.adjustmentModal.amountLabel}
              </Text>
              <TextInput
                value={adjustmentAmountText}
                onChangeText={handleAdjustmentAmountChange}
                keyboardType="decimal-pad"
                placeholder={cashRegisterCopy.adjustmentModal.amountPlaceholder}
                placeholderTextColor="#94a3b8"
                style={[styles.adjustmentTextInput, { borderColor: colors.border, color: colors.text }]}
              />
              <Text style={[styles.adjustmentHelperText, { color: colors.subtext }]}>
                {cashRegisterCopy.adjustmentModal.amountHelp}
              </Text>
              {adjustmentError ? (
                <Text style={[styles.adjustmentErrorText, { color: colors.danger }]}>
                  {adjustmentError}
                </Text>
              ) : null}
            </View>

            <View style={{ gap: 6 }}>
              <Text style={[styles.adjustmentModalLabel, { color: colors.subtext }]}>
                {cashRegisterCopy.adjustmentModal.noteLabel}
              </Text>
              <TextInput
                value={adjustmentNote}
                onChangeText={handleAdjustmentNoteChange}
                multiline
                numberOfLines={3}
                placeholder={cashRegisterCopy.adjustmentModal.noteLabel}
                placeholderTextColor="#94a3b8"
                style={[styles.adjustmentTextArea, { borderColor: colors.border, color: colors.text }]}
                textAlignVertical="top"
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={[styles.adjustmentModalLabel, { color: colors.subtext }]}>
                {cashRegisterCopy.adjustmentModal.referenceLabel}
              </Text>
              <TextInput
                value={adjustmentReference}
                onChangeText={handleAdjustmentReferenceChange}
                placeholder={cashRegisterCopy.adjustmentModal.referenceLabel}
                placeholderTextColor="#94a3b8"
                style={[styles.adjustmentTextInput, { borderColor: colors.border, color: colors.text }]}
              />
            </View>

            <View style={styles.adjustmentModalActions}>
              <Pressable
                onPress={handleCloseAdjustmentModal}
                disabled={adjustmentSaving}
                style={[styles.smallBtn, { borderColor: colors.border }, adjustmentSaving && styles.smallBtnDisabled]}
                accessibilityRole="button"
                accessibilityLabel={cashRegisterCopy.adjustmentModal.cancel}
              >
                <Text style={{ color: colors.subtext, fontWeight: "800" }}>
                  {cashRegisterCopy.adjustmentModal.cancel}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleConfirmAdjustment}
                disabled={adjustmentSaving}
                style={[
                  styles.smallBtn,
                  {
                    borderColor: colors.accent,
                    backgroundColor: adjustmentSaving
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(37,99,235,0.12)",
                  },
                  adjustmentSaving && styles.smallBtnDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel={cashRegisterCopy.adjustmentModal.confirm}
              >
                <Text style={{ color: colors.accent, fontWeight: "800" }}>
                  {adjustmentSaving
                    ? cashRegisterCopy.adjustmentModal.saving
                    : cashRegisterCopy.adjustmentModal.confirm}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

export const cashRegisterRenderer: CashRegisterScreenRenderer = (props) => (
  <CashRegisterScreen {...props} />
);

export default function CashRegister(): React.ReactElement {
  return (
    <LanguageProvider>
      <AuthenticatedApp
        initialScreen="cashRegister"
        renderBookings={bookingsRenderer}
        renderCashRegister={cashRegisterRenderer}
        renderProducts={productsRenderer}
        renderServices={servicesRenderer}
      />
    </LanguageProvider>
  );
}
