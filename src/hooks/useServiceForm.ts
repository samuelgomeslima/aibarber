import { useCallback, useEffect, useMemo, useState } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import type { Service } from "../lib/domain";
import { createService, updateService } from "../lib/services";
import type { ServiceFormCopy } from "../locales/types";

type ServiceFormMode = "create" | "edit";

type UseServiceFormOptions = {
  mode: ServiceFormMode;
  service: Service | null | undefined;
  copy: ServiceFormCopy;
  onCreated?: (service: Service) => void;
  onUpdated?: (service: Service) => void;
};

type SubmitStatus = "invalid" | "created" | "updated";

type SubmitResult = {
  status: SubmitStatus;
  service?: Service;
};

type UseServiceFormReturn = {
  isEditMode: boolean;
  name: string;
  setName: (value: string) => void;
  minutesText: string;
  handleMinutesChange: (text: string) => void;
  priceText: string;
  handlePriceChange: (text: string) => void;
  iconName: keyof typeof MaterialCommunityIcons.glyphMap;
  selectIcon: (name: keyof typeof MaterialCommunityIcons.glyphMap) => void;
  iconPickerVisible: boolean;
  showIconPicker: () => void;
  hideIconPicker: () => void;
  iconSearch: string;
  setIconSearch: (value: string) => void;
  filteredIcons: (keyof typeof MaterialCommunityIcons.glyphMap)[];
  iconValid: boolean;
  errors: Record<string, string>;
  valid: boolean;
  saving: boolean;
  submit: () => Promise<SubmitResult>;
};

const DEFAULT_ICON: keyof typeof MaterialCommunityIcons.glyphMap = "content-cut";

export function useServiceForm({
  mode,
  service = null,
  copy,
  onCreated,
  onUpdated,
}: UseServiceFormOptions): UseServiceFormReturn {
  const isEditMode = mode === "edit";

  const [name, setName] = useState(() => (isEditMode && service ? service.name : ""));
  const [minutesText, setMinutesText] = useState(() =>
    isEditMode && service
      ? String(service.estimated_minutes)
      : copy.fields.durationPlaceholder.replace(/[^0-9]/g, ""),
  );
  const [priceText, setPriceText] = useState(() =>
    isEditMode && service
      ? centsToInput(service.price_cents)
      : copy.fields.pricePlaceholder.replace(/[^0-9.,]/g, ""),
  );
  const [iconName, setIconName] = useState<keyof typeof MaterialCommunityIcons.glyphMap>(() =>
    (isEditMode && service ? service.icon : DEFAULT_ICON) as keyof typeof MaterialCommunityIcons.glyphMap,
  );
  const [saving, setSaving] = useState(false);
  const [iconPickerVisible, setIconPickerVisible] = useState(false);
  const [iconSearch, setIconSearch] = useState("");

  const setFromService = useCallback(
    (svc: Service | null) => {
      if (svc) {
        setName(svc.name);
        setMinutesText(String(svc.estimated_minutes));
        setPriceText(centsToInput(svc.price_cents));
        setIconName(svc.icon as keyof typeof MaterialCommunityIcons.glyphMap);
      } else {
        setName("");
        setMinutesText(copy.fields.durationPlaceholder.replace(/[^0-9]/g, ""));
        setPriceText(copy.fields.pricePlaceholder.replace(/[^0-9.,]/g, ""));
        setIconName(DEFAULT_ICON);
      }
      setIconPickerVisible(false);
      setIconSearch("");
    },
    [copy.fields.durationPlaceholder, copy.fields.pricePlaceholder],
  );

  useEffect(() => {
    if (isEditMode && service) {
      setFromService(service);
    } else if (!isEditMode) {
      setFromService(null);
    }
  }, [isEditMode, service, setFromService]);

  const iconNames = useMemo(
    () => Object.keys(MaterialCommunityIcons.glyphMap) as (keyof typeof MaterialCommunityIcons.glyphMap)[],
    [],
  );

  const curatedIconNames = useMemo(() => {
    const keywords = [
      "hair",
      "cut",
      "razor",
      "scissor",
      "comb",
      "beard",
      "spa",
      "spray",
      "brush",
      "style",
      "face",
      "account",
    ];
    const keywordMatches = iconNames.filter((name) =>
      keywords.some((keyword) => String(name).toLowerCase().includes(keyword)),
    );
    const extras = [
      "content-cut",
      "hair-dryer",
      "spray-bottle",
      "account-tie",
      "account",
      "face-woman-shimmer",
      "face-man-shimmer",
      "mustache",
      "tshirt-crew",
      "eyedropper",
    ] as (keyof typeof MaterialCommunityIcons.glyphMap)[];
    const extrasPresent = extras.filter((name) => iconNames.includes(name));
    const unique = Array.from(new Set([...extrasPresent, ...keywordMatches]));
    unique.sort();
    return unique;
  }, [iconNames]);

  const filteredIcons = useMemo(() => {
    const query = iconSearch.trim().toLowerCase();
    const baseList = query ? iconNames : curatedIconNames;
    const matches = baseList.filter((name) => String(name).toLowerCase().includes(query));
    if (iconName && !matches.includes(iconName)) {
      matches.unshift(iconName);
    }
    return matches.slice(0, 120);
  }, [curatedIconNames, iconName, iconNames, iconSearch]);

  const minutes = useMemo(() => {
    const numeric = Number(minutesText);
    return Number.isFinite(numeric) ? Math.round(numeric) : NaN;
  }, [minutesText]);

  const priceCents = useMemo(() => parsePrice(priceText), [priceText]);

  const iconValid = useMemo(
    () => !!MaterialCommunityIcons.glyphMap[iconName as keyof typeof MaterialCommunityIcons.glyphMap],
    [iconName],
  );

  const errors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = copy.fields.nameError;
    if (!Number.isFinite(minutes) || minutes <= 0) errs.minutes = copy.fields.durationError;
    if (!Number.isFinite(priceCents) || priceCents < 0) errs.price = copy.fields.priceError;
    if (!iconValid) errs.icon = copy.fields.iconError;
    return errs;
  }, [copy.fields.durationError, copy.fields.iconError, copy.fields.nameError, copy.fields.priceError, iconValid, minutes, name, priceCents]);

  const readyToSubmit = useMemo(
    () => Object.keys(errors).length === 0 && (!isEditMode || !!service),
    [errors, isEditMode, service],
  );

  const valid = readyToSubmit && !saving;

  const handleMinutesChange = useCallback((text: string) => {
    setMinutesText(text.replace(/[^0-9]/g, ""));
  }, []);

  const handlePriceChange = useCallback((text: string) => {
    setPriceText(text.replace(/[^0-9.,]/g, ""));
  }, []);

  const showIconPicker = useCallback(() => {
    setIconPickerVisible(true);
  }, []);

  const hideIconPicker = useCallback(() => {
    setIconPickerVisible(false);
    setIconSearch("");
  }, []);

  const selectIcon = useCallback(
    (next: keyof typeof MaterialCommunityIcons.glyphMap) => {
      setIconName(next);
      hideIconPicker();
    },
    [hideIconPicker],
  );

  const submit = useCallback(async (): Promise<SubmitResult> => {
    if (!readyToSubmit || saving) {
      return { status: "invalid" };
    }
    setSaving(true);
    try {
      if (isEditMode && service) {
        const updated = await updateService(service.id, {
          name: name.trim(),
          estimated_minutes: minutes,
          price_cents: priceCents,
          icon: iconName,
        });
        setFromService(updated);
        onUpdated?.(updated);
        return { status: "updated", service: updated };
      }

      const created = await createService({
        name: name.trim(),
        estimated_minutes: minutes,
        price_cents: priceCents,
        icon: iconName,
      });
      setFromService(null);
      onCreated?.(created);
      return { status: "created", service: created };
    } finally {
      setSaving(false);
    }
  }, [
    iconName,
    isEditMode,
    minutes,
    name,
    onCreated,
    onUpdated,
    priceCents,
    readyToSubmit,
    saving,
    service,
    setFromService,
  ]);

  return {
    isEditMode,
    name,
    setName,
    minutesText,
    handleMinutesChange,
    priceText,
    handlePriceChange,
    iconName,
    selectIcon,
    iconPickerVisible,
    showIconPicker,
    hideIconPicker,
    iconSearch,
    setIconSearch,
    filteredIcons,
    iconValid,
    errors,
    valid,
    saving,
    submit,
  };
}

export function parsePrice(input: string): number {
  if (!input) return NaN;
  const normalized = input.replace(/[^0-9.,]/g, "").replace(/,/g, ".");
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value)) return NaN;
  return Math.round(value * 100);
}

export function centsToInput(cents: number) {
  if (!Number.isFinite(cents)) return "0.00";
  return (Math.round(cents) / 100).toFixed(2);
}
