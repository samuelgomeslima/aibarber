import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Modal,
  TextInput,
  useWindowDimensions,
  Linking,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import type { User } from "@supabase/supabase-js";

import {
  BARBERS,
  BARBER_MAP,
  type Service,
  type ServicePackage,
  type Product,
  openingHour,
  closingHour,
  pad,
  toDateKey,
  minutesToTime,
  timeToMinutes,
  addMinutes,
  overlap,
  humanDate,
  formatPrice,
} from "../lib/domain";
import { polyglotProductName, polyglotProducts, polyglotServices } from "../lib/polyglot";
import { useOptionalLanguageContext } from "../contexts/LanguageContext";
import { useThemeContext } from "../contexts/ThemeContext";
import { getInitialLanguage, type SupportedLanguage } from "../locales/language";
import type { RecurrenceFrequency } from "../locales/types";
import { getEmailConfirmationRedirectUrl } from "../lib/auth";
import { getBarbershopForOwner, updateBarbershop, type Barbershop } from "../lib/barbershops";
import { fetchUserPreferences } from "../lib/userPreferences";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { applyAlpha, mixHexColor, tintHexColor } from "../utils/color";
import { buildDateTime, getCurrentTimeString, getTodayDateKey, normalizeTimeInput } from "../utils/datetime";
import type { ThemePreference } from "../theme/preferences";
import type { ThemeColors } from "../theme/theme";

const SLOT_MINUTES = 15;
const WHATSAPP_BRAND_COLOR = "#25D366";
const MORNING_END_MINUTES = 12 * 60;
const AFTERNOON_END_MINUTES = 17 * 60;
type SlotPeriod = "morning" | "afternoon" | "evening";
const BOOKING_LIMIT_OPTIONS = [200, 500, 1000] as const;
export type BookingLimitOption = (typeof BOOKING_LIMIT_OPTIONS)[number];
const API_STATUS_ORDER: ApiServiceName[] = ["chat", "transcribe"];
import {
  getBookings,
  getBookingsForRange,
  getBookingsForDates,
  createBooking,
  createBookingsBulk,
  cancelBooking,
  confirmBookingPerformed,
  listCustomers,
  listRecentBookings,
  type BookingWithCustomer,
  type Customer,
} from "../lib/bookings";
import { recordServiceSale, type CashEntry } from "../lib/cashRegister";
import { type StaffMember } from "../lib/users";
import { type ApiServiceName } from "../lib/apiStatus";

/* Components (mantidos) */
import DateSelector from "../components/DateSelector";
import RecurrenceModal from "../components/RecurrenceModal"; // recebe fixedDate/fixedTime/fixedService/fixedBarber
import OccurrencePreviewModal, { PreviewItem } from "../components/OccurrencePreviewModal";
import BarberSelector, { Barber } from "../components/BarberSelector";
import SupportChat from "../components/SupportChat";
import ServicePackageForm from "../components/ServicePackageForm";
import FilterToggle from "../components/FilterToggle";
import DateTimeInput from "../components/DateTimeInput";
import { DonutChart } from "../components/DonutChart";

/* Novo: formulário de usuário (com date_of_birth e salvando no Supabase) */
import UserForm from "../components/UserForm";
import {
  LANGUAGE_COPY,
  LANGUAGE_OPTIONS,
  THEME_OPTIONS,
} from "./copy/authenticatedAppCopy";
import {
  createAuthenticatedAppStyles,
  type AuthenticatedAppStyles,
} from "./styles/authenticatedAppStyles";
import {
  defaultAssistantRenderer,
  type AssistantScreenRenderer,
} from "./screens/AssistantScreen";
import {
  defaultBarbershopSettingsRenderer,
  type BarbershopSettingsScreenRenderer,
} from "./screens/BarbershopSettingsScreen";

export type { AssistantScreenProps } from "./screens/AssistantScreen";
import { useServicesManagement } from "./hooks/useServicesManagement";
import { useProductsManagement } from "./hooks/useProductsManagement";
import { useCashRegisterManagement, type CashSummary } from "./hooks/useCashRegisterManagement";
import { useTeamManagement } from "./hooks/useTeamManagement";
import { useApiStatus } from "./hooks/useApiStatus";


export type { BarbershopSettingsScreenProps } from "./screens/BarbershopSettingsScreen";

/** ========== App ========== */
export type ScreenName =
  | "home"
  | "bookings"
  | "bookService"
  | "services"
  | "packages"
  | "products"
  | "cashRegister"
  | "assistant"
  | "support"
  | "team"
  | "settings"
  | "barbershopSettings";


export type CashRegisterScreenProps = {
  isCompactLayout: boolean;
  colors: ThemeColors;
  styles: AuthenticatedAppStyles;
  cashRegisterCopy: (typeof LANGUAGE_COPY)[SupportedLanguage]["cashRegisterPage"];
  cashLoading: boolean;
  loadCashRegister: () => Promise<void>;
  cashSummary: CashSummary;
  cashEntries: CashEntry[];
  cashEntryTypeLabels: Record<CashEntry["type"], string>;
  locale: string;
  adjustmentModalOpen: boolean;
  adjustmentAmountText: string;
  adjustmentNote: string;
  adjustmentReference: string;
  adjustmentSaving: boolean;
  adjustmentError: string | null;
  handleOpenAdjustmentModal: () => void;
  handleCloseAdjustmentModal: () => void;
  handleAdjustmentAmountChange: (text: string) => void;
  handleAdjustmentNoteChange: (text: string) => void;
  handleAdjustmentReferenceChange: (text: string) => void;
  handleConfirmAdjustment: () => Promise<void>;
};

export type CashRegisterScreenRenderer = (
  props: CashRegisterScreenProps,
) => React.ReactElement | null;

export type ProductsScreenProps = {
  isCompactLayout: boolean;
  colors: ThemeColors;
  styles: AuthenticatedAppStyles;
  productsCopy: (typeof LANGUAGE_COPY)[SupportedLanguage]["productsPage"];
  productsLoading: boolean;
  loadProducts: () => Promise<void>;
  handleOpenCreateProduct: () => void;
  productFormVisible: boolean;
  productFormMode: "create" | "edit";
  productBeingEdited: Product | null;
  handleProductCreated: (product: Product) => void;
  handleProductUpdated: (product: Product) => void;
  handleProductFormClose: () => void;
  productFormCopy: (typeof LANGUAGE_COPY)[SupportedLanguage]["productForm"];
  localizedProducts: Product[];
  productMap: Map<string, Product>;
  resolvedTheme: "light" | "dark";
  handleOpenSellProduct: (product: Product) => void;
  handleOpenRestockProduct: (product: Product) => void;
  handleOpenEditProduct: (product: Product) => void;
  handleDeleteProduct: (product: Product) => void;
  stockModalProduct: Product | null;
  stockModalDisplayProduct: Product | null;
  stockModalMode: "sell" | "restock";
  stockQuantityText: string;
  handleStockQuantityChange: (text: string) => void;
  handleCloseStockModal: () => void;
  handleConfirmStockModal: () => Promise<void>;
  stockSaving: boolean;
};

export type ProductsScreenRenderer = (
  props: ProductsScreenProps,
) => React.ReactElement | null;

export type ServicesScreenProps = {
  isCompactLayout: boolean;
  colors: ThemeColors;
  styles: AuthenticatedAppStyles;
  servicesCopy: (typeof LANGUAGE_COPY)[SupportedLanguage]["servicesPage"];
  servicesLoading: boolean;
  loadServices: () => Promise<void>;
  handleOpenCreateService: () => void;
  serviceFormVisible: boolean;
  serviceFormMode: "create" | "edit";
  serviceBeingEdited: Service | null;
  handleServiceCreated: (service: Service) => void;
  handleServiceUpdated: (service: Service) => void;
  handleServiceFormClose: () => void;
  serviceFormCopy: (typeof LANGUAGE_COPY)[SupportedLanguage]["serviceForm"];
  services: Service[];
  localizedServiceMap: Map<string, Service>;
  handleOpenEditService: (service: Service) => void;
  handleDeleteService: (service: Service) => void;
};

export type ServicesScreenRenderer = (
  props: ServicesScreenProps,
) => React.ReactElement | null;

export type BookingsScreenProps = {
  isCompactLayout: boolean;
  isUltraCompactLayout: boolean;
  colors: ThemeColors;
  styles: AuthenticatedAppStyles;
  bookingsCopy: (typeof LANGUAGE_COPY)[SupportedLanguage]["bookings"];
  allBookingsLoading: boolean;
  loadAllBookings: () => Promise<void>;
  onCreateBooking: () => void;
  bookingFilterBarber: string | null;
  setBookingFilterBarber: React.Dispatch<React.SetStateAction<string | null>>;
  bookingFilterService: string | null;
  setBookingFilterService: React.Dispatch<React.SetStateAction<string | null>>;
  bookingSortOrder: "asc" | "desc";
  setBookingSortOrder: React.Dispatch<React.SetStateAction<"asc" | "desc">>;
  bookingLimitOptions: readonly BookingLimitOption[];
  bookingResultLimit: BookingLimitOption;
  setBookingResultLimit: React.Dispatch<React.SetStateAction<BookingLimitOption>>;
  bookingFilterClient: string;
  setBookingFilterClient: React.Dispatch<React.SetStateAction<string>>;
  bookingFilterStartDate: string;
  setBookingFilterStartDate: React.Dispatch<React.SetStateAction<string>>;
  bookingFilterStartTime: string;
  setBookingFilterStartTime: React.Dispatch<React.SetStateAction<string>>;
  bookingFilterEndDate: string;
  setBookingFilterEndDate: React.Dispatch<React.SetStateAction<string>>;
  bookingFilterEndTime: string;
  setBookingFilterEndTime: React.Dispatch<React.SetStateAction<string>>;
  clearBookingFilters: () => void;
  services: Service[];
  localizedServiceMap: Map<string, Service>;
  serviceMap: Map<string, Service>;
  filteredBookingsList: BookingWithCustomer[];
  groupedBookings: { date: string; bookings: BookingWithCustomer[] }[];
  allBookings: BookingWithCustomer[];
  locale: string;
  requestBookingConfirmation: (booking: BookingWithCustomer) => void;
  confirmingBookingId: string | null;
};

export type BookingsScreenRenderer = (
  props: BookingsScreenProps,
) => React.ReactElement | null;

type AuthenticatedAppProps = {
  initialScreen?: ScreenName;
  onNavigate?: (screen: ScreenName) => void;
  renderCashRegister?: CashRegisterScreenRenderer;
  renderAssistant?: AssistantScreenRenderer;
  renderBarbershopSettings?: BarbershopSettingsScreenRenderer;
  renderBookings?: BookingsScreenRenderer;
  renderProducts?: ProductsScreenRenderer;
  renderServices?: ServicesScreenRenderer;
};

function AuthenticatedApp({
  initialScreen = "home",
  onNavigate,
  renderCashRegister,
  renderAssistant,
  renderBarbershopSettings,
  renderBookings,
  renderProducts,
  renderServices,
}: AuthenticatedAppProps) {
  const [activeScreen, setActiveScreen] = useState<ScreenName>(initialScreen);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentUserLoading, setCurrentUserLoading] = useState(true);
  const [resendingConfirmation, setResendingConfirmation] = useState(false);
  const [resentConfirmation, setResentConfirmation] = useState(false);
  const [resendConfirmationError, setResendConfirmationError] = useState<string | null>(null);
  const languageContext = useOptionalLanguageContext();
  const [fallbackLanguage, setFallbackLanguage] = useState<SupportedLanguage>(() => getInitialLanguage());
  const [fallbackLanguageReady, setFallbackLanguageReady] = useState<boolean>(() =>
    languageContext ? true : !isSupabaseConfigured(),
  );
  const language = languageContext?.language ?? fallbackLanguage;
  const setLanguage = languageContext?.setLanguage ?? setFallbackLanguage;
  const copy = useMemo(() => LANGUAGE_COPY[language], [language]);
  const locale = language === "pt" ? "pt-BR" : "en-US";
  const bookServiceCopy = copy.bookService;
  const bookingsCopy = copy.bookings;
  const assistantCopy = copy.assistant;
  const supportCopy = copy.support;
  const productsCopy = copy.productsPage;
  const servicesCopy = copy.servicesPage;
  const packagesCopy = copy.packagesPage;
  const cashRegisterCopy = copy.cashRegisterPage;
  const productFormCopy = copy.productForm;
  const serviceFormCopy = copy.serviceForm;
  const teamCopy = copy.teamPage;
  const settingsBarbershopCopy = copy.settingsPage.barbershop;
  const settingsServicesCopy = copy.settingsPage.services;
  const settingsPackagesCopy = copy.settingsPage.packages;
  const settingsTeamCopy = copy.settingsPage.team;
  const barbershopPageCopy = copy.barbershopPage;
  const teamRoleLabelMap = useMemo(() => {
    const entries = teamCopy.roles.map((role) => [role.value, role.label]);
    return Object.fromEntries(entries) as Record<string, string>;
  }, [teamCopy.roles]);
  const { colors, resolvedTheme, themePreference, setThemePreference, ready: themePreferenceReady } =
    useThemeContext();
  const styles = useMemo(() => createAuthenticatedAppStyles(colors), [colors]);
  const languageReady = languageContext ? languageContext.ready : fallbackLanguageReady;
  const preferencesReady = themePreferenceReady && languageReady;

  const localizedServiceMapRef = useRef<Map<string, Service>>(new Map());
  const localizedProductMapRef = useRef<Map<string, Product>>(new Map());

  const getServiceDisplayName = useCallback(
    (service: Service) => localizedServiceMapRef.current.get(service.id)?.name ?? service.name,
    [],
  );

  const getProductDisplayName = useCallback(
    (product: Product) =>
      localizedProductMapRef.current.get(product.id)?.name ?? polyglotProductName(product, language),
    [language],
  );

  const getDisplayProduct = useCallback(
    (product: Product) => localizedProductMapRef.current.get(product.id) ?? product,
    [],
  );

  const {
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
  } = useCashRegisterManagement({ cashRegisterCopy });

  const {
    services,
    servicesLoading,
    selectedServiceId,
    setSelectedServiceId,
    serviceFormVisible,
    serviceFormMode,
    serviceBeingEdited,
    loadServices,
    handleServiceFormClose,
    handleOpenCreateService,
    handleOpenEditService,
    handleServiceCreated,
    handleServiceUpdated,
    handleDeleteService,
    servicePackages,
    servicePackagesLoading,
    loadServicePackages,
    packageFormVisible,
    packageFormMode,
    packageBeingEdited,
    handlePackageFormClose,
    handleOpenCreatePackage,
    handleOpenEditPackage,
    handlePackageCreated,
    handlePackageUpdated,
    handleDeletePackage,
  } = useServicesManagement({
    servicesCopy,
    packagesCopy,
    getServiceDisplayName,
  });

  const {
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
  } = useProductsManagement({
    productsCopy,
    productFormCopy,
    cashRegisterCopy,
    language,
    locale,
    appendCashEntry,
    getProductDisplayName,
    getDisplayProduct,
  });

  const {
    teamMembers,
    teamLoading,
    teamFormVisible,
    loadTeamMembers,
    handleOpenTeamForm,
    handleCloseTeamForm,
  } = useTeamManagement({ teamCopy, locale });

  const { apiStatuses, apiStatusLoading, apiStatusError, fetchApiStatuses } = useApiStatus();
  useEffect(() => {
    if (activeScreen === "barbershopSettings") {
      void loadBarbershop();
    }
  }, [activeScreen, loadBarbershop]);

  useEffect(() => {
    if (activeScreen !== "barbershopSettings") {
      setBarbershopError(null);
      setBarbershopSuccess(null);
    }
  }, [activeScreen]);

  useEffect(() => {
    if (activeScreen === "team") {
      void loadTeamMembers();
    }
  }, [activeScreen, loadTeamMembers]);

  useEffect(() => {
    if (activeScreen === "settings") {
      void fetchApiStatuses();
    }
  }, [activeScreen, fetchApiStatuses]);

  const handleRefreshApiStatuses = useCallback(() => {
    void fetchApiStatuses();
  }, [fetchApiStatuses]);

  useEffect(() => {
    if (languageContext) {
      return;
    }

    if (!isSupabaseConfigured()) {
      setFallbackLanguageReady(true);
      return;
    }

    const userId = currentUser?.id;
    if (!userId) {
      if (!currentUserLoading) {
        setFallbackLanguageReady(true);
      }
      return;
    }

    let isMounted = true;
    setFallbackLanguageReady(false);

    const loadPreferences = async () => {
      try {
        const preferences = await fetchUserPreferences(userId);
        if (!isMounted) {
          return;
        }

        if (preferences?.language) {
          setFallbackLanguage(preferences.language);
        }
      } catch (error) {
        console.error("Failed to load language preference", error);
      } finally {
        if (isMounted) {
          setFallbackLanguageReady(true);
        }
      }
    };

    void loadPreferences();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.id, currentUserLoading, languageContext, setFallbackLanguage]);
  const emailConfirmationCopy = copy.settingsPage.emailConfirmation;
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
  const emailConfirmed = Boolean(currentUser?.email_confirmed_at);
  const showEmailConfirmationReminder = !currentUserLoading && currentUser && !emailConfirmed;

  useEffect(() => {
    setActiveScreen(initialScreen);
  }, [initialScreen]);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      setCurrentUserLoading(true);
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!isMounted) {
          return;
        }
        if (error) {
          console.error("Failed to load authenticated user", error);
          setCurrentUser(null);
        } else {
          setCurrentUser(data.user ?? null);
        }
      } catch (error) {
        console.error("Failed to load authenticated user", error);
        if (isMounted) {
          setCurrentUser(null);
        }
      } finally {
        if (isMounted) {
          setCurrentUserLoading(false);
        }
      }
    };

    void loadUser();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }
      setCurrentUser(session?.user ?? null);
      setCurrentUserLoading(false);
    });

    return () => {
      isMounted = false;
      subscription?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (currentUser?.email_confirmed_at) {
      setResentConfirmation(false);
      setResendConfirmationError(null);
    }
  }, [currentUser?.email_confirmed_at]);

  useEffect(() => {
    if (resendConfirmationError) {
      setResendConfirmationError(emailConfirmationCopy.error);
    }
  }, [emailConfirmationCopy.error, resendConfirmationError]);

  const handleResendConfirmationEmail = useCallback(async () => {
    if (!currentUser?.email || resendingConfirmation) {
      return;
    }

    setResendingConfirmation(true);
    setResentConfirmation(false);
    setResendConfirmationError(null);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: currentUser.email,
        options: { emailRedirectTo: getEmailConfirmationRedirectUrl() },
      });

      if (error) {
        console.error("Failed to resend confirmation email", error);
        setResendConfirmationError(emailConfirmationCopy.error);
        return;
      }

      setResentConfirmation(true);
    } catch (error) {
      console.error("Failed to resend confirmation email", error);
      setResendConfirmationError(emailConfirmationCopy.error);
    } finally {
      setResendingConfirmation(false);
    }
  }, [currentUser?.email, resendingConfirmation, emailConfirmationCopy.error]);

  const handleBarbershopFieldChange = useCallback(
    (field: "name" | "slug" | "timezone", value: string) => {
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
    },
    [],
  );

  const loadBarbershop = useCallback(async () => {
    if (!currentUser?.id) {
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
        setBarbershopError(barbershopPageCopy.errors.notConfigured);
        return;
      }

      const result = await getBarbershopForOwner(currentUser.id);

      if (!result) {
        setBarbershop(null);
        setBarbershopForm({ name: "", slug: "", timezone: "" });
        setBarbershopError(barbershopPageCopy.errors.notFound);
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
      const fallback = barbershopPageCopy.errors.loadFailed;
      const message = error instanceof Error ? error.message || fallback : fallback;
      setBarbershopError(message);
      setBarbershop(null);
      setBarbershopForm({ name: "", slug: "", timezone: "" });
    } finally {
      setBarbershopLoading(false);
    }
  }, [
    currentUser?.id,
    barbershopPageCopy.errors.loadFailed,
    barbershopPageCopy.errors.notConfigured,
    barbershopPageCopy.errors.notFound,
  ]);

  const handleSaveBarbershop = useCallback(async () => {
    if (!barbershop?.id || barbershopSaving) {
      return;
    }

    if (!isSupabaseConfigured()) {
      setBarbershopError(barbershopPageCopy.errors.notConfigured);
      return;
    }

    const trimmedName = barbershopForm.name.trim();
    if (!trimmedName) {
      setBarbershopError(barbershopPageCopy.errors.nameRequired);
      return;
    }

    const trimmedTimezone = barbershopForm.timezone.trim();
    if (!trimmedTimezone) {
      setBarbershopError(barbershopPageCopy.errors.timezoneRequired);
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
      setBarbershopSuccess(barbershopPageCopy.feedback.saved);
    } catch (error) {
      console.error("Failed to update barbershop", error);
      const fallback = barbershopPageCopy.errors.saveFailed;
      const message = error instanceof Error ? error.message || fallback : fallback;
      setBarbershopError(message);
    } finally {
      setBarbershopSaving(false);
    }
  }, [
    barbershop?.id,
    barbershopForm.name,
    barbershopForm.slug,
    barbershopForm.timezone,
    barbershopPageCopy.errors.nameRequired,
    barbershopPageCopy.errors.notConfigured,
    barbershopPageCopy.errors.saveFailed,
    barbershopPageCopy.errors.timezoneRequired,
    barbershopPageCopy.feedback.saved,
    barbershopSaving,
  ]);

  const handleRetryBarbershop = useCallback(() => {
    setBarbershopError(null);
    return loadBarbershop();
  }, [loadBarbershop]);

  // Cliente -> obrigatório antes do barbeiro
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerQuery, setCustomerQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Barbeiro (desabilitado enquanto não houver cliente)
  const [selectedBarber, setSelectedBarber] = useState<Barber>(BARBERS[0]);

  const [day, setDay] = useState<Date>(new Date());
  const dateKey = toDateKey(day);

  const [bookings, setBookings] = useState<BookingWithCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmingBookingId, setConfirmingBookingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [allBookings, setAllBookings] = useState<BookingWithCustomer[]>([]);
  const [allBookingsLoading, setAllBookingsLoading] = useState(false);
  const [bookingResultLimit, setBookingResultLimit] = useState<BookingLimitOption>(BOOKING_LIMIT_OPTIONS[1]);
  const [bookingSortOrder, setBookingSortOrder] = useState<"desc" | "asc">("asc");
  const [bookingFilterBarber, setBookingFilterBarber] = useState<string | null>(null);
  const [bookingFilterService, setBookingFilterService] = useState<string | null>(null);
  const [bookingFilterClient, setBookingFilterClient] = useState("");
  const [bookingFilterStartDate, setBookingFilterStartDate] = useState<string>(() => getTodayDateKey());
  const [bookingFilterStartTime, setBookingFilterStartTime] = useState<string>("");
  const [bookingFilterEndDate, setBookingFilterEndDate] = useState("");
  const [bookingFilterEndTime, setBookingFilterEndTime] = useState("");

  const [recurrenceOpen, setRecurrenceOpen] = useState(false);
  const [recurrenceMode, setRecurrenceMode] = useState<"booking" | "freeze">("booking");
  const [previewMode, setPreviewMode] = useState<"booking" | "freeze">("booking");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);

  const { width: windowWidth } = useWindowDimensions();
  const screenWidth = windowWidth || 0;
  const isCompactLayout = screenWidth < 768;
  const isUltraCompactLayout = screenWidth < 560;

  const [weekBookings, setWeekBookings] = useState<BookingWithCustomer[]>([]);
  const [weekDays, setWeekDays] = useState<{ date: Date; key: string }[]>([]);
  const [weekLoading, setWeekLoading] = useState(false);

  // Horário selecionado (só cria ao clicar "Book service")
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const localizedServices = useMemo(() => polyglotServices(services, language), [services, language]);
  const serviceMap = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);
  const localizedServiceMap = useMemo(
    () => new Map(localizedServices.map((s) => [s.id, s])),
    [localizedServices],
  );
  const localizedProducts = useMemo(() => polyglotProducts(products, language), [products, language]);
  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const localizedProductMap = useMemo(
    () => new Map(localizedProducts.map((product) => [product.id, product])),
    [localizedProducts],
  );
  useEffect(() => {
    localizedServiceMapRef.current = new Map(localizedServices.map((service) => [service.id, service]));
  }, [localizedServices]);

  useEffect(() => {
    localizedProductMapRef.current = new Map(localizedProducts.map((product) => [product.id, product]));
  }, [localizedProducts]);




  const updateBookingPerformed = useCallback((id: string, performedAt: string) => {
    setBookings((prev) => prev.map((booking) => (booking.id === id ? { ...booking, performed_at: performedAt } : booking)));
    setAllBookings((prev) =>
      prev.map((booking) => (booking.id === id ? { ...booking, performed_at: performedAt } : booking)),
    );
    setWeekBookings((prev) =>
      prev.map((booking) => (booking.id === id ? { ...booking, performed_at: performedAt } : booking)),
    );
  }, []);


  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedServiceId) ?? null,
    [services, selectedServiceId],
  );
  const selectedLocalizedService = useMemo(
    () => (selectedServiceId ? localizedServiceMap.get(selectedServiceId) ?? null : null),
    [localizedServiceMap, selectedServiceId],
  );

  const loadWeek = useCallback(async () => {
    const now = new Date();
    const start = startOfWeek(now);
    const days = Array.from({ length: 7 }, (_, index) => {
      const d = new Date(start);
      d.setDate(start.getDate() + index);
      return { date: d, key: toDateKey(d) };
    });

    const startKey = days[0]?.key ?? toDateKey(start);
    const endKey = days[days.length - 1]?.key ?? startKey;

    setWeekDays(days);
    setWeekLoading(true);
    try {
      const rows = await getBookingsForRange(startKey, endKey);
      setWeekBookings(rows);
    } catch (e: any) {
      console.error(e);
      Alert.alert("Weekly bookings", e?.message ?? String(e));
      setWeekBookings([]);
    } finally {
      setWeekLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const rows = await getBookings(dateKey);
      setBookings(Array.isArray(rows) ? rows : []);
    } catch (e: any) {
      console.error(e);
      Alert.alert("Load failed", e?.message ?? String(e));
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [dateKey]);

  const loadAllBookings = useCallback(async () => {
    setAllBookingsLoading(true);
    try {
      const rows = await listRecentBookings(bookingResultLimit);
      setAllBookings(Array.isArray(rows) ? rows : []);
    } catch (e: any) {
      console.error(e);
      Alert.alert(LANGUAGE_COPY[language].bookings.alerts.loadTitle, e?.message ?? String(e));
      setAllBookings([]);
    } finally {
      setAllBookingsLoading(false);
    }
  }, [bookingResultLimit, language]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (activeScreen === "home") {
      loadWeek();
    }
  }, [activeScreen, loadWeek]);

  useEffect(() => {
    if (activeScreen === "bookings") {
      loadAllBookings();
    }
  }, [activeScreen, loadAllBookings]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  }, [load]);

  const refreshCustomers = useCallback(async (q = customerQuery) => {
    setCustomersLoading(true);
    try {
      const rows = await listCustomers(q);
      setCustomers(rows);
    } catch (e: any) {
      Alert.alert(bookServiceCopy.alerts.customerErrorTitle, e?.message ?? String(e));
    } finally {
      setCustomersLoading(false);
    }
  }, [customerQuery]);

  useEffect(() => { if (clientModalOpen) refreshCustomers(); }, [clientModalOpen, refreshCustomers]);

  const allSlots = useMemo(() => {
    const start = openingHour * 60, end = closingHour * 60;
    const slots: string[] = [];
    for (let t = start; t <= end - SLOT_MINUTES; t += SLOT_MINUTES) {
      slots.push(minutesToTime(t));
    }
    return slots;
  }, []);

  const slotGroups = useMemo<Record<SlotPeriod, string[]>>(() => {
    const groups: Record<SlotPeriod, string[]> = {
      morning: [],
      afternoon: [],
      evening: [],
    };

    allSlots.forEach((slot) => {
      const minutes = timeToMinutes(slot);
      if (minutes < MORNING_END_MINUTES) {
        groups.morning.push(slot);
      } else if (minutes < AFTERNOON_END_MINUTES) {
        groups.afternoon.push(slot);
      } else {
        groups.evening.push(slot);
      }
    });

    return groups;
  }, [allSlots]);

  const slotPeriods: { key: SlotPeriod; label: string }[] = [
    { key: "morning", label: bookServiceCopy.slots.periods.morning },
    { key: "afternoon", label: bookServiceCopy.slots.periods.afternoon },
    { key: "evening", label: bookServiceCopy.slots.periods.evening },
  ];

  const availableSlots = useMemo(() => {
    if (!selectedService) return [];
    const safe = Array.isArray(bookings) ? bookings : [];
    return allSlots.filter((start) => {
      const end = addMinutes(start, selectedService.estimated_minutes);
      if (timeToMinutes(end) > closingHour * 60) return false;
      // conflito só conta para o MESMO barbeiro
      return !safe.some((b) => b.barber === selectedBarber.id && overlap(start, end, b.start, b.end));
    });
  }, [allSlots, bookings, selectedBarber, selectedService]);

  // Se o slot selecionado sair da lista (mudou dia/serviço/barbeiro ou ficou indisponível), limpa
  useEffect(() => {
    if (selectedSlot && !availableSlots.includes(selectedSlot)) {
      setSelectedSlot(null);
    }
  }, [availableSlots, selectedSlot, selectedService, selectedBarber, dateKey]);

  const book = async (start: string) => {
    if (!selectedService) {
      Alert.alert(bookServiceCopy.alerts.selectService.title, bookServiceCopy.alerts.selectService.message);
      return;
    }
    if (!selectedCustomer) {
      Alert.alert(bookServiceCopy.alerts.selectClient.title, bookServiceCopy.alerts.selectClient.message);
      return;
    }
    const end = addMinutes(start, selectedService.estimated_minutes);
    try {
      setLoading(true);
      const bookingId = await createBooking({
        date: dateKey,
        start,
        end,
        service_id: selectedService.id,
        barber: selectedBarber.id,
        customer_id: selectedCustomer.id, // salva o cliente
      });
      await load();
      await loadWeek();
      await loadAllBookings();
      const barberName = BARBER_MAP[selectedBarber.id]?.name ?? selectedBarber.id;
      const displayServiceName = selectedLocalizedService?.name ?? selectedService.name;
      Alert.alert(
        bookServiceCopy.alerts.bookingSuccessTitle,
        `${displayServiceName} • ${selectedCustomer.first_name} • ${barberName} • ${start} • ${humanDate(dateKey, locale)}`,
      );
    } catch (e: any) {
      console.error(e);
      Alert.alert(bookServiceCopy.alerts.bookingFailureTitle, e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const onCancel = async (id: string) => {
    try {
      setLoading(true);
      await cancelBooking(id);
      setBookings((prev) => prev.filter((b) => b.id !== id));
      await loadWeek();
      await loadAllBookings();
    } catch (e: any) {
      console.error(e);
      Alert.alert(bookServiceCopy.alerts.cancelFailureTitle, e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const confirmBooking = useCallback(
    async (booking: BookingWithCustomer) => {
      if (!booking || booking.performed_at) return;
      const service = serviceMap.get(booking.service_id);
      const localized = localizedServiceMap.get(booking.service_id) ?? service;
      const serviceName = localized?.name ?? booking.service_id;
      if (!service) {
        Alert.alert(bookingsCopy.results.confirmFailedTitle, bookingsCopy.results.confirmMissingService);
        return;
      }

      setConfirmingBookingId(booking.id);
      try {
        const performedAt = await confirmBookingPerformed(booking.id);
        updateBookingPerformed(booking.id, performedAt);

        let saleError: unknown = null;
        try {
          const entry = await recordServiceSale({
            serviceId: service.id,
            serviceName,
            unitPriceCents: service.price_cents,
            quantity: 1,
            referenceId: booking.id,
          });
          appendCashEntry(entry);
        } catch (error) {
          saleError = error;
          console.error(error);
        }

        const dateLabel = humanDate(booking.date, locale);
        const timeLabel = booking.start;

        if (saleError) {
          Alert.alert(
            bookingsCopy.results.confirmSuccessTitle,
            bookingsCopy.results.confirmSuccessButCashFailed({ serviceName, date: dateLabel, time: timeLabel }),
          );
          Alert.alert(
            cashRegisterCopy.alerts.recordSaleFailedTitle,
            cashRegisterCopy.alerts.recordSaleFailedMessage(serviceName),
          );
        } else {
          Alert.alert(
            bookingsCopy.results.confirmSuccessTitle,
            bookingsCopy.results.confirmSuccessMessage({ serviceName, date: dateLabel, time: timeLabel }),
          );
        }
      } catch (error) {
        console.error(error);
        Alert.alert(bookingsCopy.results.confirmFailedTitle, bookingsCopy.results.confirmFailedMessage);
      } finally {
        setConfirmingBookingId(null);
      }
    },
    [
      appendCashEntry,
      bookingsCopy.results,
      cashRegisterCopy.alerts,
      confirmBookingPerformed,
      locale,
      localizedServiceMap,
      recordServiceSale,
      serviceMap,
      updateBookingPerformed,
    ],
  );

  const requestBookingConfirmation = useCallback(
    (booking: BookingWithCustomer) => {
      if (!booking || booking.performed_at) return;
      const service = localizedServiceMap.get(booking.service_id) ?? serviceMap.get(booking.service_id);
      const serviceName = service?.name ?? booking.service_id;
      const dateLabel = humanDate(booking.date, locale);
      const timeLabel = booking.start;

      if (Platform.OS === "web") {
        const promptMessage = bookingsCopy.results.confirmPromptMessage({
          serviceName,
          date: dateLabel,
          time: timeLabel,
        });
        const confirmed = typeof window !== "undefined" && window.confirm
          ? window.confirm(`${bookingsCopy.results.confirmPromptTitle}\n\n${promptMessage}`)
          : true;
        if (confirmed) {
          void confirmBooking(booking);
        }
        return;
      }

      Alert.alert(
        bookingsCopy.results.confirmPromptTitle,
        bookingsCopy.results.confirmPromptMessage({ serviceName, date: dateLabel, time: timeLabel }),
        [
          { text: bookingsCopy.results.confirmPromptCancel, style: "cancel" },
          { text: bookingsCopy.results.confirmPromptConfirm, onPress: () => void confirmBooking(booking) },
        ],
      );
    },
    [
      bookingsCopy.results,
      confirmBooking,
      locale,
      localizedServiceMap,
      serviceMap,
    ],
  );

  /** Recorrência: usa data/horário/serviço/barbeiro já selecionados e o mesmo cliente */
  async function handleRecurrenceSubmit(opts: {
    time: string;
    count: number;
    startFrom: Date;
    frequency: RecurrenceFrequency;
  }) {
    const isFreeze = recurrenceMode === "freeze";
    const recurrenceAlerts = isFreeze
      ? bookServiceCopy.alerts.recurrence.freeze
      : bookServiceCopy.alerts.recurrence.booking;

    if (!selectedService) {
      Alert.alert(bookServiceCopy.alerts.selectService.title, bookServiceCopy.alerts.selectService.message);
      return;
    }

    if (!selectedCustomer && !isFreeze) {
      Alert.alert(bookServiceCopy.alerts.selectClient.title, bookServiceCopy.alerts.selectClient.message);
      return;
    }

    const minutes = selectedService.estimated_minutes;
    const [hh, mm] = opts.time.split(":").map(Number);
    const first = new Date(opts.startFrom);
    first.setHours(hh, mm, 0, 0);

    const addDays = (date: Date, days: number) => {
      const next = new Date(date);
      next.setDate(next.getDate() + days);
      return next;
    };

    const nextMonthlyOccurrence = (current: Date) => {
      let candidate = addDays(current, 28);
      while (candidate.getMonth() === current.getMonth()) {
        candidate = addDays(candidate, 7);
      }
      return candidate;
    };

    const start = `${pad(hh)}:${pad(mm)}`;
    const end = addMinutes(start, minutes);

    let occurrenceDate = new Date(first);

    const raw = Array.from({ length: opts.count }, (_, index) => {
      if (index > 0) {
        if (opts.frequency === "monthly") {
          occurrenceDate = nextMonthlyOccurrence(occurrenceDate);
        } else {
          const step = opts.frequency === "every-15-days" ? 14 : 7;
          occurrenceDate = addDays(occurrenceDate, step);
        }
      }

      const date = toDateKey(occurrenceDate);
      return { date, start, end };
    });

    if (raw.length === 0) {
      Alert.alert(recurrenceAlerts.noPreviewTitle, recurrenceAlerts.noPreviewMessage);
      return;
    }

    try {
      setLoading(true);
      const dates = Array.from(new Set(raw.map((r) => r.date)));
      const existingAll = await getBookingsForDates(dates);

      const byDate = new Map<string, { start: string; end: string; barber: string }[]>();
      (existingAll ?? []).forEach((b) => {
        if (!byDate.has(b.date)) byDate.set(b.date, []);
        byDate.get(b.date)!.push({ start: b.start, end: b.end, barber: b.barber });
      });

      const out: PreviewItem[] = raw.map((r) => {
        if (timeToMinutes(r.end) > closingHour * 60) return { ...r, ok: false, reason: "outside-hours" };
        const dayRows = byDate.get(r.date) ?? [];
        const hasConflict = dayRows.some((b) => b.barber === selectedBarber.id && overlap(r.start, r.end, b.start, b.end));
        return hasConflict ? { ...r, ok: false, reason: "conflict" } : { ...r, ok: true };
      });

      setPreviewItems(out);
      setRecurrenceOpen(false);
      setPreviewMode(recurrenceMode);
      setPreviewOpen(true);
    } catch (e: any) {
      console.error(e);
      Alert.alert(recurrenceAlerts.previewFailureTitle, e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function confirmPreviewInsert() {
    const isFreeze = previewMode === "freeze";
    const recurrenceAlerts = isFreeze
      ? bookServiceCopy.alerts.recurrence.freeze
      : bookServiceCopy.alerts.recurrence.booking;

    if (!selectedService) {
      setPreviewOpen(false);
      Alert.alert(bookServiceCopy.alerts.selectService.title, bookServiceCopy.alerts.selectService.message);
      return;
    }

    if (!selectedCustomer && !isFreeze) {
      setPreviewOpen(false);
      Alert.alert(bookServiceCopy.alerts.selectClient.title, bookServiceCopy.alerts.selectClient.message);
      return;
    }

    const toInsert = previewItems
      .filter((i) => i.ok)
      .map((i) => ({
        date: i.date,
        start: i.start,
        end: i.end,
        service_id: selectedService.id,
        barber: selectedBarber.id,
        customer_id: isFreeze ? null : selectedCustomer?.id ?? null,
        note: isFreeze ? "Schedule freeze" : null,
      }));

    if (toInsert.length === 0) {
      setPreviewOpen(false);
      Alert.alert(recurrenceAlerts.noCreateTitle, recurrenceAlerts.noCreateMessage);
      return;
    }
    try {
      setLoading(true);
      await createBookingsBulk(toInsert);
      if (!isFreeze) {
        const displayServiceName = selectedLocalizedService?.name ?? selectedService.name;
        try {
          const entry = await recordServiceSale({
            serviceId: selectedService.id,
            serviceName: displayServiceName,
            unitPriceCents: selectedService.price_cents,
            quantity: toInsert.length,
            referenceId: null,
          });
          appendCashEntry(entry);
        } catch (registerError: any) {
          console.error(registerError);
          Alert.alert(
            cashRegisterCopy.alerts.recordSaleFailedTitle,
            cashRegisterCopy.alerts.recordSaleFailedMessage(displayServiceName),
          );
        }
      }
      setPreviewOpen(false);
      await load();
      await loadWeek();
      const skipped = previewItems.length - toInsert.length;
      const barberName = BARBER_MAP[selectedBarber.id]?.name ?? selectedBarber.id;
      Alert.alert(
        recurrenceAlerts.createSuccessTitle,
        recurrenceAlerts.createSuccessMessage(toInsert.length, barberName, skipped),
      );
    } catch (e: any) {
      console.error(e);
      Alert.alert(recurrenceAlerts.createFailureTitle, e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  /** Tira de 10 dias */
  const days = useMemo(() => {
    const out: { key: string; d: Date }[] = [];
    const base = new Date(day);
    base.setDate(base.getDate() - 3);
    for (let i = 0; i < 10; i++) {
      const n = new Date(base);
      n.setDate(base.getDate() + i);
      out.push({ d: n, key: toDateKey(n) });
    }
    return out;
  }, [day]);

  const assistantContextSummary = useMemo(() => {
    const serviceList = localizedServices
      .map((s) => assistantCopy.contextSummary.serviceDetail(s.name, s.estimated_minutes))
      .join(", ");
    const barberList = BARBERS.map((b) => b.name).join(", ");
    const bookingCount = bookings.length;

    const hoursLine = assistantCopy.contextSummary.hours(
      `${pad(openingHour)}:00`,
      `${pad(closingHour)}:00`,
    );
    const servicesLine = assistantCopy.contextSummary.services(serviceList);
    const barbersLine = assistantCopy.contextSummary.barbers(barberList);
    const bookingsLine = bookingCount
      ? assistantCopy.contextSummary.bookingsScheduled(bookingCount)
      : assistantCopy.contextSummary.bookingsEmpty;

    return [hoursLine, servicesLine, barbersLine, bookingsLine].join("\n");
  }, [assistantCopy.contextSummary, bookings, localizedServices]);

  const assistantSystemPrompt = useMemo(() => {
    const serviceLines = localizedServices
      .map((s) =>
        assistantCopy.systemPrompt.serviceLine(
          s.name,
          s.estimated_minutes,
          formatPrice(s.price_cents),
        ),
      )
      .join("\n");
    const barberLines = BARBERS.map((b) => assistantCopy.systemPrompt.barberLine(b.name)).join("\n");
    const bookingLines = bookings
      .map((b) => {
        const serviceName = localizedServiceMap.get(b.service_id)?.name ?? b.service_id;
        const barberName = BARBER_MAP[b.barber]?.name ?? b.barber;
        const customerName = b._customer
          ? `${b._customer.first_name}${b._customer.last_name ? ` ${b._customer.last_name}` : ""}`
          : b.customer_name ?? b.customer ?? null;
        return assistantCopy.systemPrompt.bookingLine({
          date: humanDate(b.date, locale),
          start: b.start,
          end: b.end,
          serviceName,
          barberName,
          customerName,
        });
      })
      .slice(0, 12)
      .join("\n");

    const existingBookings = bookingLines || assistantCopy.systemPrompt.bookingsEmpty;

    return [
      assistantCopy.systemPrompt.intro,
      assistantCopy.systemPrompt.hours(`${pad(openingHour)}:00`, `${pad(closingHour)}:00`),
      assistantCopy.systemPrompt.servicesHeader,
      serviceLines,
      assistantCopy.systemPrompt.barbersHeader,
      barberLines,
      assistantCopy.systemPrompt.bookingsHeader,
      existingBookings,
      ...assistantCopy.systemPrompt.instructions,
    ].join("\n");
  }, [assistantCopy.systemPrompt, bookings, locale, localizedServiceMap, localizedServices]);

  const supportContextSummary = useMemo(
    () => supportCopy.contextSummary.join("\n"),
    [supportCopy.contextSummary],
  );

  const supportSystemPrompt = useMemo(
    () => supportCopy.systemPrompt.join("\n"),
    [supportCopy.systemPrompt],
  );

  const filteredBookingsList = useMemo(() => {
    const barber = bookingFilterBarber?.trim();
    const service = bookingFilterService?.trim();
    const client = bookingFilterClient.trim().toLowerCase();
    const startDateTime = buildDateTime(bookingFilterStartDate, bookingFilterStartTime, "00:00");
    const endDateTime = buildDateTime(bookingFilterEndDate, bookingFilterEndTime, "23:59");
    const rangeStartMs = startDateTime?.getTime() ?? null;
    const rangeEndMs = endDateTime?.getTime() ?? null;

    return allBookings
      .filter((booking) => {
        if (barber && booking.barber !== barber) return false;
        if (service && booking.service_id !== service) return false;

        const bookingStart = buildDateTime(booking.date, booking.start ?? null, "00:00");
        const bookingEnd = buildDateTime(
          booking.date,
          booking.end ?? booking.start ?? null,
          booking.start ?? "23:59",
        );
        const bookingStartMs = bookingStart?.getTime() ?? bookingEnd?.getTime() ?? null;
        const bookingEndMs = bookingEnd?.getTime() ?? bookingStart?.getTime() ?? null;

        if (rangeStartMs !== null && bookingEndMs !== null && bookingEndMs < rangeStartMs) return false;
        if (rangeEndMs !== null && bookingStartMs !== null && bookingStartMs > rangeEndMs) return false;

        if (client) {
          const name = `${booking._customer?.first_name ?? ""} ${booking._customer?.last_name ?? ""}`
            .trim()
            .toLowerCase();
          if (!name.includes(client)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.date === b.date) {
          const startA = a.start ?? "";
          const startB = b.start ?? "";
          const compare = startA.localeCompare(startB);
          return bookingSortOrder === "asc" ? compare : -compare;
        }
        const dateCompare = a.date.localeCompare(b.date);
        return bookingSortOrder === "asc" ? dateCompare : -dateCompare;
      });
  }, [
    allBookings,
    bookingSortOrder,
    bookingFilterBarber,
    bookingFilterService,
    bookingFilterClient,
    bookingFilterStartDate,
    bookingFilterStartTime,
    bookingFilterEndDate,
    bookingFilterEndTime,
  ]);

  const groupedBookings = useMemo(() => {
    const groups: { date: string; bookings: BookingWithCustomer[] }[] = [];
    const indexByDate = new Map<string, number>();

    filteredBookingsList.forEach((booking) => {
      const existingIndex = indexByDate.get(booking.date);
      if (existingIndex === undefined) {
        indexByDate.set(booking.date, groups.length);
        groups.push({ date: booking.date, bookings: [booking] });
      } else {
        groups[existingIndex].bookings.push(booking);
      }
    });

    return groups;
  }, [filteredBookingsList]);

  const clearBookingFilters = useCallback(() => {
    setBookingFilterBarber(null);
    setBookingFilterService(null);
    setBookingFilterClient("");
    setBookingFilterStartDate(getTodayDateKey());
    setBookingFilterStartTime("");
    setBookingFilterEndDate("");
    setBookingFilterEndTime("");
  }, []);

  const handleBookingsMutated = useCallback(async () => {
    await load();
    await loadWeek();
    await loadAllBookings();
  }, [load, loadWeek, loadAllBookings]);

  const weekSummary = useMemo(() => {
    const barberCounts = new Map<string, number>();
    let totalMinutes = 0;
    let totalRevenue = 0;

    weekBookings.forEach((booking) => {
      barberCounts.set(booking.barber, (barberCounts.get(booking.barber) ?? 0) + 1);
      const service = serviceMap.get(booking.service_id);
      const duration = service?.estimated_minutes ?? Math.max(timeToMinutes(booking.end) - timeToMinutes(booking.start), 0);
      totalMinutes += duration;
      if (service?.price_cents) {
        totalRevenue += service.price_cents;
      }
    });

    return {
      total: weekBookings.length,
      totalMinutes,
      totalRevenue,
      barberCounts,
    };
  }, [serviceMap, weekBookings]);

  const weekDayMap = useMemo(() => {
    const map = new Map<string, BookingWithCustomer[]>();
    weekBookings.forEach((booking) => {
      if (!map.has(booking.date)) map.set(booking.date, []);
      map.get(booking.date)!.push(booking);
    });
    for (const [, rows] of map) {
      rows.sort((a, b) => a.start.localeCompare(b.start));
    }
    return map;
  }, [weekBookings]);

  const weekDaySummaries = useMemo(
    () => weekDays.map((dayInfo) => ({ ...dayInfo, bookings: weekDayMap.get(dayInfo.key) ?? [] })),
    [weekDayMap, weekDays],
  );

  const weekRangeLabel = useMemo(() => {
    if (!weekDays.length) return "";
    const start = weekDays[0].date;
    const end = weekDays[weekDays.length - 1].date;
    return `${formatRangeDate(start, locale)} – ${formatRangeDate(end, locale)}`;
  }, [locale, weekDays]);

  const topBarberEntry = useMemo(() => {
    const entries = Array.from(weekSummary.barberCounts.entries());
    entries.sort((a, b) => b[1] - a[1]);
    return entries[0] ?? null;
  }, [weekSummary.barberCounts]);

  const serviceBreakdown = useMemo(() => {
    const counts = new Map<
      string,
      {
        count: number;
        name: string;
      }
    >();

    weekBookings.forEach((booking) => {
      const localized = localizedServiceMap.get(booking.service_id);
      const base = localized ?? serviceMap.get(booking.service_id);
      const name = localized?.name ?? base?.name ?? booking.service_id;
      const previous = counts.get(booking.service_id);
      counts.set(booking.service_id, { count: (previous?.count ?? 0) + 1, name });
    });

    return Array.from(counts.entries())
      .map(([serviceId, value]) => ({ id: serviceId, ...value }))
      .sort((a, b) => b.count - a.count);
  }, [localizedServiceMap, serviceMap, weekBookings]);

  const barberBreakdown = useMemo(
    () =>
      Array.from(weekSummary.barberCounts.entries())
        .map(([barberId, count]) => ({
          id: barberId,
          name: BARBER_MAP[barberId]?.name ?? barberId,
          count,
        }))
        .sort((a, b) => b.count - a.count),
    [weekSummary.barberCounts],
  );

  const productSalesBreakdown = useMemo(() => {
    if (!products.length) return [];
    const entries = products.map((product) => ({
      id: product.id,
      name: product.name,
      price_cents: product.price_cents,
      sold: productSalesTotals[product.id] ?? 0,
    }));
    return entries.sort((a, b) => {
      if (b.sold !== a.sold) return b.sold - a.sold;
      return b.price_cents - a.price_cents;
    });
  }, [productSalesTotals, products]);

  const dayTotals = useMemo(
    () =>
      weekDaySummaries.map(({ key, date, bookings }) => ({
        key,
        date,
        count: bookings.length,
        label: formatWeekday(date, locale),
        shortLabel: date.toLocaleDateString(locale, { weekday: "short" }),
      })),
    [locale, weekDaySummaries],
  );

  const busiestDay = useMemo(() => {
    let max: (typeof dayTotals)[number] | null = null;
    dayTotals.forEach((day) => {
      if (!max || day.count > max.count) max = day;
    });
    return max;
  }, [dayTotals]);

  const quietestDay = useMemo(() => {
    let min: (typeof dayTotals)[number] | null = null;
    dayTotals.forEach((day) => {
      if (!min || day.count < min.count) min = day;
    });
    return min;
  }, [dayTotals]);

  const daysInWeek = weekDays.length;
  const totalBookings = weekSummary.total;
  const averagePerDayValue = daysInWeek ? (totalBookings / daysInWeek).toFixed(1) : "0.0";
  const totalHours = weekSummary.totalMinutes / 60;
  const serviceHoursDisplay = totalHours.toFixed(totalHours >= 10 ? 0 : 1);
  const capacityMinutes = daysInWeek * (closingHour - openingHour) * 60;
  const utilizationRatio = capacityMinutes ? Math.min(1, weekSummary.totalMinutes / capacityMinutes) : 0;
  const utilizationPercent = Math.round(utilizationRatio * 100);
  const avgDurationMinutes = totalBookings ? Math.round(weekSummary.totalMinutes / totalBookings) : 0;
  const avgTicketCents = totalBookings ? Math.round(weekSummary.totalRevenue / totalBookings) : 0;
  const bookingsTarget = Math.max(totalBookings || 0, daysInWeek * 6);
  const bookingsProgress = bookingsTarget ? Math.min(1, totalBookings / bookingsTarget) : 0;
  const revenueTarget = Math.max(weekSummary.totalRevenue || 0, daysInWeek * 8000);
  const revenueProgress = revenueTarget ? Math.min(1, weekSummary.totalRevenue / revenueTarget) : 0;
  const topBarberSharePercent =
    topBarberEntry && totalBookings ? Math.round((topBarberEntry[1] / totalBookings) * 100) : 0;

  const statCards = [
    {
      key: "bookings" as const,
      icon: "calendar-check" as const,
      label: copy.stats.bookingsLabel,
      detail: copy.stats.averagePerDay(averagePerDayValue),
      value: totalBookings.toString(),
      chip: totalBookings ? copy.stats.avgDuration(avgDurationMinutes.toString()) : undefined,
      chipIcon: "clock-outline" as const,
      progress: bookingsTarget ? bookingsProgress : undefined,
    },
    {
      key: "hours" as const,
      icon: "clock-time-three" as const,
      label: copy.stats.serviceHoursLabel,
      detail: copy.stats.serviceHoursDetail,
      value: serviceHoursDisplay,
      chip: capacityMinutes ? copy.stats.utilization(utilizationPercent.toString()) : undefined,
      chipIcon: "speedometer" as const,
      progress: capacityMinutes ? utilizationRatio : undefined,
    },
    {
      key: "revenue" as const,
      icon: "cash-multiple" as const,
      label: copy.stats.revenueLabel,
      detail: copy.stats.revenueDetail,
      value: formatPrice(weekSummary.totalRevenue),
      chip: totalBookings ? copy.stats.avgTicket(formatPrice(avgTicketCents)) : undefined,
      chipIcon: "cash-100" as const,
      progress: revenueTarget ? revenueProgress : undefined,
    },
    {
      key: "barber" as const,
      icon: "account-tie" as const,
      label: copy.stats.busiestBarberLabel,
      detail: topBarberEntry ? copy.stats.busiestDetail(topBarberEntry[1]) : copy.noBookings,
      value: topBarberEntry ? BARBER_MAP[topBarberEntry[0]]?.name ?? topBarberEntry[0] : "—",
      chip:
        topBarberEntry && totalBookings
          ? copy.stats.topShare(topBarberSharePercent.toString())
          : topBarberEntry
            ? copy.stats.noBarberData
            : undefined,
      chipIcon: "chart-donut" as const,
      progress: topBarberEntry && totalBookings ? Math.min(1, topBarberSharePercent / 100) : undefined,
    },
  ];

  const handleNavigate = useCallback(
    (screen: ScreenName) => {
      setActiveScreen(screen);
      onNavigate?.(screen);
    },
    [onNavigate],
  );

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;

    const html = document.documentElement;
    const body = document.body;

    const previous = {
      htmlBg: html.style.backgroundColor,
      bodyBg: body.style.backgroundColor,
      htmlOverflowX: html.style.overflowX,
      bodyOverflowX: body.style.overflowX,
      htmlOverscroll: html.style.getPropertyValue("overscroll-behavior"),
      bodyOverscroll: body.style.getPropertyValue("overscroll-behavior"),
    };

    html.style.backgroundColor = colors.bg;
    body.style.backgroundColor = colors.bg;
    html.style.overflowX = "hidden";
    body.style.overflowX = "hidden";
    html.style.setProperty("overscroll-behavior", "contain");
    body.style.setProperty("overscroll-behavior", "contain");

    return () => {
      html.style.backgroundColor = previous.htmlBg;
      body.style.backgroundColor = previous.bodyBg;
      html.style.overflowX = previous.htmlOverflowX;
      body.style.overflowX = previous.bodyOverflowX;
      if (previous.htmlOverscroll) html.style.setProperty("overscroll-behavior", previous.htmlOverscroll);
      else html.style.removeProperty("overscroll-behavior");
      if (previous.bodyOverscroll) body.style.setProperty("overscroll-behavior", previous.bodyOverscroll);
      else body.style.removeProperty("overscroll-behavior");
    };
  }, [colors.bg]);

  if (!preferencesReady) {
    return (
      <View style={[styles.loadingRoot, { backgroundColor: colors.bg }]}>
        <View style={[styles.loadingCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingTitle, { color: colors.text }]}>{copy.loading.title}</Text>
          <Text style={[styles.loadingSubtitle, { color: colors.subtext }]}>{copy.loading.subtitle}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.appShell, { backgroundColor: colors.bg }]}>
      <View style={styles.mainArea}>
        {activeScreen === "bookService" ? (
          <>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <MaterialCommunityIcons name="content-cut" size={26} color="#fff" />
                  <Text style={styles.title}>AIBarber</Text>
                </View>
                <View style={styles.badge}>
                  <Ionicons name="time-outline" size={14} color={colors.subtext} />
                  <Text style={styles.badgeText}>09:00–18:00</Text>
                </View>
              </View>
            </View>

            {/* Content */}
            <ScrollView
              contentContainerStyle={[styles.container, isCompactLayout && styles.containerCompact]}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
              <View style={{ gap: isCompactLayout ? 16 : 20 }}>
                {/* Client picker (now displayed before service selection) */}
                <View style={{ gap: 8 }}>
                  <Text style={{ color: colors.subtext, fontWeight: "800", fontSize: 12 }}>
                    {bookServiceCopy.clientSection.title}
                  </Text>
                  <View style={[styles.cardRow, { borderColor: colors.border }, isCompactLayout && styles.cardRowStack]}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: "800" }}>
                        {selectedCustomer
                          ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}`
                          : bookServiceCopy.clientSection.noneSelected}
                      </Text>
                      {selectedCustomer?.phone ? (
                        <Text style={{ color: colors.subtext, fontSize: 12 }}>
                          {selectedCustomer.phone} · {selectedCustomer.email ?? ""}
                        </Text>
                      ) : null}
                    </View>
                    <Pressable
                      onPress={() => setClientModalOpen(true)}
                      style={[styles.smallBtn, { borderColor: colors.accent, backgroundColor: colors.accent }]}
                    >
                      <Text style={{ color: colors.accentFgOn, fontWeight: "900" }}>
                        {selectedCustomer ? bookServiceCopy.clientSection.change : bookServiceCopy.clientSection.select}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <View>
                  <Text style={styles.sectionLabel}>{bookServiceCopy.serviceSection.title}</Text>
                  <View style={styles.chipsRow}>
                    {services.length === 0 ? (
                      <View style={[styles.chip, { opacity: 0.7 }]}>
                        <Text style={[styles.chipText, { color: colors.subtext }]}>
                          {bookServiceCopy.serviceSection.empty}
                        </Text>
                      </View>
                    ) : (
                      services.map((s) => {
                        const localized = localizedServiceMap.get(s.id) ?? s;
                        const active = s.id === selectedServiceId;
                        return (
                          <Pressable
                            key={s.id}
                            onPress={() => setSelectedServiceId(s.id)}
                            style={[styles.chip, active && styles.chipActive]}
                          >
                            <MaterialCommunityIcons
                              name={s.icon}
                              size={16}
                              color={active ? colors.accentFgOn : colors.subtext}
                            />
                            <Text style={[styles.chipText, active && styles.chipTextActive]}>
                              {localized.name} · {s.estimated_minutes}m
                            </Text>
                          </Pressable>
                        );
                      })
                    )}
                  </View>
                </View>

                {/* Barber selector */}
                <Text style={styles.sectionLabel}>{bookServiceCopy.barberSectionTitle}</Text>
                <BarberSelector selected={selectedBarber} onChange={setSelectedBarber} />
              </View>

              {/* Date selector */}
              <Text style={styles.sectionLabel}>{bookServiceCopy.dateSectionTitle}</Text>
              <DateSelector
                value={day}
                onChange={setDay}
                colors={{
                  text: colors.text,
                  subtext: colors.subtext,
                  surface: colors.surface,
                  border: colors.border,
                  accent: colors.accent,
                  accentFgOn: colors.accentFgOn,
                }}
                locale={locale}
              />

              {/* Slots */}
              <Text style={styles.sectionLabel}>{bookServiceCopy.slots.title(humanDate(dateKey, locale))}</Text>
          <View style={styles.card}>
            {selectedService ? (
              <View style={{ gap: 12 }}>
                {slotPeriods.map(({ key, label }) => {
                  const periodSlots = slotGroups[key];
                  if (!periodSlots.length) return null;

                  return (
                    <View key={key} style={styles.slotGroup}>
                      <Text style={styles.slotGroupTitle}>{label}</Text>
                      <View style={styles.grid}>
                        {periodSlots.map((t) => {
                          const isAvailable = availableSlots.includes(t);
                          const isSelected = selectedSlot === t;

                          if (!isAvailable) {
                            const slotEnd = addMinutes(t, SLOT_MINUTES);
                            const overlappingBooking = bookings.find(
                              (b) =>
                                b.barber === selectedBarber.id &&
                                overlap(t, slotEnd, b.start, b.end),
                            );
                            const conflict = overlappingBooking ?? bookings.find(
                              (b) =>
                                b.barber === selectedBarber.id &&
                                overlap(t, addMinutes(t, selectedService.estimated_minutes), b.start, b.end),
                            );
                            const conflictService = conflict
                              ? localizedServiceMap.get(conflict.service_id) ?? serviceMap.get(conflict.service_id)
                            return (
                              <Pressable
                                key={t}
                                onPress={() =>
                                  Alert.alert(
                                    bookServiceCopy.slots.busyTitle,
                                    conflict
                                      ? bookServiceCopy.slots.busyMessage(
                                          conflictService?.name ?? conflict.service_id,
                                          BARBER_MAP[conflict.barber]?.name ?? conflict.barber,
                                          conflict.start,
                                          conflict.end,
                                        )
                                      : bookServiceCopy.slots.busyFallback,
                                  )
                                }
                                style={[
                                  styles.slot,
                                  overlappingBooking ? styles.slotBusy : styles.slotDisabled,
                                ]}
                              >
                                <Ionicons
                                  name={overlappingBooking ? "close-circle-outline" : "time-outline"}
                                  size={16}
                                  color={overlappingBooking ? colors.danger : colors.subtext}
                                />
                                <Text style={overlappingBooking ? styles.slotBusyText : styles.slotDisabledText}>{t}</Text>
                              </Pressable>
                            );
                          }

                          return (
                            <Pressable
                              key={t}
                              onPress={() => setSelectedSlot(t)}
                              style={[styles.slot, isSelected && styles.slotActive]}
                            >
                              <Ionicons
                                name="time-outline"
                                size={16}
                                color={isSelected ? colors.accentFgOn : colors.subtext}
                              />
                              <Text style={[styles.slotText, isSelected && styles.slotTextActive]}>{t}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.empty}>{bookServiceCopy.slots.empty}</Text>
            )}

            {/* Resumo fixo */}
            {selectedSlot && selectedService && (
              <Text style={styles.summaryText}>
                {(selectedLocalizedService?.name ?? selectedService.name)} • {BARBER_MAP[selectedBarber.id]?.name} • {selectedSlot} • {humanDate(dateKey, locale)}
                {selectedCustomer ? ` • ${selectedCustomer.first_name}` : ""}
              </Text>
            )}

            {/* Botões lado a lado (Book + Repeat) */}
            <View style={{ marginTop: 12, flexDirection: "row", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
              <Pressable
                onPress={async () => {
                  if (!selectedSlot) {
                    Alert.alert(
                      bookServiceCopy.alerts.selectSlot.title,
                      bookServiceCopy.alerts.selectSlot.message,
                    );
                    return;
                  }
                  await book(selectedSlot);
                  setSelectedSlot(null);
                }}
                disabled={!selectedSlot || loading || !selectedCustomer}
                style={[styles.bookBtn, (!selectedSlot || loading || !selectedCustomer) && styles.bookBtnDisabled]}
                accessibilityRole="button"
                accessibilityLabel={bookServiceCopy.actions.book.accessibility}
              >
                <Text style={styles.bookBtnText}>{bookServiceCopy.actions.book.label}</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  if (!selectedSlot) {
                    Alert.alert(
                      bookServiceCopy.alerts.selectSlot.title,
                      bookServiceCopy.alerts.selectSlot.message,
                    );
                    return;
                  }
                  if (!selectedCustomer) {
                    Alert.alert(
                      bookServiceCopy.alerts.selectClient.title,
                      bookServiceCopy.alerts.selectClient.message,
                    );
                    return;
                  }
                  setRecurrenceMode("booking");
                  setRecurrenceOpen(true);
                }}
                style={[styles.bookBtn, (!selectedSlot || loading || !selectedCustomer) && styles.bookBtnDisabled, { flexDirection: "row", alignItems: "center" }]}
                accessibilityRole="button"
                accessibilityLabel={bookServiceCopy.actions.repeat.accessibility}
              >
                <Ionicons name="repeat" size={16} color={colors.accentFgOn} />
                <Text style={[styles.bookBtnText, { marginLeft: 6 }]}>
                  {bookServiceCopy.actions.repeat.label}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  if (!selectedSlot) {
                    Alert.alert(
                      bookServiceCopy.alerts.selectSlot.title,
                      bookServiceCopy.alerts.selectSlot.message,
                    );
                    return;
                  }
                  if (!selectedService) {
                    Alert.alert(
                      bookServiceCopy.alerts.selectService.title,
                      bookServiceCopy.alerts.selectService.message,
                    );
                    return;
                  }
                  setRecurrenceMode("freeze");
                  setRecurrenceOpen(true);
                }}
                style={[styles.bookBtn, (!selectedSlot || loading) && styles.bookBtnDisabled, { flexDirection: "row", alignItems: "center" }]}
                disabled={!selectedSlot || loading}
                accessibilityRole="button"
                accessibilityLabel={bookServiceCopy.actions.freeze.accessibility}
              >
                <Ionicons name="snow-outline" size={16} color={colors.accentFgOn} />
                <Text style={[styles.bookBtnText, { marginLeft: 6 }]}>
                  {bookServiceCopy.actions.freeze.label}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Bookings */}
          <Text style={styles.sectionLabel}>{bookServiceCopy.bookingsList.title}</Text>
          <View style={{ gap: 10 }}>
            {bookings.length === 0 ? (
              <View style={styles.card}>
                <Text style={styles.empty}>{bookServiceCopy.bookingsList.empty}</Text>
              </View>
            ) : (
              bookings.map((b) => {
                const rawService = serviceMap.get(b.service_id);
                const displayService = localizedServiceMap.get(b.service_id) ?? rawService;
                const svc = displayService?.name ?? b.service_id;
                const barber = BARBER_MAP[b.barber] ?? { name: b.barber, icon: "account" as const };
                const serviceIcon = (displayService?.icon ?? rawService?.icon ?? "content-cut") as keyof typeof MaterialCommunityIcons.glyphMap;
                return (
                  <View key={b.id} style={styles.bookingCard}>
                    <View style={styles.bookingIconWrapper}>
                      <MaterialCommunityIcons name={serviceIcon} size={20} color={colors.accent} />
                    </View>
                    <View style={styles.bookingContent}>
                      <View style={styles.bookingHeader}>
                        <Text style={styles.bookingTitle}>{svc}</Text>
                        <View style={styles.bookingTimePill}>
                          <Ionicons name="time-outline" size={12} color={colors.accent} />
                          <Text style={styles.bookingTimeText}>
                            {b.start}–{b.end}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.bookingMetaRow}>
                        <View style={styles.bookingMetaItem}>
                          <MaterialCommunityIcons name={barber.icon} size={16} color={colors.subtext} />
                          <Text style={styles.bookingMetaText}>{barber.name}</Text>
                        </View>
                        {b._customer ? (
                          <View style={styles.bookingMetaItem}>
                            <Ionicons name="person-outline" size={14} color={colors.subtext} />
                            <Text style={styles.bookingMetaText}>{b._customer.first_name}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <Pressable
                      onPress={() => onCancel(b.id)}
                      style={styles.cancelBtn}
                      accessibilityRole="button"
                      accessibilityLabel={bookServiceCopy.bookingsList.cancel}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      <Text style={styles.cancelText}>{bookServiceCopy.bookingsList.cancel}</Text>
                    </Pressable>
                  </View>
                );
              })
            )}
          </View>

          <Text style={styles.note}>{bookServiceCopy.bookingsList.tip}</Text>
        </ScrollView>

        {/* Modals: Recorrência e Preview (mantidos) */}
        <RecurrenceModal
          visible={recurrenceOpen}
          onClose={() => setRecurrenceOpen(false)}
          onSubmit={handleRecurrenceSubmit}
          fixedDate={day}
          fixedTime={selectedSlot || "00:00"}
          fixedService={selectedLocalizedService?.name ?? ""}
          fixedBarber={BARBER_MAP[selectedBarber.id]?.name || selectedBarber.id}
          colors={{ text: colors.text, subtext: colors.subtext, surface: colors.surface, border: colors.border, accent: colors.accent, bg: colors.sidebarBg }}
          copy={recurrenceMode === "freeze" ? copy.freezeModal : copy.recurrenceModal}
        />
        <OccurrencePreviewModal
          visible={previewOpen}
          items={previewItems}
          onClose={() => setPreviewOpen(false)}
          onConfirm={confirmPreviewInsert}
          colors={{ text: colors.text, subtext: colors.subtext, surface: colors.surface, border: colors.border, accent: colors.accent, bg: colors.bg, danger: colors.danger }}
          copy={previewMode === "freeze" ? copy.freezePreview : copy.occurrencePreview}
        />

        {/* Modal de clientes (lista + criar via UserForm) */}
        <ClientModal
          visible={clientModalOpen}
          onClose={() => setClientModalOpen(false)}
          customers={customers}
          loading={customersLoading}
          onRefreshQuery={(q) => { setCustomerQuery(q); refreshCustomers(q); }}
          onPick={(c) => { setSelectedCustomer(c); setClientModalOpen(false); }}
          onSaved={(c) => { setSelectedCustomer(c); refreshCustomers(); }}
          copy={bookServiceCopy.clientModal}
          colors={colors}
          styles={styles}
        />

          {loading && (
            <View style={styles.loadingOverlay} pointerEvents="none">
              <ActivityIndicator size="large" />
            </View>
          )}
      </>
    ) : activeScreen === "bookings" ? (
      renderBookings
        ? renderBookings({
            isCompactLayout,
            isUltraCompactLayout,
            colors,
            styles,
            bookingsCopy,
            allBookingsLoading,
            loadAllBookings,
            onCreateBooking: () => handleNavigate("bookService"),
            bookingFilterBarber,
            setBookingFilterBarber,
            bookingFilterService,
            setBookingFilterService,
            bookingSortOrder,
            setBookingSortOrder,
            bookingLimitOptions: BOOKING_LIMIT_OPTIONS,
            bookingResultLimit,
            setBookingResultLimit,
            bookingFilterClient,
            setBookingFilterClient,
            bookingFilterStartDate,
            setBookingFilterStartDate,
            bookingFilterStartTime,
            setBookingFilterStartTime,
            bookingFilterEndDate,
            setBookingFilterEndDate,
            bookingFilterEndTime,
            setBookingFilterEndTime,
            clearBookingFilters,
            services,
            localizedServiceMap,
            serviceMap,
            filteredBookingsList,
            groupedBookings,
            allBookings,
            locale,
            requestBookingConfirmation,
            confirmingBookingId,
          })
        : null
    ) : activeScreen === "products" ? (
      renderProducts
        ? renderProducts({
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
          })
        : null
    ) : activeScreen === "packages" ? (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: isCompactLayout ? 16 : 20, gap: 16 }}
        refreshControl={<RefreshControl refreshing={servicePackagesLoading} onRefresh={loadServicePackages} />}
      >
        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 12 }]}>
          <View style={[styles.listHeaderRow, isCompactLayout && styles.listHeaderRowCompact]}> 
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.title, { color: colors.text }]}>{packagesCopy.title}</Text>
              <Text style={{ color: colors.subtext, fontSize: 13, fontWeight: "600" }}>
                {packagesCopy.subtitle}
              </Text>
            </View>
            <View
              style={{
                flexDirection: isCompactLayout ? "column" : "row",
                alignItems: "flex-end",
                gap: 8,
              }}
            >
              <Pressable
                onPress={handleOpenCreatePackage}
                style={[styles.defaultCta, { marginTop: 0 }, isCompactLayout && styles.fullWidthButton]}
                accessibilityRole="button"
                accessibilityLabel={packagesCopy.createCta.accessibility}
              >
                <Text style={styles.defaultCtaText}>{packagesCopy.createCta.label}</Text>
              </Pressable>
              <Pressable
                onPress={loadServicePackages}
                style={[styles.smallBtn, { alignSelf: "flex-end", borderColor: colors.border }]}
                accessibilityRole="button"
                accessibilityLabel={packagesCopy.refreshAccessibility}
              >
                <Text style={{ color: colors.subtext, fontWeight: "800" }}>{packagesCopy.refresh}</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {packageFormVisible ? (
          <ServicePackageForm
            mode={packageFormMode}
            package={packageFormMode === "edit" ? packageBeingEdited : null}
            services={localizedServices}
            onCreated={handlePackageCreated}
            onUpdated={handlePackageUpdated}
            onCancel={handlePackageFormClose}
            colors={{
              text: colors.text,
              subtext: colors.subtext,
              border: colors.border,
              surface: colors.surface,
              accent: colors.accent,
              accentFgOn: colors.accentFgOn,
              danger: colors.danger,
            }}
            copy={copy.servicePackageForm}
          />
        ) : null}

        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 12 }]}>
          <Text style={[styles.title, { color: colors.text }]}>{packagesCopy.listTitle}</Text>
          {servicePackages.length === 0 ? (
            <Text style={[styles.empty, { marginVertical: 8 }]}>{packagesCopy.empty}</Text>
          ) : (
            servicePackages.map((pkg) => {
              const priceLabel = packagesCopy.priceWithBase(
                formatPrice(pkg.price_cents),
                formatPrice(pkg.regular_price_cents),
              );
              const discountPercent =
                pkg.regular_price_cents > 0 && pkg.price_cents < pkg.regular_price_cents
                  ? Math.max(0, Math.round((1 - pkg.price_cents / pkg.regular_price_cents) * 100))
                  : 0;
              const discountLabel =
                discountPercent > 0 ? packagesCopy.discountBadge(String(discountPercent)) : null;
              return (
                <View key={pkg.id} style={[styles.serviceRow, styles.packageRow]}>
                  <View style={{ flex: 1, gap: 10 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <MaterialCommunityIcons name="package-variant-closed" size={22} color={colors.accent} />
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={{ color: colors.text, fontWeight: "800" }}>{pkg.name}</Text>
                        <Text style={{ color: colors.subtext, fontSize: 12 }}>{priceLabel}</Text>
                      </View>
                      {discountLabel ? (
                        <View style={[styles.packageBadge, { borderColor: colors.accent }]}> 
                          <Text style={{ color: colors.accent, fontWeight: "800", fontSize: 12 }}>{discountLabel}</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.packageItemsList}>
                      <Text style={[styles.packageItemsLabel, { color: colors.subtext }]}>
                        {packagesCopy.itemsLabel}
                      </Text>
                      {pkg.items.map((item) => {
                        const localized =
                          localizedServiceMap.get(item.service_id) ?? serviceMap.get(item.service_id);
                        const serviceName = localized?.name ?? item.service_id;
                        return (
                          <Text key={item.id} style={[styles.packageItemText, { color: colors.subtext }]}>
                            {packagesCopy.itemLine(item.quantity, serviceName)}
                          </Text>
                        );
                      })}
                    </View>
                  </View>
                  <View style={styles.serviceActions}>
                    <Pressable
                      onPress={() => handleOpenEditPackage(pkg)}
                      style={[styles.smallBtn, { borderColor: colors.border }]}
                      accessibilityRole="button"
                      accessibilityLabel={packagesCopy.actions.edit.accessibility(pkg.name)}
                    >
                      <Text style={{ color: colors.subtext, fontWeight: "800" }}>
                        {packagesCopy.actions.edit.label}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleDeletePackage(pkg)}
                      style={[
                        styles.smallBtn,
                        {
                          borderColor: colors.danger,
                          backgroundColor: "rgba(239,68,68,0.1)",
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={packagesCopy.actions.delete.accessibility(pkg.name)}
                    >
                      <Text style={{ color: colors.danger, fontWeight: "800" }}>
                        {packagesCopy.actions.delete.label}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    ) : activeScreen === "cashRegister" ? (
      renderCashRegister
        ? renderCashRegister({
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
          })
        : null
    ) : activeScreen === "services" ? (
      renderServices
        ? renderServices({
            isCompactLayout,
            colors,
            styles,
            servicesCopy,
            servicesLoading,
            loadServices,
            handleOpenCreateService,
            serviceFormVisible,
            serviceFormMode,
            serviceBeingEdited,
            handleServiceCreated,
            handleServiceUpdated,
            handleServiceFormClose,
            serviceFormCopy,
            services,
            localizedServiceMap,
            handleOpenEditService,
            handleDeleteService,
          })
        : null
    ) : activeScreen === "assistant" ? (
      (renderAssistant ?? defaultAssistantRenderer)({
        colors,
        assistantCopy,
        assistantSystemPrompt,
        assistantContextSummary,
        handleBookingsMutated,
        localizedServices,
      })
    ) : activeScreen === "support" ? (
      <SupportChat
        colors={{
          text: colors.text,
          subtext: colors.subtext,
          surface: colors.surface,
          border: colors.border,
          accent: colors.accent,
          accentFgOn: colors.accentFgOn,
          danger: colors.danger,
          bg: colors.bg,
        }}
        systemPrompt={supportSystemPrompt}
        contextSummary={supportContextSummary}
        title={copy.navigation.support}
        subtitle={supportCopy.chat.inputPlaceholder}
        copy={supportCopy.chat}
        quickReplies={supportCopy.quickReplies}
      />
    ) : activeScreen === "team" ? (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: isCompactLayout ? 16 : 20, gap: 16 }}>
        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 12 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <Ionicons name="people-outline" size={22} color={colors.accent} />
            <Text style={[styles.title, { color: colors.text }]}>{teamCopy.title}</Text>
          </View>
          <Text style={{ color: colors.subtext, fontSize: 13, fontWeight: "600" }}>{teamCopy.subtitle}</Text>
        </View>

        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 16 }]}>
          <Pressable
            onPress={() => void loadTeamMembers()}
            style={[styles.smallBtn, { alignSelf: "flex-start", borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel={teamCopy.refresh}
          >
            <Text style={{ color: colors.subtext, fontWeight: "800" }}>{teamCopy.refresh}</Text>
          </Pressable>

          <View style={{ gap: 10 }}>
            <Text style={[styles.languageLabel, { color: colors.subtext }]}>{teamCopy.listTitle}</Text>
            <View style={[styles.teamList, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              {teamLoading ? (
                <ActivityIndicator color={colors.accent} />
              ) : teamMembers.length === 0 ? (
                <Text style={{ color: colors.subtext }}>{teamCopy.empty}</Text>
              ) : (
                teamMembers.map((member) => {
                  const fullName = `${member.first_name ?? ""} ${member.last_name ?? ""}`.trim() ||
                    member.email ||
                    member.phone ||
                    "—";
                  const roleLabel = teamRoleLabelMap[member.role] ?? member.role;
                  return (
                    <View key={member.id} style={styles.teamListRow}>
                      <MaterialCommunityIcons
                        name="account-badge"
                        size={20}
                        color={colors.accent}
                        style={styles.teamListIcon}
                      />
                      <View style={styles.teamListInfo}>
                        <Text style={{ color: colors.text, fontWeight: "800" }}>{fullName}</Text>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                          <View
                            style={[
                              styles.teamRoleBadge,
                              { borderColor: colors.border, backgroundColor: colors.surface },
                            ]}
                          >
                            <Text style={{ color: colors.accent, fontWeight: "700", fontSize: 12 }}>
                              {roleLabel}
                            </Text>
                          </View>
                          {member.email ? (
                            <Text style={{ color: colors.subtext, fontSize: 12 }}>{member.email}</Text>
                          ) : null}
                          {member.phone ? (
                            <Text style={{ color: colors.subtext, fontSize: 12 }}>{member.phone}</Text>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>

          <Pressable
            onPress={teamFormVisible ? handleCloseTeamForm : handleOpenTeamForm}
            style={[
              styles.smallBtn,
              {
                alignSelf: "flex-start",
                borderColor: teamFormVisible ? colors.border : colors.accent,
                backgroundColor: teamFormVisible ? "transparent" : "rgba(37,99,235,0.12)",
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={teamFormVisible ? teamCopy.userForm.buttons.cancel : teamCopy.userForm.title}
          >
            <Text style={{ color: teamFormVisible ? colors.subtext : colors.accent, fontWeight: "800" }}>
              {teamFormVisible ? teamCopy.userForm.buttons.cancel : teamCopy.userForm.title}
            </Text>
          </Pressable>

          {teamFormVisible ? (
            <UserForm
              table="staff_members"
              availableRoles={teamCopy.roles}
              colors={{
                text: colors.text,
                subtext: colors.subtext,
                border: colors.border,
                surface: colors.surface,
                accent: colors.accent,
                accentFgOn: colors.accentFgOn,
                danger: colors.danger,
              }}
              copy={teamCopy.userForm}
              onSaved={() => {
                handleCloseTeamForm();
                void loadTeamMembers();
              }}
              onCancel={handleCloseTeamForm}
            />
          ) : null}
        </View>
      </ScrollView>
    ) : activeScreen === "barbershopSettings" ? (
      (renderBarbershopSettings ?? defaultBarbershopSettingsRenderer)({
        isCompactLayout,
        colors,
        styles,
        barbershopPageCopy,
        barbershopLoading,
        barbershop,
        barbershopForm,
        barbershopSaving,
        barbershopError,
        barbershopSuccess,
        handleBarbershopFieldChange,
        handleSaveBarbershop,
        handleRetryBarbershop,
      })
    ) : activeScreen === "settings" ? (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: isCompactLayout ? 16 : 20, gap: 16 }}>
        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 12 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <Ionicons name="settings-outline" size={22} color={colors.accent} />
            <Text style={[styles.title, { color: colors.text }]}>{copy.settingsPage.title}</Text>
          </View>
          <Text style={{ color: colors.subtext, fontSize: 13, fontWeight: "600" }}>
            {copy.settingsPage.subtitle}
          </Text>
        </View>

        {showEmailConfirmationReminder ? (
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 12 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="mail-unread-outline" size={20} color={colors.accent} />
              <Text style={[styles.languageLabel, { color: colors.accent }]}>
                {emailConfirmationCopy.title}
              </Text>
            </View>
            <Text style={{ color: colors.subtext, fontSize: 13, fontWeight: "600" }}>
              {emailConfirmationCopy.description(currentUser?.email ?? "")}
            </Text>
            {resentConfirmation ? (
              <Text style={{ color: colors.accent, fontWeight: "700" }}>
                {emailConfirmationCopy.success}
              </Text>
            ) : null}
            {resendConfirmationError ? (
              <Text style={{ color: colors.danger, fontWeight: "700" }}>{resendConfirmationError}</Text>
            ) : null}
            <Pressable
              onPress={handleResendConfirmationEmail}
              disabled={resendingConfirmation}
              style={[
                styles.smallBtn,
                {
                  alignSelf: "flex-start",
                  borderColor: colors.accent,
                  backgroundColor: colors.accent,
                  opacity: resendingConfirmation ? 0.7 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={emailConfirmationCopy.action}
            >
              <Text style={{ color: colors.accentFgOn, fontWeight: "900" }}>
                {resendingConfirmation ? emailConfirmationCopy.sending : emailConfirmationCopy.action}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 16 }]}>
          <View style={styles.statusHeader}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.languageLabel, { color: colors.subtext }]}>
                {copy.settingsPage.apiStatus.title}
              </Text>
              <Text style={{ color: colors.subtext, fontSize: 13, fontWeight: "600" }}>
                {copy.settingsPage.apiStatus.description}
              </Text>
            </View>
            <Pressable
              onPress={handleRefreshApiStatuses}
              disabled={apiStatusLoading}
              style={[
                styles.statusRefresh,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  opacity: apiStatusLoading ? 0.5 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                apiStatusLoading
                  ? copy.settingsPage.apiStatus.refreshing
                  : copy.settingsPage.apiStatus.refresh
              }
            >
              <Ionicons name="refresh" size={16} color={colors.subtext} />
              <Text style={[styles.statusRefreshText, { color: colors.subtext }]}>
                {apiStatusLoading
                  ? copy.settingsPage.apiStatus.refreshing
                  : copy.settingsPage.apiStatus.refresh}
              </Text>
            </Pressable>
          </View>

          {apiStatusLoading ? (
            <View style={styles.statusLoadingRow}>
              <ActivityIndicator size="small" color={colors.subtext} />
              <Text style={[styles.statusErrorText, { color: colors.subtext }]}>
                {copy.settingsPage.apiStatus.loading}
              </Text>
            </View>
          ) : apiStatusError ? (
            <View style={{ gap: 6 }}>
              <Text style={[styles.statusErrorText, { color: colors.danger }]}>
                {copy.settingsPage.apiStatus.error}
              </Text>
              <Text style={[styles.statusErrorText, { color: colors.subtext }]}>
                {apiStatusError}
              </Text>
            </View>
          ) : (
            <View style={styles.statusList}>
              {API_STATUS_ORDER.map((service) => {
                const status = apiStatuses.find((item) => item.service === service);
                const state = status?.state ?? "unavailable";
                const label = copy.settingsPage.apiStatus.labels[service];
                const detail =
                  (status?.message && status.message.trim()) ||
                  copy.settingsPage.apiStatus.states[state];
                const pillStyle = [
                  styles.statusPill,
                  state === "available"
                    ? styles.statusPillAvailable
                    : state === "unauthorized"
                      ? styles.statusPillUnauthorized
                      : styles.statusPillUnavailable,
                ];
                const pillColor =
                  state === "available"
                    ? colors.accent
                    : state === "unauthorized"
                      ? colors.subtext
                      : colors.danger;
                const iconName: React.ComponentProps<typeof Ionicons>["name"] =
                  state === "available"
                    ? "checkmark-circle"
                    : state === "unauthorized"
                      ? "lock-closed"
                      : "alert-circle";
                return (
                  <View key={service} style={styles.statusRow}>
                    <View style={styles.statusLabelGroup}>
                      <Text style={[styles.statusLabel, { color: colors.text }]}>{label}</Text>
                      <Text style={[styles.statusDescription, { color: colors.subtext }]}>{detail}</Text>
                    </View>
                    <View style={pillStyle}>
                      <Ionicons name={iconName} size={16} color={pillColor} />
                      <Text style={[styles.statusPillText, { color: pillColor }]}>
                        {copy.settingsPage.apiStatus.states[state]}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 16 }]}>
          <Text style={[styles.languageLabel, { color: colors.subtext }]}>{copy.languageLabel}</Text>
          <View style={styles.languageOptions}>
            {LANGUAGE_OPTIONS.map((option) => {
              const isActive = option.code === language;
              return (
                <Pressable
                  key={option.code}
                  onPress={() => setLanguage(option.code)}
                  style={[
                    styles.languageOption,
                    { borderColor: colors.border, backgroundColor: colors.surface },
                    isActive && { backgroundColor: colors.accent, borderColor: colors.accent },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${copy.switchLanguage} ${option.label}`}
                >
                  <Text
                    style={[
                      styles.languageOptionText,
                      { color: isActive ? colors.accentFgOn : colors.subtext },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 12 }]}>
          <Text style={[styles.languageLabel, { color: colors.subtext }]}>{copy.settingsPage.themeLabel}</Text>
          <Text style={{ color: colors.subtext, fontSize: 13, fontWeight: "600" }}>
            {copy.settingsPage.themeDescription}
          </Text>
          <View style={styles.languageOptions}>
            {THEME_OPTIONS.map((option) => {
              const isActive = option.value === themePreference;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setThemePreference(option.value)}
                  style={[
                    styles.languageOption,
                    { borderColor: colors.border, backgroundColor: colors.surface },
                    isActive && { backgroundColor: colors.accent, borderColor: colors.accent },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${copy.settingsPage.themeLabel}: ${copy.settingsPage.themeOptions[option.value]}`}
                >
                  <Text
                    style={[
                      styles.languageOptionText,
                      { color: isActive ? colors.accentFgOn : colors.subtext },
                    ]}
                  >
                    {copy.settingsPage.themeOptions[option.value]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 12 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <MaterialCommunityIcons name="store-edit-outline" size={22} color={colors.accent} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.languageLabel, { color: colors.subtext }]}>{settingsBarbershopCopy.title}</Text>
              <Text style={{ color: colors.subtext, fontSize: 13, fontWeight: "600" }}>
                {settingsBarbershopCopy.description}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => handleNavigate("barbershopSettings")}
            style={[
              styles.smallBtn,
              {
                alignSelf: "flex-start",
                borderColor: colors.accent,
                backgroundColor: colors.accent,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={settingsBarbershopCopy.ctaAccessibility}
          >
            <Text style={{ color: colors.accentFgOn, fontWeight: "900" }}>{settingsBarbershopCopy.cta}</Text>
          </Pressable>
        </View>

        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 12 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <MaterialCommunityIcons name="content-cut" size={22} color={colors.accent} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.languageLabel, { color: colors.subtext }]}>{settingsServicesCopy.title}</Text>
              <Text style={{ color: colors.subtext, fontSize: 13, fontWeight: "600" }}>
                {settingsServicesCopy.description}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => handleNavigate("services")}
            style={[
              styles.smallBtn,
              {
                alignSelf: "flex-start",
                borderColor: colors.accent,
                backgroundColor: colors.accent,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={settingsServicesCopy.ctaAccessibility}
          >
            <Text style={{ color: colors.accentFgOn, fontWeight: "900" }}>{settingsServicesCopy.cta}</Text>
          </Pressable>
        </View>

        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 12 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <MaterialCommunityIcons name="package-variant-closed" size={22} color={colors.accent} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.languageLabel, { color: colors.subtext }]}>{settingsPackagesCopy.title}</Text>
              <Text style={{ color: colors.subtext, fontSize: 13, fontWeight: "600" }}>
                {settingsPackagesCopy.description}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => handleNavigate("packages")}
            style={[
              styles.smallBtn,
              {
                alignSelf: "flex-start",
                borderColor: colors.accent,
                backgroundColor: colors.accent,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={settingsPackagesCopy.ctaAccessibility}
          >
            <Text style={{ color: colors.accentFgOn, fontWeight: "900" }}>{settingsPackagesCopy.cta}</Text>
          </Pressable>
        </View>

        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 12 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <MaterialCommunityIcons name="account-group-outline" size={22} color={colors.accent} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.languageLabel, { color: colors.subtext }]}>{settingsTeamCopy.title}</Text>
              <Text style={{ color: colors.subtext, fontSize: 13, fontWeight: "600" }}>
                {settingsTeamCopy.description}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => handleNavigate("team")}
            style={[
              styles.smallBtn,
              {
                alignSelf: "flex-start",
                borderColor: colors.accent,
                backgroundColor: colors.accent,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={settingsTeamCopy.ctaAccessibility}
          >
            <Text style={{ color: colors.accentFgOn, fontWeight: "900" }}>{settingsTeamCopy.cta}</Text>
          </Pressable>
        </View>

      </ScrollView>
    ) : (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: isCompactLayout ? 16 : 20, gap: 16 }}
        refreshControl={<RefreshControl refreshing={weekLoading} onRefresh={loadWeek} />}
      >
        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 12 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <MaterialCommunityIcons name="view-dashboard-outline" size={22} color={colors.accent} />
            <Text style={[styles.title, { color: colors.text }]}>{copy.weekTitle}</Text>
          </View>
          <Text style={{ color: colors.subtext, fontSize: 13, fontWeight: "600" }}>
            {copy.overviewSubtitle(weekRangeLabel)}
          </Text>
        </View>

        <View style={[styles.statsGrid, isCompactLayout && styles.statsGridCompact]}>
          {statCards.map((card) => {
            const progressWidth =
              typeof card.progress === "number"
                ? `${Math.max(8, Math.round(card.progress * 100))}%`
                : "0%";
            return (
              <View
                key={card.key}
                style={[
                  styles.statCard,
                  isCompactLayout && styles.statCardCompact,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                ]}
              >
                <View style={styles.statCardHeader}>
                  <View
                    style={[
                      styles.statIconBubble,
                      isCompactLayout && styles.statIconBubbleCompact,
                      { backgroundColor: applyAlpha(colors.accent, 0.14) },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={card.icon}
                      size={isCompactLayout ? 16 : 18}
                      color={colors.accent}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.statLabel,
                        isCompactLayout && styles.statLabelCompact,
                        { color: colors.subtext },
                      ]}
                    >
                      {card.label}
                    </Text>
                    <Text
                      style={[
                        styles.statDetail,
                        isCompactLayout && styles.statDetailCompact,
                        { color: colors.subtext },
                      ]}
                    >
                      {card.detail}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.statValue,
                    isCompactLayout && styles.statValueCompact,
                    { color: colors.text },
                  ]}
                >
                  {card.value}
                </Text>
                {card.chip ? (
                  <View
                    style={[
                      styles.statChip,
                      { backgroundColor: applyAlpha(colors.accent, 0.12) },
                    ]}
                  >
                    <MaterialCommunityIcons name={card.chipIcon} size={14} color={colors.accent} />
                    <Text
                      style={{
                        color: colors.accent,
                        fontWeight: "700",
                        fontSize: isCompactLayout ? 11 : 12,
                      }}
                    >
                      {card.chip}
                    </Text>
                  </View>
                ) : null}
                {typeof card.progress === "number" ? (
                  <View
                    style={[
                      styles.statProgressTrack,
                      isCompactLayout && styles.statProgressTrackCompact,
                      { backgroundColor: applyAlpha(colors.accent, 0.12) },
                    ]}
                  >
                    <View
                      style={[
                        styles.statProgressFill,
                        { width: progressWidth, backgroundColor: colors.accent },
                      ]}
                    />
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 16 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <MaterialCommunityIcons name="chart-box-outline" size={22} color={colors.accent} />
            <Text style={[styles.title, { color: colors.text }]}>{copy.bookingsByDayTitle}</Text>
          </View>

          {weekSummary.total === 0 ? (
            <Text style={[styles.empty, { marginLeft: 2 }]}>{copy.charts.barsEmpty}</Text>
          ) : (
            <>
              {(() => {
                const topService = serviceBreakdown[0] ?? null;
                const totalCount = weekSummary.total;
                const additionalServices = serviceBreakdown.slice(1, 3);
                const shareFor = (count: number) => (totalCount ? Math.round((count / totalCount) * 100) : 0);
                const topShare = topService ? shareFor(topService.count) : 0;
                const accountedCount =
                  (topService?.count ?? 0) + additionalServices.reduce((sum, svc) => sum + svc.count, 0);
                const otherCount = Math.max(0, totalCount - accountedCount);
                const donutSize = isCompactLayout ? 140 : 156;
                const legendItems = topService
                  ? [
                      {
                        key: topService.id,
                        label: topService.name,
                        count: topService.count,
                        share: topShare,
                        color: colors.accent,
                      },
                      ...additionalServices.map((svc, index) => ({
                        key: svc.id,
                        label: svc.name,
                        count: svc.count,
                        share: shareFor(svc.count),
                        color: tintHexColor(colors.accent, 0.35 + index * 0.18),
                      })),
                    ]
                  : [];
                if (topService && otherCount > 0) {
                  legendItems.push({
                    key: "other",
                    label: copy.charts.pizzaOther,
                    count: otherCount,
                    share: shareFor(otherCount),
                    color: mixHexColor(colors.text, colors.bg, 0.55),
                  });
                }
                const donutSegments = legendItems.map((item) => ({ value: item.count, color: item.color }));
                const busiest = busiestDay;
                const quietest = quietestDay;
                return (
                  <View style={styles.insightsRow}>
                    <View
                      style={[
                        styles.insightSection,
                        { borderColor: colors.border, backgroundColor: colors.bg },
                      ]}
                    >
                      <View style={styles.insightSectionHeader}>
                        <MaterialCommunityIcons name="chart-pie" size={20} color={colors.accent} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.insightSectionTitle, { color: colors.text }]}>
                            {copy.charts.pizzaTitle}
                          </Text>
                          <Text style={[styles.insightSectionSubtitle, { color: colors.subtext }]}>
                            {topService
                              ? copy.charts.pizzaSubtitle(topService.name)
                              : copy.charts.pizzaEmpty}
                          </Text>
                        </View>
                      </View>
                      {topService ? (
                        <View
                          style={[
                            styles.pieChartBlock,
                            isCompactLayout && styles.pieChartBlockCompact,
                          ]}
                        >
                          <View
                            style={[
                              styles.pieChartWrapper,
                              { width: donutSize, height: donutSize },
                            ]}
                          >
                            <DonutChart
                              segments={donutSegments}
                              size={donutSize}
                              strokeWidth={isCompactLayout ? 16 : 18}
                              trackColor={applyAlpha(colors.accent, 0.18)}
                              backgroundColor={colors.bg}
                            />
                            <View
                              style={[
                                styles.pieChartCenter,
                                {
                                  backgroundColor: colors.surface,
                                  borderColor: colors.border,
                                  borderWidth: 1,
                                },
                              ]}
                            >
                              <Text style={[styles.pieChartValue, { color: colors.text }]}>{`${topShare}%`}</Text>
                              <Text style={[styles.pieChartLabel, { color: colors.subtext }]}>
                                {copy.charts.serviceCount(topService.count)}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.pieLegend}>
                            <Text style={[styles.pieLegendTitle, { color: colors.subtext }]}>
                              {copy.charts.pieLegendTitle}
                            </Text>
                            {legendItems.length ? (
                              legendItems.map((item) => (
                                <View key={item.key} style={styles.pieLegendItem}>
                                  <View
                                    style={[
                                      styles.pieLegendSwatch,
                                      { backgroundColor: item.color },
                                    ]}
                                  />
                                  <View style={{ flex: 1 }}>
                                    <Text
                                      style={[styles.pieLegendLabel, { color: colors.text }]}
                                      numberOfLines={1}
                                    >
                                      {item.label}
                                    </Text>
                                    <Text style={[styles.pieLegendMeta, { color: colors.subtext }]}>
                                      {`${copy.charts.serviceCount(item.count)} • ${item.share}%`}
                                    </Text>
                                  </View>
                                </View>
                              ))
                            ) : (
                              <Text style={[styles.empty, { marginTop: 4 }]}>
                                {copy.charts.pieLegendEmpty}
                              </Text>
                            )}
                          </View>
                        </View>
                      ) : (
                        <Text style={[styles.empty, { marginTop: 4 }]}>{copy.charts.pizzaEmpty}</Text>
                      )}
                    </View>

                    <View
                      style={[
                        styles.insightSection,
                        { borderColor: colors.border, backgroundColor: colors.bg },
                      ]}
                    >
                      <View style={styles.insightSectionHeader}>
                        <MaterialCommunityIcons name="calendar-star" size={20} color={colors.accent} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.insightSectionTitle, { color: colors.text }]}>
                            {copy.charts.highlightsTitle}
                          </Text>
                          <Text style={[styles.insightSectionSubtitle, { color: colors.subtext }]}>
                            {copy.charts.highlightsSubtitle}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.highlightGroup}>
                        <View style={[styles.highlightPill, { backgroundColor: colors.accent }]}>
                          <MaterialCommunityIcons name="trending-up" size={18} color={colors.accentFgOn} />
                          <Text style={{ color: colors.accentFgOn, fontWeight: "700" }}>
                            {busiest
                              ? copy.charts.busiestDay(busiest.label, busiest.count)
                              : copy.charts.barsEmpty}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.highlightPill,
                            { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
                          ]}
                        >
                          <MaterialCommunityIcons name="trending-down" size={18} color={colors.subtext} />
                          <Text style={{ color: colors.subtext, fontWeight: "700" }}>
                            {quietest
                              ? copy.charts.quietestDay(quietest.label, quietest.count)
                              : copy.charts.barsEmpty}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })()}

              <View
                style={[
                  styles.chartCard,
                  { borderColor: colors.border, backgroundColor: colors.bg },
                ]}
              >
                <View style={styles.insightSectionHeader}>
                  <MaterialCommunityIcons name="chart-bar" size={20} color={colors.accent} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.insightSectionTitle, { color: colors.text }]}>
                      {copy.charts.barsTitle}
                    </Text>
                    <Text style={[styles.insightSectionSubtitle, { color: colors.subtext }]}>
                      {copy.charts.barsSubtitle}
                    </Text>
                  </View>
                </View>
                <View style={styles.barChart}>
                  {(() => {
                    const maxDayCount = dayTotals.reduce(
                      (max, day) => (day.count > max ? day.count : max),
                      0,
                    );
                    if (maxDayCount === 0) {
                      return (
                        <Text style={[styles.empty, { marginTop: 4 }]}>{copy.charts.barsEmpty}</Text>
                      );
                    }
                    return dayTotals.map((day) => {
                      const height = Math.max(6, (day.count / maxDayCount) * 110);
                      return (
                        <View key={day.key} style={styles.barColumn}>
                          <Text style={[styles.barValue, { color: colors.text }]}>{day.count}</Text>
                          <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                            <View
                              style={[
                                styles.barFill,
                                {
                                  height,
                                  backgroundColor: colors.accent,
                                },
                              ]}
                            />
                          </View>
                          <Text style={[styles.barLabel, { color: colors.subtext }]}>{day.shortLabel}</Text>
                        </View>
                      );
                    });
                  })()}
                </View>
              </View>

              <View
                style={[
                  styles.chartCard,
                  { borderColor: colors.border, backgroundColor: colors.bg },
                ]}
              >
                <View style={styles.insightSectionHeader}>
                  <MaterialCommunityIcons name="account-tie" size={20} color={colors.accent} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.insightSectionTitle, { color: colors.text }]}>
                      {copy.charts.barberTitle}
                    </Text>
                    <Text style={[styles.insightSectionSubtitle, { color: colors.subtext }]}>
                      {copy.charts.barberSubtitle}
                    </Text>
                  </View>
                </View>
                {barberBreakdown.length === 0 ? (
                  <Text style={[styles.empty, { marginTop: 4 }]}>{copy.noBookings}</Text>
                ) : (
                  <View style={styles.leaderboard}>
                    {(() => {
                      const maxCount = barberBreakdown[0]?.count ?? 0;
                      return barberBreakdown.slice(0, 5).map((entry) => {
                        const widthPercent = maxCount
                          ? Math.min(100, Math.max(8, (entry.count / maxCount) * 100))
                          : 0;
                        return (
                          <View key={entry.id} style={styles.leaderboardRow}>
                            <View style={styles.leaderboardInfo}>
                              <MaterialCommunityIcons
                                name="account-outline"
                                size={18}
                                color={colors.accent}
                              />
                              <Text style={{ color: colors.text, fontWeight: "700" }}>{entry.name}</Text>
                            </View>
                            <Text style={{ color: colors.subtext, fontWeight: "700" }}>
                              {copy.charts.serviceCount(entry.count)}
                            </Text>
                            <View style={[styles.leaderboardBarTrack, { backgroundColor: colors.border }]}>
                              <View
                                style={[
                                  styles.leaderboardBarFill,
                                  {
                                    width: `${widthPercent}%`,
                                    backgroundColor: colors.accent,
                                  },
                                ]}
                              />
                            </View>
                          </View>
                        );
                      });
                    })()}
                  </View>
                )}
              </View>

              <View
                style={[
                  styles.chartCard,
                  { borderColor: colors.border, backgroundColor: colors.bg },
                ]}
              >
                <View style={styles.insightSectionHeader}>
                  <MaterialCommunityIcons name="basket-outline" size={20} color={colors.accent} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.insightSectionTitle, { color: colors.text }]}>
                      {copy.charts.productsTitle}
                    </Text>
                    <Text style={[styles.insightSectionSubtitle, { color: colors.subtext }]}>
                      {copy.charts.productsSubtitle}
                    </Text>
                  </View>
                </View>
                {(() => {
                  const entries = productSalesBreakdown.slice(0, 5);
                  const hasSales = entries.some((entry) => entry.sold > 0);
                  if (!hasSales) {
                    return (
                      <Text style={[styles.empty, { marginTop: 4 }]}>{copy.charts.productsEmpty}</Text>
                    );
                  }
                  const maxSold = entries.reduce(
                    (max, entry) => (entry.sold > max ? entry.sold : max),
                    0,
                  );
                  return (
                    <View style={styles.barChart}>
                      {entries.map((entry) => {
                        const height = maxSold ? Math.max(6, (entry.sold / maxSold) * 110) : 6;
                        return (
                          <View key={entry.id} style={styles.barColumn}>
                            <Text style={[styles.productBarUnits, { color: colors.text }]}>
                              {copy.charts.productUnits(entry.sold)}
                            </Text>
                            <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                              <View
                                style={[
                                  styles.barFill,
                                  {
                                    height,
                                    backgroundColor: colors.accent,
                                  },
                                ]}
                              />
                            </View>
                            <Text style={[styles.productBarPrice, { color: colors.subtext }]}>
                              {copy.charts.productPriceLabel(formatPrice(entry.price_cents))}
                            </Text>
                            <Text
                              style={[styles.productBarName, { color: colors.text }]}
                              numberOfLines={2}
                            >
                              {entry.name}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  );
                })()}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    )}
      </View>
    </View>
  );
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diff);
  return d;
}

function formatRangeDate(date: Date, locale: string) {
  return date.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

function formatWeekday(date: Date, locale: string) {
  return date.toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric" });
}

/** ======== Modal de Cliente (lista + criar) ======== */
function ClientModal({
  visible,
  onClose,
  customers,
  loading,
  onRefreshQuery,
  onPick,
  onSaved,
  copy,
  colors,
  styles,
}: {
  visible: boolean;
  onClose: () => void;
  customers: Customer[];
  loading: boolean;
  onRefreshQuery: (q: string) => void;
  onPick: (c: Customer) => void;
  onSaved: (c: Customer) => void;
  copy: (typeof LANGUAGE_COPY)[SupportedLanguage]["bookService"]["clientModal"];
  colors: ThemeColors;
  styles: AuthenticatedAppStyles;
}) {
  const [tab, setTab] = useState<"list" | "create">("list");
  const [query, setQuery] = useState("");

  useEffect(() => { if (visible) { setTab("list"); setQuery(""); } }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.sidebarBg, borderColor: colors.border }]}>
          <View style={styles.sheetHeader}>
            <Text style={{ color: colors.text, fontWeight: "900", fontSize: 16 }}>{copy.title}</Text>
            <Pressable onPress={onClose}><Ionicons name="close" size={22} color={colors.subtext} /></Pressable>
          </View>

          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Tabs */}
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable onPress={() => setTab("list")}
                style={[styles.tab, tab === "list" && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
                <Text style={[styles.tabText, tab === "list" && { color: colors.accentFgOn }]}>{copy.tabs.list}</Text>
              </Pressable>
              <Pressable onPress={() => setTab("create")}
                style={[styles.tab, tab === "create" && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
                <Text style={[styles.tabText, tab === "create" && { color: colors.accentFgOn }]}>{copy.tabs.create}</Text>
              </Pressable>
            </View>

            {tab === "list" ? (
              <View style={{ gap: 10 }}>
                {Platform.OS === "web" && (
                  <input
                    placeholder={copy.searchPlaceholder}
                    value={query}
                    onChange={(e: any) => setQuery(String(e.target.value))}
                    onKeyDown={(e: any) => { if (e.key === "Enter") onRefreshQuery(query); }}
                    style={{
                      padding: 10,
                      borderRadius: 10,
                      width: "100%",
                      border: `1px solid ${colors.border}`,
                      background: colors.surface,
                      color: colors.text,
                      fontWeight: 700,
                      fontSize: 16,
                    }}
                  />
                )}
                <Pressable onPress={() => onRefreshQuery(query)} style={[styles.smallBtn, { alignSelf: "flex-start", borderColor: colors.border }]}>
                  <Text style={{ color: colors.subtext, fontWeight: "800" }}>{copy.searchButton}</Text>
                </Pressable>

                <View style={[styles.card, { gap: 6 }]}>
                  {loading ? <ActivityIndicator /> : customers.length === 0 ? (
                    <Text style={{ color: colors.subtext }}>{copy.empty}</Text>
                  ) : (
                    customers.map(c => (
                      <Pressable key={c.id} onPress={() => onPick(c)} style={styles.listRow}>
                        <MaterialCommunityIcons name="account" size={18} color={colors.accent} />
                        <Text style={{ color: colors.text, fontWeight: "800" }}>
                          {c.first_name} {c.last_name}
                        </Text>
                        {c.email ? <Text style={{ color: colors.subtext, marginLeft: 6, fontSize: 12 }}>{c.email}</Text> : null}
                      </Pressable>
                    ))
                  )}
                </View>
              </View>
            ) : (
              <View style={{ marginTop: 4 }}>
                <UserForm
                  onSaved={(row) => {
                    onSaved({
                      id: row.id,
                      first_name: row.first_name,
                      last_name: row.last_name,
                      phone: row.phone,
                      email: row.email,
                      date_of_birth: row.date_of_birth,
                    });
                    onClose();
                  }}
                  onCancel={() => setTab("list")}
                  colors={{
                    text: colors.text,
                    subtext: colors.subtext,
                    border: colors.border,
                    surface: colors.surface,
                    accent: colors.accent,
                    accentFgOn: colors.accentFgOn,
                    danger: colors.danger,
                  }}
                  copy={copy.userForm}
                />
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}


export default AuthenticatedApp;
