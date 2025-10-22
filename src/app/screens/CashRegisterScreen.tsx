import React from "react";
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { formatPrice } from "../../lib/domain";
import type { CashEntry, CashRegisterSummary } from "../../lib/cashRegister";
import type {
  AuthenticatedAppStyles,
  CashRegisterCopy,
  ThemeColors,
} from "../AuthenticatedApp";

export type CashEntryTypeLabels = Record<CashEntry["type"], string>;

type CashRegisterScreenProps = {
  isCompactLayout: boolean;
  cashLoading: boolean;
  onRefresh: () => void;
  styles: AuthenticatedAppStyles;
  colors: ThemeColors;
  copy: CashRegisterCopy;
  cashSummary: CashRegisterSummary;
  cashEntries: CashEntry[];
  cashEntryTypeLabels: CashEntryTypeLabels;
  locale: string;
  adjustmentModalOpen: boolean;
  onOpenAdjustmentModal: () => void;
  onCloseAdjustmentModal: () => void;
  adjustmentAmountText: string;
  onAdjustmentAmountChange: (value: string) => void;
  adjustmentError: string | null;
  adjustmentNote: string;
  onAdjustmentNoteChange: (value: string) => void;
  adjustmentReference: string;
  onAdjustmentReferenceChange: (value: string) => void;
  adjustmentSaving: boolean;
  onConfirmAdjustment: () => void;
};

export default function CashRegisterScreen({
  isCompactLayout,
  cashLoading,
  onRefresh,
  styles,
  colors,
  copy,
  cashSummary,
  cashEntries,
  cashEntryTypeLabels,
  locale,
  adjustmentModalOpen,
  onOpenAdjustmentModal,
  onCloseAdjustmentModal,
  adjustmentAmountText,
  onAdjustmentAmountChange,
  adjustmentError,
  adjustmentNote,
  onAdjustmentNoteChange,
  adjustmentReference,
  onAdjustmentReferenceChange,
  adjustmentSaving,
  onConfirmAdjustment,
}: CashRegisterScreenProps) {
  return (
    <>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: isCompactLayout ? 16 : 20, gap: 16 }}
        refreshControl={<RefreshControl refreshing={cashLoading} onRefresh={onRefresh} />}
      >
        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 12 }]}>
          <View style={[styles.listHeaderRow, isCompactLayout && styles.listHeaderRowCompact]}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.title, { color: colors.text }]}>{copy.title}</Text>
              <Text style={{ color: colors.subtext, fontSize: 13, fontWeight: "600" }}>
                {copy.subtitle}
              </Text>
            </View>
            <View
              style={[
                styles.cashHeaderActions,
                isCompactLayout && styles.cashHeaderActionsCompact,
              ]}
            >
              <Pressable
                onPress={onOpenAdjustmentModal}
                style={[styles.secondaryCta, isCompactLayout && styles.fullWidthButton]}
                accessibilityRole="button"
                accessibilityLabel={copy.adjustmentCta.accessibility}
              >
                <Text style={styles.secondaryCtaText}>{copy.adjustmentCta.label}</Text>
              </Pressable>
              <Pressable
                onPress={onRefresh}
                style={[styles.defaultCta, { marginTop: 0 }, isCompactLayout && styles.fullWidthButton]}
                accessibilityRole="button"
                accessibilityLabel={copy.refreshAccessibility}
              >
                <Text style={styles.defaultCtaText}>{copy.refresh}</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 16 }]}>
          <Text style={[styles.title, { color: colors.text, fontSize: 18 }]}>{copy.summaryTitle}</Text>
          <View style={styles.cashSummaryGrid}>
            {[
              { key: "total", label: copy.summary.total, amount: cashSummary.total_cents },
              { key: "services", label: copy.summary.services, amount: cashSummary.service_sales_cents },
              { key: "products", label: copy.summary.products, amount: cashSummary.product_sales_cents },
              { key: "adjustments", label: copy.summary.adjustments, amount: cashSummary.adjustments_cents },
            ].map((item) => (
              <View key={item.key} style={[styles.cashSummaryItem, { borderColor: colors.border }]}>
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

        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 12 }]}>
          <Text style={[styles.title, { color: colors.text }]}>{copy.ledgerTitle}</Text>
          {cashEntries.length === 0 ? (
            <Text style={[styles.empty, { marginVertical: 8 }]}>{copy.empty}</Text>
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
              const quantityLabel = entry.quantity > 1 ? copy.entryMeta.quantity(entry.quantity) : null;
              const unitLabel =
                entry.unit_amount_cents !== null
                  ? copy.entryMeta.unitPrice(formatPrice(entry.unit_amount_cents))
                  : null;
              const referenceLabel = entry.reference_id
                ? copy.entryMeta.reference(entry.reference_id)
                : null;

              return (
                <View key={entry.id} style={[styles.cashEntryRow, { borderColor: colors.border }]}>
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
                    <Text style={styles.cashEntryNote}>{copy.entryMeta.note(entry.note)}</Text>
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
        onRequestClose={onCloseAdjustmentModal}
      >
        <View style={styles.adjustmentModalBackdrop}>
          <View
            style={[
              styles.adjustmentModalCard,
              { borderColor: colors.border, backgroundColor: colors.sidebarBg },
            ]}
          >
            <Text style={[styles.adjustmentModalTitle, { color: colors.text }]}>
              {copy.adjustmentModal.title}
            </Text>
            <Text style={[styles.adjustmentModalSubtitle, { color: colors.subtext }]}>
              {copy.adjustmentModal.subtitle}
            </Text>

            <View style={{ gap: 6 }}>
              <Text style={[styles.adjustmentModalLabel, { color: colors.subtext }]}>
                {copy.adjustmentModal.amountLabel}
              </Text>
              <TextInput
                value={adjustmentAmountText}
                onChangeText={onAdjustmentAmountChange}
                keyboardType="decimal-pad"
                placeholder={copy.adjustmentModal.amountPlaceholder}
                placeholderTextColor="#94a3b8"
                style={[styles.adjustmentTextInput, { borderColor: colors.border, color: colors.text }]}
              />
              <Text style={[styles.adjustmentHelperText, { color: colors.subtext }]}>
                {copy.adjustmentModal.amountHelp}
              </Text>
              {adjustmentError ? (
                <Text style={[styles.adjustmentErrorText, { color: colors.danger }]}>{adjustmentError}</Text>
              ) : null}
            </View>

            <View style={{ gap: 6 }}>
              <Text style={[styles.adjustmentModalLabel, { color: colors.subtext }]}>
                {copy.adjustmentModal.noteLabel}
              </Text>
              <TextInput
                value={adjustmentNote}
                onChangeText={onAdjustmentNoteChange}
                multiline
                numberOfLines={3}
                placeholder={copy.adjustmentModal.noteLabel}
                placeholderTextColor="#94a3b8"
                style={[styles.adjustmentTextArea, { borderColor: colors.border, color: colors.text }]}
                textAlignVertical="top"
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={[styles.adjustmentModalLabel, { color: colors.subtext }]}>
                {copy.adjustmentModal.referenceLabel}
              </Text>
              <TextInput
                value={adjustmentReference}
                onChangeText={onAdjustmentReferenceChange}
                placeholder={copy.adjustmentModal.referenceLabel}
                placeholderTextColor="#94a3b8"
                style={[styles.adjustmentTextInput, { borderColor: colors.border, color: colors.text }]}
              />
            </View>

            <View style={styles.adjustmentModalActions}>
              <Pressable
                onPress={onCloseAdjustmentModal}
                disabled={adjustmentSaving}
                style={[styles.smallBtn, { borderColor: colors.border }, adjustmentSaving && styles.smallBtnDisabled]}
                accessibilityRole="button"
                accessibilityLabel={copy.adjustmentModal.cancel}
              >
                <Text style={{ color: colors.subtext, fontWeight: "800" }}>
                  {copy.adjustmentModal.cancel}
                </Text>
              </Pressable>
              <Pressable
                onPress={onConfirmAdjustment}
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
                accessibilityLabel={copy.adjustmentModal.confirm}
              >
                <Text style={{ color: colors.accent, fontWeight: "800" }}>
                  {adjustmentSaving ? copy.adjustmentModal.saving : copy.adjustmentModal.confirm}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
