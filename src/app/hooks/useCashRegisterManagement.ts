import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";

import {
  listCashEntries,
  recordCashAdjustment,
  summarizeCashEntries,
  type CashEntry,
} from "../../lib/cashRegister";
import { formatPrice } from "../../lib/domain";
import { parseSignedCurrency, sanitizeSignedCurrencyInput } from "../../utils/currency";
import type { SupportedLanguage } from "../../locales/language";
import type { AuthenticatedAppCopy } from "../copy/authenticatedAppCopy";

type CashRegisterCopy = AuthenticatedAppCopy[SupportedLanguage]["cashRegisterPage"];

type UseCashRegisterManagementOptions = {
  cashRegisterCopy: CashRegisterCopy;
};

export type CashSummary = ReturnType<typeof summarizeCashEntries>;

export function useCashRegisterManagement({ cashRegisterCopy }: UseCashRegisterManagementOptions) {
  const [cashEntries, setCashEntries] = useState<CashEntry[]>([]);
  const [cashLoading, setCashLoading] = useState(false);
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
  const [adjustmentAmountText, setAdjustmentAmountText] = useState("");
  const [adjustmentNote, setAdjustmentNote] = useState("");
  const [adjustmentReference, setAdjustmentReference] = useState("");
  const [adjustmentSaving, setAdjustmentSaving] = useState(false);
  const [adjustmentError, setAdjustmentError] = useState<string | null>(null);

  const sortCashEntries = useCallback(
    (list: CashEntry[]) => [...list].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [],
  );

  const loadCashRegister = useCallback(async () => {
    setCashLoading(true);
    try {
      const rows = await listCashEntries();
      setCashEntries(sortCashEntries(rows));
    } catch (error: any) {
      console.error(error);
      Alert.alert(cashRegisterCopy.alerts.loadTitle, error?.message ?? String(error));
      setCashEntries([]);
    } finally {
      setCashLoading(false);
    }
  }, [cashRegisterCopy.alerts.loadTitle, sortCashEntries]);

  useEffect(() => {
    void loadCashRegister();
  }, [loadCashRegister]);

  useEffect(() => {
    setCashEntries((prev) => sortCashEntries(prev));
  }, [sortCashEntries]);

  const appendCashEntry = useCallback(
    (entry: CashEntry) => {
      setCashEntries((prev) => sortCashEntries([entry, ...prev]));
    },
    [sortCashEntries],
  );

  const cashSummary = useMemo(() => summarizeCashEntries(cashEntries), [cashEntries]);
  const cashEntryTypeLabels = useMemo(
    () => ({
      service_sale: cashRegisterCopy.entryLabels.service,
      product_sale: cashRegisterCopy.entryLabels.product,
      adjustment: cashRegisterCopy.entryLabels.adjustment,
    }),
    [cashRegisterCopy.entryLabels],
  );

  const handleOpenAdjustmentModal = useCallback(() => {
    setAdjustmentAmountText("");
    setAdjustmentNote("");
    setAdjustmentReference("");
    setAdjustmentError(null);
    setAdjustmentSaving(false);
    setAdjustmentModalOpen(true);
  }, []);

  const handleCloseAdjustmentModal = useCallback(() => {
    if (adjustmentSaving) {
      return;
    }
    setAdjustmentModalOpen(false);
    setAdjustmentAmountText("");
    setAdjustmentNote("");
    setAdjustmentReference("");
    setAdjustmentError(null);
    setAdjustmentSaving(false);
  }, [adjustmentSaving]);

  const handleAdjustmentAmountChange = useCallback((text: string) => {
    setAdjustmentAmountText(sanitizeSignedCurrencyInput(text));
    setAdjustmentError(null);
  }, []);

  const handleAdjustmentNoteChange = useCallback((text: string) => {
    setAdjustmentNote(text);
  }, []);

  const handleAdjustmentReferenceChange = useCallback((text: string) => {
    setAdjustmentReference(text);
  }, []);

  const handleConfirmAdjustment = useCallback(async () => {
    const amountCents = parseSignedCurrency(adjustmentAmountText);
    if (!Number.isFinite(amountCents) || amountCents === 0) {
      setAdjustmentError(cashRegisterCopy.adjustmentModal.amountError);
      return;
    }

    setAdjustmentSaving(true);
    try {
      const entry = await recordCashAdjustment({
        amount_cents: amountCents,
        note: adjustmentNote.trim() ? adjustmentNote.trim() : null,
        reference_id: adjustmentReference.trim() ? adjustmentReference.trim() : null,
      });

      appendCashEntry(entry);
      setAdjustmentModalOpen(false);
      setAdjustmentAmountText("");
      setAdjustmentNote("");
      setAdjustmentReference("");
      setAdjustmentError(null);

      Alert.alert(
        cashRegisterCopy.adjustmentModal.successTitle,
        cashRegisterCopy.adjustmentModal.successMessage(formatPrice(entry.amount_cents)),
      );
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        cashRegisterCopy.alerts.adjustmentFailedTitle,
        error?.message ?? cashRegisterCopy.alerts.adjustmentFailedMessage,
      );
    } finally {
      setAdjustmentSaving(false);
    }
  }, [
    adjustmentAmountText,
    adjustmentNote,
    adjustmentReference,
    appendCashEntry,
    cashRegisterCopy.adjustmentModal,
    cashRegisterCopy.alerts,
  ]);

  return {
    cashEntries,
    cashLoading,
    cashSummary,
    cashEntryTypeLabels,
    loadCashRegister,
    appendCashEntry,
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
  };
}

export type UseCashRegisterManagementReturn = ReturnType<typeof useCashRegisterManagement>;
