import { useCallback, useEffect, useState } from "react";

import { getBarbershopForOwner, updateBarbershop, type Barbershop } from "../../lib/barbershops";
import { isSupabaseConfigured } from "../../lib/supabase";
import type { SupportedLanguage } from "../../locales/language";
import { LANGUAGE_COPY } from "../copy/authenticatedAppCopy";

type BarbershopCopy = (typeof LANGUAGE_COPY)[SupportedLanguage]["barbershopPage"];

export type UseBarbershopSettingsOptions = {
  currentUserId: string | undefined;
  barbershopCopy: BarbershopCopy;
};

export type UseBarbershopSettingsResult = {
  barbershop: Barbershop | null;
  barbershopForm: { name: string; slug: string; timezone: string };
  barbershopLoading: boolean;
  barbershopSaving: boolean;
  barbershopError: string | null;
  barbershopSuccess: string | null;
  handleBarbershopFieldChange: (field: "name" | "slug" | "timezone", value: string) => void;
  loadBarbershop: () => Promise<void>;
  handleSaveBarbershop: () => Promise<void>;
  handleRetryBarbershop: () => Promise<void>;
  resetBarbershopFeedback: () => void;
};

export function useBarbershopSettings({
  currentUserId,
  barbershopCopy,
}: UseBarbershopSettingsOptions): UseBarbershopSettingsResult {
  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);
  const [barbershopForm, setBarbershopForm] = useState<{ name: string; slug: string; timezone: string }>(() => ({
    name: "",
    slug: "",
    timezone: "",
  }));
  const [barbershopLoading, setBarbershopLoading] = useState(false);
  const [barbershopSaving, setBarbershopSaving] = useState(false);
  const [barbershopError, setBarbershopError] = useState<string | null>(null);
  const [barbershopSuccess, setBarbershopSuccess] = useState<string | null>(null);

  const resetBarbershopFeedback = useCallback(() => {
    setBarbershopError(null);
    setBarbershopSuccess(null);
  }, []);

  const handleBarbershopFieldChange = useCallback((field: "name" | "slug" | "timezone", value: string) => {
    setBarbershopForm((current) => {
      let nextValue = value;
      if (field === "slug") {
        nextValue = value
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-+|-+$/g, "");
      }

      return { ...current, [field]: nextValue };
    });
    setBarbershopSuccess(null);
  }, []);

  const loadBarbershop = useCallback(async () => {
    if (!currentUserId) {
      setBarbershop(null);
      setBarbershopForm({ name: "", slug: "", timezone: "" });
      setBarbershopError(null);
      setBarbershopSuccess(null);
      return;
    }

    setBarbershopLoading(true);
    setBarbershopError(null);
    setBarbershopSuccess(null);

    try {
      if (!isSupabaseConfigured()) {
        setBarbershop(null);
        setBarbershopForm({ name: "", slug: "", timezone: "" });
        setBarbershopError(barbershopCopy.errors.notConfigured);
        return;
      }

      const result = await getBarbershopForOwner(currentUserId);

      if (!result) {
        setBarbershop(null);
        setBarbershopForm({ name: "", slug: "", timezone: "" });
        setBarbershopError(barbershopCopy.errors.notFound);
        return;
      }

      setBarbershop(result);
      setBarbershopForm({
        name: result.name ?? "",
        slug: result.slug ?? "",
        timezone: result.timezone ?? "UTC",
      });
    } catch (error) {
      console.error("Failed to load barbershop", error);
      const fallback = barbershopCopy.errors.loadFailed;
      const message = error instanceof Error ? error.message || fallback : fallback;
      setBarbershopError(message);
      setBarbershop(null);
      setBarbershopForm({ name: "", slug: "", timezone: "" });
    } finally {
      setBarbershopLoading(false);
    }
  }, [barbershopCopy.errors.loadFailed, barbershopCopy.errors.notConfigured, barbershopCopy.errors.notFound, currentUserId]);

  const handleSaveBarbershop = useCallback(async () => {
    if (!barbershop?.id || barbershopSaving) {
      return;
    }

    if (!isSupabaseConfigured()) {
      setBarbershopError(barbershopCopy.errors.notConfigured);
      return;
    }

    const trimmedName = barbershopForm.name.trim();
    if (!trimmedName) {
      setBarbershopError(barbershopCopy.errors.nameRequired);
      return;
    }

    const trimmedTimezone = barbershopForm.timezone.trim();
    if (!trimmedTimezone) {
      setBarbershopError(barbershopCopy.errors.timezoneRequired);
      return;
    }

    const slugInput = barbershopForm.slug.trim();
    const normalizedSlug = slugInput
      ? slugInput
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-+|-+$/g, "")
      : null;

    setBarbershopSaving(true);
    setBarbershopError(null);
    setBarbershopSuccess(null);

    try {
      const updated = await updateBarbershop(barbershop.id, {
        name: trimmedName,
        slug: normalizedSlug,
        timezone: trimmedTimezone,
      });

      setBarbershop(updated);
      setBarbershopForm({
        name: updated.name ?? trimmedName,
        slug: updated.slug ?? "",
        timezone: updated.timezone ?? trimmedTimezone,
      });
      setBarbershopSuccess(barbershopCopy.feedback.saved);
    } catch (error) {
      console.error("Failed to update barbershop", error);
      const fallback = barbershopCopy.errors.saveFailed;
      const message = error instanceof Error ? error.message || fallback : fallback;
      setBarbershopError(message);
    } finally {
      setBarbershopSaving(false);
    }
  }, [
    barbershop?.id,
    barbershopCopy.errors.nameRequired,
    barbershopCopy.errors.notConfigured,
    barbershopCopy.errors.saveFailed,
    barbershopCopy.errors.timezoneRequired,
    barbershopCopy.feedback.saved,
    barbershopForm.name,
    barbershopForm.slug,
    barbershopForm.timezone,
    barbershopSaving,
  ]);

  const handleRetryBarbershop = useCallback(async () => {
    resetBarbershopFeedback();
    await loadBarbershop();
  }, [loadBarbershop, resetBarbershopFeedback]);

  useEffect(() => {
    resetBarbershopFeedback();
  }, [resetBarbershopFeedback]);

  return {
    barbershop,
    barbershopForm,
    barbershopLoading,
    barbershopSaving,
    barbershopError,
    barbershopSuccess,
    handleBarbershopFieldChange,
    loadBarbershop,
    handleSaveBarbershop,
    handleRetryBarbershop,
    resetBarbershopFeedback,
  };
}
