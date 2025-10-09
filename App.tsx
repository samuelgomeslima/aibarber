import React, { useEffect, useMemo, useState, useCallback } from "react";
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
  useColorScheme,
  Linking,
} from "react-native";
import Svg, { Circle, G } from "react-native-svg";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import * as Localization from "expo-localization";

import {
  BARBERS,
  BARBER_MAP,
  type Service,
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
} from "./src/lib/domain";
import { polyglotServices } from "./src/lib/polyglot";
import { COMPONENT_COPY } from "./src/locales/componentCopy";
import type { RecurrenceFrequency } from "./src/locales/types";

const getTodayDateKey = () => toDateKey(new Date());

const getCurrentTimeString = () => {
  const now = new Date();
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

const applyAlpha = (hexColor: string, alpha: number) => {
  const normalized = hexColor.replace("#", "");
  if (normalized.length !== 6) {
    return hexColor;
  }
  const clampAlpha = Math.max(0, Math.min(alpha, 1));
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${clampAlpha})`;
};

const mixHexColor = (base: string, mix: string, amount: number) => {
  const normalize = (value: string) => {
    const hex = value.replace("#", "");
    if (hex.length === 3) {
      return hex
        .split("")
        .map((char) => char + char)
        .join("");
    }
    return hex;
  };

  const toRgb = (value: string): [number, number, number] | null => {
    const hex = normalize(value);
    if (hex.length !== 6) {
      return null;
    }
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if ([r, g, b].some((channel) => Number.isNaN(channel))) {
      return null;
    }
    return [r, g, b];
  };

  const toHex = (value: number) => value.toString(16).padStart(2, "0");

  const baseRgb = toRgb(base);
  const mixRgb = toRgb(mix);
  if (!baseRgb || !mixRgb) {
    return base;
  }

  const clamp = Math.max(0, Math.min(amount, 1));
  const [r1, g1, b1] = baseRgb;
  const [r2, g2, b2] = mixRgb;
  const r = Math.round(r1 + (r2 - r1) * clamp);
  const g = Math.round(g1 + (g2 - g1) * clamp);
  const b = Math.round(b1 + (b2 - b1) * clamp);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const tintHexColor = (color: string, amount: number, mixColor = "#ffffff") =>
  mixHexColor(color, mixColor, amount);

const SLOT_MINUTES = 15;
const WHATSAPP_BRAND_COLOR = "#25D366";
const MORNING_END_MINUTES = 12 * 60;
const AFTERNOON_END_MINUTES = 17 * 60;
type SlotPeriod = "morning" | "afternoon" | "evening";
const BOOKING_LIMIT_OPTIONS = [200, 500, 1000] as const;
type BookingLimitOption = (typeof BOOKING_LIMIT_OPTIONS)[number];

const normalizeTimeInput = (input?: string | null): string | null => {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(":");
  if (parts.length > 2) return null;
  const hours = Number(parts[0]);
  const minutes = Number(parts[1] ?? "0");
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return `${pad(hours)}:${pad(minutes)}`;
};

const buildDateTime = (
  dateInput?: string | null,
  timeInput?: string | null,
  fallbackTime = "00:00",
): Date | null => {
  const trimmedDate = dateInput?.trim();
  if (!trimmedDate) return null;
  const normalizedTime = normalizeTimeInput(timeInput) ?? normalizeTimeInput(fallbackTime) ?? "00:00";
  const iso = `${trimmedDate}T${normalizedTime}:00`;
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return null;
  return value;
};
import {
  getBookings,
  getBookingsForRange,
  getBookingsForDates,
  createBooking,
  createBookingsBulk,
  cancelBooking,
  listCustomers,
  listRecentBookings,
  type BookingWithCustomer,
  type Customer,
} from "./src/lib/bookings";
import { deleteService, listServices } from "./src/lib/services";
import { listProducts, deleteProduct, sellProduct, restockProduct } from "./src/lib/products";
import { listStaffMembers, type StaffMember, type StaffRole } from "./src/lib/users";

/* Components (mantidos) */
import DateSelector from "./src/components/DateSelector";
import RecurrenceModal from "./src/components/RecurrenceModal"; // recebe fixedDate/fixedTime/fixedService/fixedBarber
import OccurrencePreviewModal, { PreviewItem } from "./src/components/OccurrencePreviewModal";
import BarberSelector, { Barber } from "./src/components/BarberSelector";
import AssistantChat from "./src/components/AssistantChat";
import ImageAssistant from "./src/components/ImageAssistant";
import ServiceForm from "./src/components/ServiceForm";
import ProductForm from "./src/components/ProductForm";
import FilterToggle from "./src/components/FilterToggle";
import DateTimeInput from "./src/components/DateTimeInput";

/* Novo: formulário de usuário (com date_of_birth e salvando no Supabase) */
import UserForm from "./src/components/UserForm";

type DonutChartSegment = {
  value: number;
  color: string;
};

type DonutChartProps = {
  segments: DonutChartSegment[];
  size?: number;
  strokeWidth?: number;
  trackColor: string;
  backgroundColor: string;
};

const DONUT_STYLES = StyleSheet.create({
  container: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});

const DonutChart = ({
  segments,
  size = 160,
  strokeWidth = 18,
  trackColor,
  backgroundColor,
}: DonutChartProps) => {
  const normalizedSegments = segments
    .map((segment) => ({
      value: Math.max(0, segment.value),
      color: segment.color,
    }))
    .filter((segment) => segment.value > 0);

  const totalValue = normalizedSegments.reduce((total, segment) => total + segment.value, 0);
  const radius = Math.max((size - strokeWidth) / 2, 0);
  const circumference = 2 * Math.PI * radius;
  const arcs: React.ReactNode[] = [];

  if (totalValue > 0 && circumference > 0) {
    let currentOffset = 0;
    normalizedSegments.forEach((segment, index) => {
      const segmentLength = (segment.value / totalValue) * circumference;
      const isFullCircle = segmentLength >= circumference - 0.5;
      const dashArray = isFullCircle ? undefined : `${Math.max(segmentLength, 0.5)} ${circumference}`;
      arcs.push(
        <Circle
          key={`${segment.color}-${index}`}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={segment.color}
          strokeWidth={strokeWidth}
          strokeDasharray={dashArray}
          strokeDashoffset={isFullCircle ? 0 : currentOffset}
          strokeLinecap="round"
          fill="transparent"
        />,
      );
      currentOffset -= segmentLength;
    });
  }

  return (
    <View
      style={[
        DONUT_STYLES.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
        },
      ]}
    >
      <Svg width={size} height={size}>
        <G rotation={-90} originX={size / 2} originY={size / 2}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {arcs}
        </G>
      </Svg>
    </View>
  );
};

const LANGUAGE_COPY = {
  en: {
    languageLabel: "Language",
    switchLanguage: "Switch language to",
    navigation: {
      overview: "Overview",
      bookings: "Bookings",
      services: "Services",
      products: "Products",
      assistant: "Assistant",
      imageAssistant: "Image lab",
      team: "Team members",
      settings: "Settings",
    },
    settingsPage: {
      title: "Settings",
      subtitle: "Manage your preferences for the AIBarber dashboard.",
      themeLabel: "Appearance",
      themeDescription: "Choose how the dashboard adapts its colors.",
      themeOptions: {
        system: "System",
        light: "Light",
        dark: "Dark",
      },
    },
    teamPage: {
      title: "Team members",
      subtitle: "Register administrators, managers, and professionals who can access the workspace.",
      refresh: "Refresh list",
      listTitle: "Current team",
      empty: "No team members registered yet.",
      alerts: {
        loadTitle: "Team members",
      },
      roles: [
        {
          value: "administrator",
          label: "Administrator",
          description: "Full access to schedules, inventory, and settings.",
        },
        {
          value: "manager",
          label: "Manager",
          description: "Manages appointments, services, and daily operations.",
        },
        {
          value: "professional",
          label: "Professional",
          description: "Sees their agenda and updates booking status.",
        },
        {
          value: "assistant",
          label: "Assistant",
          description: "Helps with bookings and customer records.",
        },
      ],
      userForm: {
        ...COMPONENT_COPY.en.userForm,
        title: "Register team member",
        buttons: {
          ...COMPONENT_COPY.en.userForm.buttons,
          submit: "Save team member",
          submitAccessibility: "Save team member",
        },
        alerts: {
          ...COMPONENT_COPY.en.userForm.alerts,
          savedTitle: "Team member saved",
          failedFallback: "Unable to save the team member.",
        },
      },
    },
    servicesPage: {
      title: "Services",
      subtitle: "Manage what clients can book and adjust existing options as needed.",
      createCta: { label: "Create service", accessibility: "Open create service form" },
      listTitle: "Existing services",
      empty: "— none registered yet —",
      serviceMeta: (minutes: number, price: string) => `${minutes} minutes • ${price}`,
      actions: {
        edit: { label: "Edit", accessibility: (name: string) => `Edit ${name}` },
        delete: { label: "Delete", accessibility: (name: string) => `Delete ${name}` },
      },
      alerts: {
        loadTitle: "Services",
        deleteTitle: "Delete service",
        deleteMessage: (name: string) => `Are you sure you want to remove "${name}"?`,
        cancel: "Cancel",
        confirm: "Delete",
        deleteErrorTitle: "Delete service",
      },
    },
    productsPage: {
      title: "Products",
      subtitle: "Register the items you sell and keep inventory in sync with sales.",
      createCta: { label: "Register product", accessibility: "Open create product form" },
      listTitle: "Inventory",
      empty: "— no products registered yet —",
      productMeta: (price: string, stock: number) => `${price} • ${stock} in stock`,
      descriptionLabel: "Description",
      actions: {
        edit: { label: "Edit", accessibility: (name: string) => `Edit ${name}` },
        delete: { label: "Delete", accessibility: (name: string) => `Delete ${name}` },
        sell: { label: "Sell", accessibility: (name: string) => `Register a sale for ${name}` },
        restock: { label: "Restock", accessibility: (name: string) => `Restock ${name}` },
      },
      alerts: {
        loadTitle: "Products",
        deleteTitle: "Delete product",
        deleteMessage: (name: string) => `Remove "${name}" from inventory?`,
        cancel: "Cancel",
        confirm: "Delete",
        deleteErrorTitle: "Delete product",
        sellErrorTitle: "Sell product",
        restockErrorTitle: "Restock product",
      },
      stockModal: {
        sellTitle: (name: string) => `Sell ${name}`,
        sellSubtitle: (stock: number) => `Register a sale and reduce the ${stock} items available.`,
        restockTitle: (name: string) => `Restock ${name}`,
        restockSubtitle: "Add items back to inventory.",
        quantityLabel: "Quantity",
        quantityPlaceholder: "1",
        quantityError: "Enter a quantity greater than zero",
        confirmSell: "Confirm sale",
        confirmRestock: "Add stock",
        cancel: "Cancel",
        sellSuccessTitle: "Sale registered",
        sellSuccessMessage: (name: string, quantity: number) => `Sold ${quantity} unit(s) of ${name}.`,
        restockSuccessTitle: "Stock updated",
        restockSuccessMessage: (name: string, quantity: number) => `Added ${quantity} unit(s) to ${name}.`,
      },
    },
    serviceForm: COMPONENT_COPY.en.serviceForm,
    productForm: COMPONENT_COPY.en.productForm,
    assistant: {
      chat: COMPONENT_COPY.en.assistantChat,
      contextSummary: {
        hours: (start: string, end: string) => `Hours: ${start}–${end}`,
        services: (list: string) => `Services: ${list}`,
        serviceDetail: (name: string, minutes: number) => `${name} (${minutes} min)`,
        barbers: (list: string) => `Barbers: ${list}`,
        bookingsScheduled: (count: number) => `Bookings: ${count} scheduled.`,
        bookingsEmpty: "Bookings: none scheduled yet.",
      },
      systemPrompt: {
        intro: "You are AIBarber, an assistant that helps manage a barbershop booking agenda.",
        hours: (start: string, end: string) => `Opening hours: ${start} to ${end}.`,
        servicesHeader: "Services:",
        serviceLine: (name: string, minutes: number, price: string) =>
          `• ${name} (${minutes} minutes • ${price})`,
        barbersHeader: "Barbers:",
        barberLine: (name: string) => `• ${name}`,
        bookingsHeader: "Existing bookings:",
        bookingsEmpty: "(No bookings are currently scheduled.)",
        bookingLine: ({
          date,
          start,
          end,
          serviceName,
          barberName,
          customerName,
        }: {
          date: string;
          start?: string | null;
          end?: string | null;
          serviceName: string;
          barberName: string;
          customerName?: string | null;
        }) => {
          const timeRange = [start, end].filter(Boolean).join("–");
          const timeSegment = timeRange ? ` ${timeRange}` : "";
          const clientSegment = customerName ? ` for ${customerName}` : "";
          return `${date}${timeSegment} • ${serviceName} • ${barberName}${clientSegment}`;
        },
        instructions: [
          "You can use tools to check availability, create bookings, and cancel bookings.",
          "Always collect the customer's first name, last name, and phone number digits before booking.",
          "Use find_customer to check registration with the provided phone number and create_customer if no record exists.",
          "Include the returned customer_id whenever you call book_service so the booking is linked to the customer.",
          "When the user asks to schedule, gather the service, barber, date, and preferred time before making suggestions.",
          "Call get_availability before committing to a new booking, and explain any conflicts you find.",
          "After performing a booking or cancellation, confirm the action and summarize the result for the user.",
        ],
      },
    },
    imageAssistant: COMPONENT_COPY.en.imageAssistant,
    userForm: COMPONENT_COPY.en.userForm,
    recurrenceModal: COMPONENT_COPY.en.recurrenceModal,
    occurrencePreview: COMPONENT_COPY.en.occurrencePreview,
    weekTitle: "This week",
    overviewSubtitle: (range?: string | null) =>
      `Overview of bookings scheduled for ${range?.trim() ? range : "the current week"}.`,
    stats: {
      bookingsLabel: "Bookings",
      averagePerDay: (avg: string) => `Avg. ${avg} per day`,
      serviceHoursLabel: "Service hours",
      serviceHoursDetail: "Hours booked",
      revenueLabel: "Revenue",
      revenueDetail: "Based on service prices",
      busiestBarberLabel: "Busiest barber",
      busiestDetail: (count: number) => `${count} booking${count === 1 ? "" : "s"}`,
      avgDuration: (minutes: string) => `${minutes} min avg duration`,
      utilization: (percentage: string) => `${percentage}% capacity used`,
      avgTicket: (value: string) => `Avg. ticket ${value}`,
      topShare: (percentage: string) => `${percentage}% of bookings`,
      noBarberData: "No barber data",
    },
    bookingsByDayTitle: "Booking insights",
    charts: {
      pizzaTitle: "Service spotlight",
      pizzaSubtitle: (service: string) => `Weekly share for ${service}`,
      pizzaEmpty: "No services booked this week.",
      pizzaStat: (percentage: string) => `${percentage}% of weekly bookings`,
      pizzaOther: "Other services",
      pieLegendTitle: "Share of weekly bookings",
      pieLegendEmpty: "No service mix available.",
      barsTitle: "Bookings per day",
      barsSubtitle: "Daily volume for the selected week.",
      barsEmpty: "No bookings recorded for this range.",
      highlightsTitle: "Peaks & lulls",
      highlightsSubtitle: "Busiest and quietest days this week.",
      barberTitle: "Barber leaderboard",
      barberSubtitle: "Ranking by weekly appointments.",
      productsTitle: "Products sold",
      productsSubtitle: "Unit sales compared to item price.",
      productsEmpty: "No product sales recorded yet.",
      productPriceLabel: (price: string) => `Unit price ${price}`,
      productUnits: (count: number) => `${count} sold`,
      busiestDay: (label: string, count: number) => `Busiest: ${label} (${count})`,
      quietestDay: (label: string, count: number) => `Quietest: ${label} (${count})`,
      serviceCount: (count: number) => `${count} booking${count === 1 ? "" : "s"}`,
    },
    dayBookingCount: (count: number) => `${count} booking${count === 1 ? "" : "s"}`,
    noBookings: "No bookings",
    bookings: {
      title: "Bookings",
      subtitle: "Review recent bookings and refine the list using the filters below.",
      ctaLabel: "Book service",
      ctaAccessibility: "Open booking screen",
      filters: {
        barber: "Barber",
        service: "Service",
        client: "Client",
        clientPlaceholder: "Search by client name",
        sort: "Order",
        sortNewest: "Newest first",
        sortOldest: "Oldest first",
        limit: "Records",
        limitOption: (limit: number) => `${limit}`,
        startDate: "Start date (YYYY-MM-DD)",
        startDatePlaceholder: "2025-01-30",
        startTime: "Start time (HH:MM)",
        startTimePlaceholder: "09:00",
        endDate: "End date (YYYY-MM-DD)",
        endDatePlaceholder: "2025-02-02",
        endTime: "End time (HH:MM)",
        endTimePlaceholder: "18:00",
        clear: "Clear filters",
        all: "All",
        toggleShow: "Show filters",
        toggleHide: "Hide filters",
        pickerConfirm: "Apply",
        pickerCancel: "Cancel",
      },
      results: {
        title: "Results",
        count: (current: number, total: number) => `${current} of ${total}`,
        limitNotice: (visible: number, requested: number) =>
          `Showing ${visible} booking${visible === 1 ? "" : "s"} (limit ${requested}).`,
        sectionCount: (count: number) => `${count} booking${count === 1 ? "" : "s"}`,
        empty: "No bookings match your filters.",
        walkIn: "Walk-in",
        whatsappCta: "Send WhatsApp reminder",
        whatsappAccessibility: (client: string) => `Send WhatsApp reminder to ${client}`,
        whatsappErrorTitle: "WhatsApp reminder",
        whatsappErrorMessage: "Unable to open WhatsApp. Please try again.",
        whatsappMessage: ({
          clientName,
          serviceName,
          date,
          time,
        }: {
          clientName: string;
          serviceName: string;
          date: string;
          time: string;
        }) =>
          `Hi ${clientName}, this is a reminder of your appointment for ${serviceName} on ${date} at ${time}.`,
      },
      alerts: {
        loadTitle: "Bookings list",
      },
    },
    bookService: {
      serviceSection: {
        title: "Service",
        empty: "Create your first service below.",
      },
      clientSection: {
        title: "Client",
        noneSelected: "No client selected",
        change: "Change",
        select: "Select",
      },
      barberSectionTitle: "Choose the barber",
      dateSectionTitle: "Pick a day",
      slots: {
        title: (date: string) => `Available slots · ${date}`,
        busyTitle: "Already booked",
        busyMessage: (service: string, barber: string, start: string, end: string) =>
          `${service} with ${barber} • ${start}–${end}`,
        busyFallback: "This time is not available.",
        periods: {
          morning: "Morning",
          afternoon: "Afternoon",
          evening: "Evening",
        },
        empty: "Create a service to see availability.",
      },
      alerts: {
        selectSlot: {
          title: "Select a time",
          message: "Choose an available slot first.",
        },
        selectClient: {
          title: "Select client",
          message: "Choose or create a client first.",
        },
        selectService: {
          title: "Select service",
          message: "Create or choose a service first.",
        },
        bookingSuccessTitle: "Booked!",
        bookingFailureTitle: "Booking failed",
        cancelFailureTitle: "Cancel failed",
        customerErrorTitle: "Customers",
        recurrence: {
          noPreviewTitle: "Nothing to preview",
          noPreviewMessage: "Check the start date, time, and occurrence count.",
          previewFailureTitle: "Preview failed",
          noCreateTitle: "Nothing to create",
          noCreateMessage: "All occurrences were skipped.",
          createSuccessTitle: "Created",
          createSuccessMessage: (count: number, barberName: string, skipped: number) =>
            `Added ${count} with ${barberName}${skipped ? ` • Skipped ${skipped}` : ""}`,
          createFailureTitle: "Create failed",
        },
      },
      actions: {
        book: { label: "Book service", accessibility: "Book service" },
        repeat: { label: "Repeat…", accessibility: "Open recurrence" },
      },
      bookingsList: {
        title: "Your bookings",
        empty: "— none yet —",
        cancel: "Cancel",
        tip: "Tip: select or create the client before the barber; conflicts depend on the barber.",
      },
      clientModal: {
        title: "Select client",
        tabs: { list: "Existing", create: "Create" },
        searchPlaceholder: "Search name / email / phone",
        searchButton: "Search",
        empty: "No results.",
      },
    },
  },
  pt: {
    languageLabel: "Idioma",
    switchLanguage: "Alterar idioma para",
    navigation: {
      overview: "Visão geral",
      bookings: "Agendamentos",
      services: "Serviços",
      products: "Produtos",
      assistant: "Assistente",
      imageAssistant: "Laboratório de imagens",
      team: "Equipe",
      settings: "Configurações",
    },
    settingsPage: {
      title: "Configurações",
      subtitle: "Gerencie suas preferências no painel do AIBarber.",
      themeLabel: "Aparência",
      themeDescription: "Escolha como o painel adapta as cores.",
      themeOptions: {
        system: "Sistema",
        light: "Claro",
        dark: "Escuro",
      },
    },
    teamPage: {
      title: "Equipe",
      subtitle: "Cadastre administradores, gerentes e profissionais com acesso ao sistema.",
      refresh: "Atualizar lista",
      listTitle: "Equipe atual",
      empty: "Nenhum membro cadastrado ainda.",
      alerts: {
        loadTitle: "Equipe",
      },
      roles: [
        {
          value: "administrator",
          label: "Administrador",
          description: "Acesso total à agenda, estoque e configurações.",
        },
        {
          value: "manager",
          label: "Gerente",
          description: "Gerencia agendamentos, serviços e operações diárias.",
        },
        {
          value: "professional",
          label: "Profissional",
          description: "Visualiza sua agenda e atualiza o status dos atendimentos.",
        },
        {
          value: "assistant",
          label: "Assistente",
          description: "Auxilia nos agendamentos e cadastros de clientes.",
        },
      ],
      userForm: {
        ...COMPONENT_COPY.pt.userForm,
        title: "Cadastrar membro da equipe",
        buttons: {
          ...COMPONENT_COPY.pt.userForm.buttons,
          submit: "Salvar membro",
          submitAccessibility: "Salvar membro da equipe",
        },
        alerts: {
          ...COMPONENT_COPY.pt.userForm.alerts,
          savedTitle: "Membro salvo",
          failedFallback: "Não foi possível salvar o membro da equipe.",
        },
      },
    },
    servicesPage: {
      title: "Serviços",
      subtitle: "Gerencie o que os clientes podem agendar e ajuste as opções existentes conforme necessário.",
      createCta: { label: "Criar serviço", accessibility: "Abrir formulário de criação de serviço" },
      listTitle: "Serviços cadastrados",
      empty: "— nenhum cadastrado ainda —",
      serviceMeta: (minutes: number, price: string) => `${minutes} minutos • ${price}`,
      actions: {
        edit: { label: "Editar", accessibility: (name: string) => `Editar ${name}` },
        delete: { label: "Excluir", accessibility: (name: string) => `Excluir ${name}` },
      },
      alerts: {
        loadTitle: "Serviços",
        deleteTitle: "Excluir serviço",
        deleteMessage: (name: string) => `Tem certeza de que deseja remover "${name}"?`,
        cancel: "Cancelar",
        confirm: "Excluir",
        deleteErrorTitle: "Excluir serviço",
      },
    },
    productsPage: {
      title: "Produtos",
      subtitle: "Cadastre os itens de venda e mantenha o estoque atualizado.",
      createCta: { label: "Cadastrar produto", accessibility: "Abrir formulário de produto" },
      listTitle: "Estoque",
      empty: "— nenhum produto cadastrado —",
      productMeta: (price: string, stock: number) => `${price} • ${stock} em estoque`,
      descriptionLabel: "Descrição",
      actions: {
        edit: { label: "Editar", accessibility: (name: string) => `Editar ${name}` },
        delete: { label: "Excluir", accessibility: (name: string) => `Excluir ${name}` },
        sell: { label: "Vender", accessibility: (name: string) => `Registrar venda de ${name}` },
        restock: { label: "Repor", accessibility: (name: string) => `Repor estoque de ${name}` },
      },
      alerts: {
        loadTitle: "Produtos",
        deleteTitle: "Excluir produto",
        deleteMessage: (name: string) => `Remover "${name}" do estoque?`,
        cancel: "Cancelar",
        confirm: "Excluir",
        deleteErrorTitle: "Excluir produto",
        sellErrorTitle: "Registrar venda",
        restockErrorTitle: "Repor estoque",
      },
      stockModal: {
        sellTitle: (name: string) => `Vender ${name}`,
        sellSubtitle: (stock: number) => `Registre a venda e desconte das ${stock} unidades disponíveis.`,
        restockTitle: (name: string) => `Repor ${name}`,
        restockSubtitle: "Adicione unidades de volta ao estoque.",
        quantityLabel: "Quantidade",
        quantityPlaceholder: "1",
        quantityError: "Informe uma quantidade maior que zero",
        confirmSell: "Registrar venda",
        confirmRestock: "Adicionar estoque",
        cancel: "Cancelar",
        sellSuccessTitle: "Venda registrada",
        sellSuccessMessage: (name: string, quantity: number) =>
          `Foram vendidas ${quantity} unidade(s) de ${name}.`,
        restockSuccessTitle: "Estoque atualizado",
        restockSuccessMessage: (name: string, quantity: number) =>
          `Adicionadas ${quantity} unidade(s) em ${name}.`,
      },
    },
    serviceForm: COMPONENT_COPY.pt.serviceForm,
    productForm: COMPONENT_COPY.pt.productForm,
    assistant: {
      chat: COMPONENT_COPY.pt.assistantChat,
      contextSummary: {
        hours: (start: string, end: string) => `Horário: ${start}–${end}`,
        services: (list: string) => `Serviços: ${list}`,
        serviceDetail: (name: string, minutes: number) => `${name} (${minutes} min)`,
        barbers: (list: string) => `Barbeiros: ${list}`,
        bookingsScheduled: (count: number) => `Agendamentos: ${count} marcados.`,
        bookingsEmpty: "Agendamentos: nenhum marcado ainda.",
      },
      systemPrompt: {
        intro: "Você é o AIBarber, um assistente que ajuda a gerenciar a agenda de uma barbearia.",
        hours: (start: string, end: string) => `Horário de funcionamento: ${start} às ${end}.`,
        servicesHeader: "Serviços:",
        serviceLine: (name: string, minutes: number, price: string) =>
          `• ${name} (${minutes} minutos • ${price})`,
        barbersHeader: "Barbeiros:",
        barberLine: (name: string) => `• ${name}`,
        bookingsHeader: "Agendamentos existentes:",
        bookingsEmpty: "(Nenhum agendamento registrado no momento.)",
        bookingLine: ({
          date,
          start,
          end,
          serviceName,
          barberName,
          customerName,
        }: {
          date: string;
          start?: string | null;
          end?: string | null;
          serviceName: string;
          barberName: string;
          customerName?: string | null;
        }) => {
          const timeRange = [start, end].filter(Boolean).join("–");
          const timeSegment = timeRange ? ` ${timeRange}` : "";
          const clientSegment = customerName ? ` para ${customerName}` : "";
          return `${date}${timeSegment} • ${serviceName} • ${barberName}${clientSegment}`;
        },
        instructions: [
          "Você pode usar ferramentas para verificar disponibilidade, criar agendamentos e cancelar agendamentos.",
          "Sempre colete o nome, sobrenome e telefone do cliente antes de agendar.",
          "Use find_customer para conferir o cadastro pelo telefone informado e create_customer se não houver registro.",
          "Inclua o customer_id retornado sempre que chamar book_service para vincular o agendamento ao cliente.",
          "Quando o usuário quiser agendar, reúna serviço, barbeiro, data e horário preferido antes de sugerir opções.",
          "Chame get_availability antes de confirmar um novo agendamento e explique conflitos encontrados.",
          "Após realizar um agendamento ou cancelamento, confirme a ação e resuma o resultado para o usuário.",
        ],
      },
    },
    imageAssistant: COMPONENT_COPY.pt.imageAssistant,
    userForm: COMPONENT_COPY.pt.userForm,
    recurrenceModal: COMPONENT_COPY.pt.recurrenceModal,
    occurrencePreview: COMPONENT_COPY.pt.occurrencePreview,
    weekTitle: "Esta semana",
    overviewSubtitle: (range?: string | null) =>
      `Visão geral dos agendamentos marcados para ${range?.trim() ? range : "a semana atual"}.`,
    stats: {
      bookingsLabel: "Agendamentos",
      averagePerDay: (avg: string) => `Média de ${avg} por dia`,
      serviceHoursLabel: "Horas de serviço",
      serviceHoursDetail: "Horas reservadas",
      revenueLabel: "Receita",
      revenueDetail: "Baseado nos preços dos serviços",
      busiestBarberLabel: "Barbeiro mais ativo",
      busiestDetail: (count: number) => `${count} agendamento${count === 1 ? "" : "s"}`,
      avgDuration: (minutes: string) => `${minutes} min de duração média`,
      utilization: (percentage: string) => `${percentage}% da capacidade usada`,
      avgTicket: (value: string) => `Ticket médio ${value}`,
      topShare: (percentage: string) => `${percentage}% dos agendamentos`,
      noBarberData: "Sem dados de barbeiro",
    },
    bookingsByDayTitle: "Painel de agendamentos",
    charts: {
      pizzaTitle: "Destaque de serviços",
      pizzaSubtitle: (service: string) => `Participação semanal de ${service}`,
      pizzaEmpty: "Nenhum serviço agendado nesta semana.",
      pizzaStat: (percentage: string) => `${percentage}% dos agendamentos da semana`,
      pizzaOther: "Outros serviços",
      pieLegendTitle: "Participação nos agendamentos da semana",
      pieLegendEmpty: "Sem composição de serviços disponível.",
      barsTitle: "Agendamentos por dia",
      barsSubtitle: "Volume diário para a semana selecionada.",
      barsEmpty: "Sem agendamentos neste período.",
      highlightsTitle: "Picos e vales",
      highlightsSubtitle: "Dias mais cheio e mais tranquilo da semana.",
      barberTitle: "Ranking de barbeiros",
      barberSubtitle: "Classificação por atendimentos na semana.",
      productsTitle: "Produtos vendidos",
      productsSubtitle: "Unidades vendidas e preço de cada item.",
      productsEmpty: "Nenhuma venda de produto registrada ainda.",
      productPriceLabel: (price: string) => `Preço unitário ${price}`,
      productUnits: (count: number) => `${count} vendido${count === 1 ? "" : "s"}`,
      busiestDay: (label: string, count: number) => `Dia mais cheio: ${label} (${count})`,
      quietestDay: (label: string, count: number) => `Dia mais tranquilo: ${label} (${count})`,
      serviceCount: (count: number) => `${count} atendimento${count === 1 ? "" : "s"}`,
    },
    dayBookingCount: (count: number) =>
      `${count} agendamento${count === 1 ? "" : "s"}`,
    noBookings: "Nenhum agendamento",
    bookings: {
      title: "Agendamentos",
      subtitle: "Revise os agendamentos recentes e refine a lista usando os filtros abaixo.",
      ctaLabel: "Agendar serviço",
      ctaAccessibility: "Abrir tela de agendamento",
      filters: {
        barber: "Barbeiro",
        service: "Serviço",
        client: "Cliente",
        clientPlaceholder: "Buscar pelo nome do cliente",
        sort: "Ordem",
        sortNewest: "Mais recentes primeiro",
        sortOldest: "Mais antigos primeiro",
        limit: "Registros",
        limitOption: (limit: number) => `${limit}`,
        startDate: "Data inicial (AAAA-MM-DD)",
        startDatePlaceholder: "2025-01-30",
        startTime: "Horário inicial (HH:MM)",
        startTimePlaceholder: "09:00",
        endDate: "Data final (AAAA-MM-DD)",
        endDatePlaceholder: "2025-02-02",
        endTime: "Horário final (HH:MM)",
        endTimePlaceholder: "18:00",
        clear: "Limpar filtros",
        all: "Todos",
        toggleShow: "Mostrar filtros",
        toggleHide: "Ocultar filtros",
        pickerConfirm: "Aplicar",
        pickerCancel: "Cancelar",
      },
      results: {
        title: "Resultados",
        count: (current: number, total: number) => `${current} de ${total}`,
        limitNotice: (visible: number, requested: number) =>
          `Exibindo ${visible} agendamento${visible === 1 ? "" : "s"} (limite ${requested}).`,
        sectionCount: (count: number) => `${count} agendamento${count === 1 ? "" : "s"}`,
        empty: "Nenhum agendamento corresponde aos filtros.",
        walkIn: "Cliente avulso",
        whatsappCta: "Enviar lembrete no WhatsApp",
        whatsappAccessibility: (client: string) => `Enviar lembrete no WhatsApp para ${client}`,
        whatsappErrorTitle: "Lembrete no WhatsApp",
        whatsappErrorMessage: "Não foi possível abrir o WhatsApp. Tente novamente.",
        whatsappMessage: ({
          clientName,
          serviceName,
          date,
          time,
        }: {
          clientName: string;
          serviceName: string;
          date: string;
          time: string;
        }) =>
          `Olá ${clientName}, lembrando do seu horário para ${serviceName} em ${date} às ${time}.`,
      },
      alerts: {
        loadTitle: "Lista de agendamentos",
      },
    },
    bookService: {
      serviceSection: {
        title: "Serviço",
        empty: "Crie seu primeiro serviço abaixo.",
      },
      clientSection: {
        title: "Cliente",
        noneSelected: "Nenhum cliente selecionado",
        change: "Trocar",
        select: "Selecionar",
      },
      barberSectionTitle: "Escolha o barbeiro",
      dateSectionTitle: "Escolha o dia",
      slots: {
        title: (date: string) => `Horários disponíveis · ${date}`,
        busyTitle: "Já ocupado",
        busyMessage: (service: string, barber: string, start: string, end: string) =>
          `${service} com ${barber} • ${start}–${end}`,
        busyFallback: "Este horário não está disponível.",
        periods: {
          morning: "Manhã",
          afternoon: "Tarde",
          evening: "Noite",
        },
        empty: "Crie um serviço para ver a disponibilidade.",
      },
      alerts: {
        selectSlot: {
          title: "Selecione um horário",
          message: "Escolha um horário disponível primeiro.",
        },
        selectClient: {
          title: "Selecione o cliente",
          message: "Escolha ou crie um cliente primeiro.",
        },
        selectService: {
          title: "Selecione o serviço",
          message: "Crie ou escolha um serviço primeiro.",
        },
        bookingSuccessTitle: "Agendado!",
        bookingFailureTitle: "Falha ao agendar",
        cancelFailureTitle: "Falha ao cancelar",
        customerErrorTitle: "Clientes",
        recurrence: {
          noPreviewTitle: "Nada para pré-visualizar",
          noPreviewMessage: "Verifique a data inicial, o horário e a quantidade de ocorrências.",
          previewFailureTitle: "Erro na pré-visualização",
          noCreateTitle: "Nada para criar",
          noCreateMessage: "Todas as ocorrências foram ignoradas.",
          createSuccessTitle: "Criado",
          createSuccessMessage: (count: number, barberName: string, skipped: number) =>
            `Adicionados ${count} com ${barberName}${skipped ? ` • Ignorados ${skipped}` : ""}`,
          createFailureTitle: "Falha ao criar",
        },
      },
      actions: {
        book: { label: "Agendar serviço", accessibility: "Agendar serviço" },
        repeat: { label: "Repetir…", accessibility: "Abrir recorrência" },
      },
      bookingsList: {
        title: "Seus agendamentos",
        empty: "— nenhum ainda —",
        cancel: "Cancelar",
        tip: "Dica: selecione/crie o cliente antes do barbeiro; os conflitos dependem do barbeiro.",
      },
      clientModal: {
        title: "Selecionar cliente",
        tabs: { list: "Existentes", create: "Criar" },
        searchPlaceholder: "Buscar nome / e-mail / telefone",
        searchButton: "Buscar",
        empty: "Nenhum resultado.",
      },
    },
  },
} as const;

type SupportedLanguage = keyof typeof LANGUAGE_COPY;

const LANGUAGE_OPTIONS: { code: SupportedLanguage; label: string }[] = [
  { code: "en", label: "English (US)" },
  { code: "pt", label: "Português (BR)" },
];

type ThemeName = "dark" | "light";
type ThemePreference = "system" | ThemeName;

type ThemeColors = {
  bg: string;
  surface: string;
  sidebarBg: string;
  border: string;
  text: string;
  subtext: string;
  accent: string;
  accentFgOn: string;
  danger: string;
};

const THEMES: Record<ThemeName, ThemeColors> = {
  dark: {
    bg: "#0b0d13",
    surface: "rgba(255,255,255,0.045)",
    sidebarBg: "#111827",
    border: "rgba(255,255,255,0.07)",
    text: "#e5e7eb",
    subtext: "#cbd5e1",
    accent: "#60a5fa",
    accentFgOn: "#091016",
    danger: "#ef4444",
  },
  light: {
    bg: "#f8fafc",
    surface: "rgba(15,23,42,0.06)",
    sidebarBg: "#ffffff",
    border: "rgba(15,23,42,0.12)",
    text: "#0f172a",
    subtext: "#475569",
    accent: "#2563eb",
    accentFgOn: "#f8fafc",
    danger: "#dc2626",
  },
};

const THEME_OPTIONS: { value: ThemePreference }[] = [
  { value: "system" },
  { value: "light" },
  { value: "dark" },
];

function getInitialLanguage(): SupportedLanguage {
  try {
    const locales = Localization.getLocales();
    if (Array.isArray(locales) && locales.length > 0) {
      const primary = locales[0];
      const languageCode = primary.languageCode?.toLowerCase();
      if (languageCode === "pt") {
        return "pt";
      }
    }
  } catch (error) {
    console.warn("Failed to detect system language", error);
  }
  return "en";
}

/** ========== App ========== */
export default function App() {
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [serviceFormVisible, setServiceFormVisible] = useState(false);
  const [serviceFormMode, setServiceFormMode] = useState<"create" | "edit">("create");
  const [serviceBeingEdited, setServiceBeingEdited] = useState<Service | null>(null);
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
  const [teamMembers, setTeamMembers] = useState<StaffMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [activeScreen, setActiveScreen] = useState<
    | "home"
    | "bookings"
    | "bookService"
    | "services"
    | "products"
    | "assistant"
    | "imageAssistant"
    | "team"
    | "settings"
  >("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [language, setLanguage] = useState<SupportedLanguage>(() => getInitialLanguage());
  const copy = useMemo(() => LANGUAGE_COPY[language], [language]);
  const locale = language === "pt" ? "pt-BR" : "en-US";
  const bookServiceCopy = copy.bookService;
  const bookingsCopy = copy.bookings;
  const assistantCopy = copy.assistant;
  const imageAssistantCopy = copy.imageAssistant;
  const productsCopy = copy.productsPage;
  const productFormCopy = copy.productForm;
  const teamCopy = copy.teamPage;
  const teamRoleLabelMap = useMemo(() => {
    const entries = teamCopy.roles.map((role) => [role.value, role.label]);
    return Object.fromEntries(entries) as Record<string, string>;
  }, [teamCopy.roles]);
  const colorScheme = useColorScheme();
  const [themePreference, setThemePreference] = useState<ThemePreference>("system");
  const resolvedTheme = themePreference === "system" ? (colorScheme === "dark" ? "dark" : "light") : themePreference;
  const colors = useMemo(() => THEMES[resolvedTheme], [resolvedTheme]);
  const styles = useMemo(() => createStyles(colors), [colors]);

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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);

  const { width: windowWidth } = useWindowDimensions();
  const screenWidth = windowWidth || 0;
  const isCompactLayout = screenWidth < 768;
  const isUltraCompactLayout = screenWidth < 560;
  const sidebarWidth = Math.min(320, Math.max(240, screenWidth * 0.9));

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
  const sortProducts = useCallback(
    (list: Product[]) =>
      [...list].sort((a, b) => a.name.localeCompare(b.name, locale, { sensitivity: "base" })),
    [locale],
  );

  const sortTeamMembers = useCallback(
    (list: StaffMember[]) =>
      [...list].sort((a, b) => {
        const nameA = `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim();
        const nameB = `${b.first_name ?? ""} ${b.last_name ?? ""}`.trim();
        if (!nameA && !nameB) return 0;
        if (!nameA) return 1;
        if (!nameB) return -1;
        return nameA.localeCompare(nameB, locale, { sensitivity: "base" });
      }),
    [locale],
  );

  const loadServices = useCallback(async () => {
    setServicesLoading(true);
    try {
      const rows = await listServices();
      setServices(rows);
      setSelectedServiceId((prev) => {
        if (prev && rows.some((s) => s.id === prev)) return prev;
        return rows[0]?.id ?? null;
      });
    } catch (e: any) {
      console.error(e);
      Alert.alert(copy.servicesPage.alerts.loadTitle, e?.message ?? String(e));
      setServices([]);
      setSelectedServiceId(null);
    } finally {
      setServicesLoading(false);
    }
  }, [copy]);

  useEffect(() => { loadServices(); }, [loadServices]);

  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const rows = await listProducts();
      setProducts(sortProducts(rows));
      setProductSalesTotals((prev) => {
        const next: Record<string, number> = {};
        rows.forEach((product) => {
          next[product.id] = prev[product.id] ?? 0;
        });
        return next;
      });
    } catch (e: any) {
      console.error(e);
      Alert.alert(productsCopy.alerts.loadTitle, e?.message ?? String(e));
      setProducts([]);
      setProductSalesTotals({});
    } finally {
      setProductsLoading(false);
    }
  }, [productsCopy.alerts.loadTitle, sortProducts]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    setProducts((prev) => sortProducts(prev));
  }, [sortProducts]);

  const loadTeamMembers = useCallback(async () => {
    setTeamLoading(true);
    try {
      const rows = await listStaffMembers();
      setTeamMembers(sortTeamMembers(rows));
    } catch (e: any) {
      console.error(e);
      Alert.alert(teamCopy.alerts.loadTitle, e?.message ?? String(e));
      setTeamMembers([]);
    } finally {
      setTeamLoading(false);
    }
  }, [sortTeamMembers, teamCopy.alerts.loadTitle, listStaffMembers]);

  useEffect(() => {
    if (activeScreen === "team") {
      void loadTeamMembers();
    }
  }, [activeScreen, loadTeamMembers]);

  const handleServiceFormClose = useCallback(() => {
    setServiceFormVisible(false);
    setServiceBeingEdited(null);
    setServiceFormMode("create");
  }, []);

  const handleOpenCreateService = useCallback(() => {
    setServiceFormMode("create");
    setServiceBeingEdited(null);
    setServiceFormVisible(true);
  }, []);

  const handleOpenEditService = useCallback((svc: Service) => {
    setServiceFormMode("edit");
    setServiceBeingEdited(svc);
    setServiceFormVisible(true);
  }, []);

  const handleServiceCreated = useCallback(
    (svc: Service) => {
      setSelectedServiceId((prev) => prev ?? svc.id);
      handleServiceFormClose();
      void loadServices();
    },
    [handleServiceFormClose, loadServices],
  );

  const handleServiceUpdated = useCallback(
    (svc: Service) => {
      setSelectedServiceId((prev) => prev ?? svc.id);
      handleServiceFormClose();
      void loadServices();
    },
    [handleServiceFormClose, loadServices],
  );

  const handleDeleteService = useCallback(
    (svc: Service) => {
      if (!svc?.id) return;

      const localized = localizedServiceMap.get(svc.id) ?? svc;
      const confirmPrompt = `${copy.servicesPage.alerts.deleteTitle}\n\n${copy.servicesPage.alerts.deleteMessage(localized.name)}`;
      const executeDelete = async () => {
        try {
          await deleteService(svc.id);
          setSelectedServiceId((prev) => (prev === svc.id ? null : prev));
          void loadServices();
        } catch (e: any) {
          console.error(e);
          Alert.alert(copy.servicesPage.alerts.deleteErrorTitle, e?.message ?? String(e));
        }
      };

      if (Platform.OS === "web" && typeof window !== "undefined") {
        const confirmed = window.confirm(confirmPrompt);
        if (confirmed) {
          void executeDelete();
        }
        return;
      }

      Alert.alert(
        copy.servicesPage.alerts.deleteTitle,
        copy.servicesPage.alerts.deleteMessage(localized.name),
        [
          { text: copy.servicesPage.alerts.cancel, style: "cancel" },
          { text: copy.servicesPage.alerts.confirm, style: "destructive", onPress: () => void executeDelete() },
        ],
      );
    },
    [copy, loadServices, localizedServiceMap],
  );

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
      if (!product?.id) return;

      const confirmPrompt = `${productsCopy.alerts.deleteTitle}\n\n${productsCopy.alerts.deleteMessage(product.name)}`;
      const executeDelete = async () => {
        try {
          await deleteProduct(product.id);
          setProducts((prev) => prev.filter((item) => item.id !== product.id));
          setProductSalesTotals((prev) => {
            const { [product.id]: _ignored, ...rest } = prev;
            return rest;
          });
        } catch (e: any) {
          console.error(e);
          Alert.alert(productsCopy.alerts.deleteErrorTitle, e?.message ?? String(e));
        }
      };

      if (Platform.OS === "web" && typeof window !== "undefined") {
        const confirmed = window.confirm(confirmPrompt);
        if (confirmed) {
          void executeDelete();
        }
        return;
      }

      Alert.alert(
        productsCopy.alerts.deleteTitle,
        productsCopy.alerts.deleteMessage(product.name),
        [
          { text: productsCopy.alerts.cancel, style: "cancel" },
          { text: productsCopy.alerts.confirm, style: "destructive", onPress: () => void executeDelete() },
        ],
      );
    },
    [productsCopy],
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
    if (!stockModalProduct) return;
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
        Alert.alert(
          productsCopy.stockModal.sellSuccessTitle,
          productsCopy.stockModal.sellSuccessMessage(updated.name, quantity),
        );
      } else {
        updated = await restockProduct(stockModalProduct.id, quantity);
        Alert.alert(
          productsCopy.stockModal.restockSuccessTitle,
          productsCopy.stockModal.restockSuccessMessage(updated.name, quantity),
        );
      }

      setProducts((prev) =>
        sortProducts(prev.map((item) => (item.id === updated.id ? updated : item))),
      );
      if (stockModalMode === "sell") {
        setProductSalesTotals((prev) => ({
          ...prev,
          [updated.id]: (prev[updated.id] ?? 0) + quantity,
        }));
      }
      handleCloseStockModal();
    } catch (e: any) {
      const title =
        stockModalMode === "sell"
          ? productsCopy.alerts.sellErrorTitle
          : productsCopy.alerts.restockErrorTitle;
      console.error(e);
      Alert.alert(title, e?.message ?? String(e));
    } finally {
      setStockSaving(false);
    }
  }, [
    handleCloseStockModal,
    productsCopy.alerts.restockErrorTitle,
    productsCopy.alerts.sellErrorTitle,
    productsCopy.stockModal,
    sortProducts,
    stockModalMode,
    stockModalProduct,
    stockQuantityText,
  ]);

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
      await createBooking({
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

  /** Recorrência: usa data/horário/serviço/barbeiro já selecionados e o mesmo cliente */
  async function handleRecurrenceSubmit(opts: {
    time: string;
    count: number;
    startFrom: Date;
    frequency: RecurrenceFrequency;
  }) {
    if (!selectedCustomer) {
      Alert.alert(bookServiceCopy.alerts.selectClient.title, bookServiceCopy.alerts.selectClient.message);
      return;
    }

    if (!selectedService) {
      Alert.alert(bookServiceCopy.alerts.selectService.title, bookServiceCopy.alerts.selectService.message);
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
          const step = opts.frequency === "every-15-days" ? 15 : 7;
          occurrenceDate = addDays(occurrenceDate, step);
        }
      }

      const date = toDateKey(occurrenceDate);
      return { date, start, end };
    });

    if (raw.length === 0) {
      Alert.alert(
        bookServiceCopy.alerts.recurrence.noPreviewTitle,
        bookServiceCopy.alerts.recurrence.noPreviewMessage,
      );
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
      setPreviewOpen(true);
    } catch (e: any) {
      console.error(e);
      Alert.alert(bookServiceCopy.alerts.recurrence.previewFailureTitle, e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function confirmPreviewInsert() {
    if (!selectedCustomer) {
      setPreviewOpen(false);
      Alert.alert(bookServiceCopy.alerts.selectClient.title, bookServiceCopy.alerts.selectClient.message);
      return;
    }

    if (!selectedService) {
      setPreviewOpen(false);
      Alert.alert(bookServiceCopy.alerts.selectService.title, bookServiceCopy.alerts.selectService.message);
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
        customer_id: selectedCustomer.id,
      }));

    if (toInsert.length === 0) {
      setPreviewOpen(false);
      Alert.alert(
        bookServiceCopy.alerts.recurrence.noCreateTitle,
        bookServiceCopy.alerts.recurrence.noCreateMessage,
      );
      return;
    }
    try {
      setLoading(true);
      await createBookingsBulk(toInsert);
      setPreviewOpen(false);
      await load();
      await loadWeek();
      const skipped = previewItems.length - toInsert.length;
      const barberName = BARBER_MAP[selectedBarber.id]?.name ?? selectedBarber.id;
      Alert.alert(
        bookServiceCopy.alerts.recurrence.createSuccessTitle,
        bookServiceCopy.alerts.recurrence.createSuccessMessage(toInsert.length, barberName, skipped),
      );
    } catch (e: any) {
      console.error(e);
      Alert.alert(bookServiceCopy.alerts.recurrence.createFailureTitle, e?.message ?? String(e));
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
          : null;
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

  const bookingsNavActive = activeScreen === "bookings" || activeScreen === "bookService";

  const handleNavigate = useCallback(
    (
      screen:
        | "home"
        | "bookings"
        | "bookService"
        | "services"
        | "products"
        | "assistant"
        | "imageAssistant"
        | "team"
        | "settings",
    ) => {
      setActiveScreen(screen);
      setSidebarOpen(false);
    },
    [],
  );

  const menuButtonTop = Platform.select({ ios: 52, android: 40, default: 24 });

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

  return (
    <View style={[styles.appShell, { backgroundColor: colors.bg }]}>
      {!sidebarOpen && (
        <Pressable
          onPress={() => setSidebarOpen(true)}
          style={[
            styles.menuFab,
            {
              top: menuButtonTop,
              borderColor: colors.border,
              backgroundColor: colors.sidebarBg,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Open navigation menu"
        >
          <MaterialCommunityIcons name="menu" size={20} color={colors.text} />
        </Pressable>
      )}

      {sidebarOpen && (
        <Pressable
          onPress={() => setSidebarOpen(false)}
          style={styles.sidebarBackdrop}
          accessibilityRole="button"
          accessibilityLabel="Close navigation menu"
        />
      )}

      <View
        style={[
          styles.sidebar,
          { borderColor: colors.border, backgroundColor: colors.sidebarBg, width: sidebarWidth },
          sidebarOpen
            ? styles.sidebarOpen
            : [styles.sidebarClosed, { transform: [{ translateX: sidebarWidth + 40 }] }],
        ]}
        pointerEvents={sidebarOpen ? "auto" : "none"}
      >
        <View style={styles.sidebarHeader}>
          <View style={styles.sidebarBrand}>
            <MaterialCommunityIcons name="content-cut" size={22} color="#fff" />
            <Text style={styles.navBrand}>AIBarber</Text>
          </View>
          <Pressable
            onPress={() => setSidebarOpen(false)}
            style={styles.sidebarClose}
            accessibilityRole="button"
            accessibilityLabel="Close navigation menu"
          >
            <Ionicons name="close" size={18} color={colors.subtext} />
          </Pressable>
        </View>
        <View style={styles.sidebarItems}>
          <Pressable
            onPress={() => handleNavigate("home")}
            style={[styles.sidebarItem, activeScreen === "home" && styles.sidebarItemActive]}
            accessibilityRole="button"
            accessibilityLabel="Go to overview"
          >
            <MaterialCommunityIcons
              name="view-dashboard-outline"
              size={20}
              color={activeScreen === "home" ? colors.accentFgOn : colors.subtext}
            />
            <Text style={[styles.sidebarItemText, activeScreen === "home" && styles.sidebarItemTextActive]}>
              {copy.navigation.overview}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleNavigate("bookings")}
            style={[styles.sidebarItem, bookingsNavActive && styles.sidebarItemActive]}
            accessibilityRole="button"
            accessibilityLabel="Go to bookings"
          >
            <MaterialCommunityIcons
              name="calendar-clock"
              size={20}
              color={bookingsNavActive ? colors.accentFgOn : colors.subtext}
            />
            <Text style={[styles.sidebarItemText, bookingsNavActive && styles.sidebarItemTextActive]}>
              {copy.navigation.bookings}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleNavigate("services")}
            style={[styles.sidebarItem, activeScreen === "services" && styles.sidebarItemActive]}
            accessibilityRole="button"
            accessibilityLabel="Manage services"
          >
            <MaterialCommunityIcons
              name="briefcase-outline"
              size={20}
              color={activeScreen === "services" ? colors.accentFgOn : colors.subtext}
            />
            <Text style={[styles.sidebarItemText, activeScreen === "services" && styles.sidebarItemTextActive]}>
              {copy.navigation.services}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleNavigate("products")}
            style={[styles.sidebarItem, activeScreen === "products" && styles.sidebarItemActive]}
            accessibilityRole="button"
            accessibilityLabel="Manage products"
          >
            <MaterialCommunityIcons
              name="store-outline"
              size={20}
              color={activeScreen === "products" ? colors.accentFgOn : colors.subtext}
            />
            <Text style={[styles.sidebarItemText, activeScreen === "products" && styles.sidebarItemTextActive]}>
              {copy.navigation.products}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleNavigate("assistant")}
            style={[styles.sidebarItem, activeScreen === "assistant" && styles.sidebarItemActive]}
            accessibilityRole="button"
            accessibilityLabel="Open the AI assistant"
          >
            <Ionicons
              name="sparkles-outline"
              size={20}
              color={activeScreen === "assistant" ? colors.accentFgOn : colors.subtext}
            />
            <Text style={[styles.sidebarItemText, activeScreen === "assistant" && styles.sidebarItemTextActive]}>
              {copy.navigation.assistant}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleNavigate("imageAssistant")}
            style={[styles.sidebarItem, activeScreen === "imageAssistant" && styles.sidebarItemActive]}
            accessibilityRole="button"
            accessibilityLabel="Open the image assistant"
          >
            <Ionicons
              name="image-outline"
              size={20}
              color={activeScreen === "imageAssistant" ? colors.accentFgOn : colors.subtext}
            />
            <Text
              style={[styles.sidebarItemText, activeScreen === "imageAssistant" && styles.sidebarItemTextActive]}
            >
              {copy.navigation.imageAssistant}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleNavigate("team")}
            style={[styles.sidebarItem, activeScreen === "team" && styles.sidebarItemActive]}
            accessibilityRole="button"
            accessibilityLabel="Manage team members"
          >
            <Ionicons
              name="people-outline"
              size={20}
              color={activeScreen === "team" ? colors.accentFgOn : colors.subtext}
            />
            <Text style={[styles.sidebarItemText, activeScreen === "team" && styles.sidebarItemTextActive]}>
              {copy.navigation.team}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleNavigate("settings")}
            style={[styles.sidebarItem, activeScreen === "settings" && styles.sidebarItemActive]}
            accessibilityRole="button"
            accessibilityLabel="Configure app settings"
          >
            <Ionicons
              name="settings-outline"
              size={20}
              color={activeScreen === "settings" ? colors.accentFgOn : colors.subtext}
            />
            <Text style={[styles.sidebarItemText, activeScreen === "settings" && styles.sidebarItemTextActive]}>
              {copy.navigation.settings}
            </Text>
          </Pressable>
        </View>
      </View>

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
                              : null;
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
          copy={copy.recurrenceModal}
        />
        <OccurrencePreviewModal
          visible={previewOpen}
          items={previewItems}
          onClose={() => setPreviewOpen(false)}
          onConfirm={confirmPreviewInsert}
          colors={{ text: colors.text, subtext: colors.subtext, surface: colors.surface, border: colors.border, accent: colors.accent, bg: colors.bg, danger: colors.danger }}
          copy={copy.occurrencePreview}
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
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: isCompactLayout ? 16 : 20, gap: 16 }}
        refreshControl={<RefreshControl refreshing={allBookingsLoading} onRefresh={loadAllBookings} />}
      >
        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 12 }]}>
          <View style={[styles.listHeaderRow, isCompactLayout && styles.listHeaderRowCompact]}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.title, { color: colors.text }]}>{bookingsCopy.title}</Text>
              <Text style={{ color: colors.subtext, fontSize: 13, fontWeight: "600" }}>
                {bookingsCopy.subtitle}
              </Text>
            </View>
            <Pressable
              onPress={() => setActiveScreen("bookService")}
              style={[styles.defaultCta, { marginTop: 0 }, isCompactLayout && styles.fullWidthButton]}
              accessibilityRole="button"
              accessibilityLabel={bookingsCopy.ctaAccessibility}
            >
              <Text style={styles.defaultCtaText}>{bookingsCopy.ctaLabel}</Text>
            </Pressable>
          </View>

          <FilterToggle
            initiallyOpen={false}
            showLabel={bookingsCopy.filters.toggleShow}
            hideLabel={bookingsCopy.filters.toggleHide}
            colors={colors}
          >
            <View style={{ gap: 12 }}>
              <View>
                <Text style={styles.filterLabel}>{bookingsCopy.filters.barber}</Text>
                <View style={styles.filterChipsRow}>
                  <Pressable
                    onPress={() => setBookingFilterBarber(null)}
                    style={[styles.chip, !bookingFilterBarber && styles.chipActive]}
                  >
                    <MaterialCommunityIcons
                      name="account-group"
                      size={16}
                      color={!bookingFilterBarber ? colors.accentFgOn : colors.subtext}
                    />
                    <Text style={[styles.chipText, !bookingFilterBarber && styles.chipTextActive]}>
                      {bookingsCopy.filters.all}
                    </Text>
                  </Pressable>
                  {BARBERS.map((barber) => {
                    const active = bookingFilterBarber === barber.id;
                    return (
                      <Pressable
                        key={barber.id}
                        onPress={() => setBookingFilterBarber(active ? null : barber.id)}
                        style={[styles.chip, active && styles.chipActive]}
                      >
                        <MaterialCommunityIcons
                          name={barber.icon}
                          size={16}
                          color={active ? colors.accentFgOn : colors.subtext}
                        />
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{barber.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View>
                <Text style={styles.filterLabel}>{bookingsCopy.filters.service}</Text>
                <View style={styles.filterChipsRow}>
                  <Pressable
                    onPress={() => setBookingFilterService(null)}
                    style={[styles.chip, !bookingFilterService && styles.chipActive]}
                  >
                    <MaterialCommunityIcons
                      name="briefcase-outline"
                      size={16}
                      color={!bookingFilterService ? colors.accentFgOn : colors.subtext}
                    />
                    <Text style={[styles.chipText, !bookingFilterService && styles.chipTextActive]}>
                      {bookingsCopy.filters.all}
                    </Text>
                  </Pressable>
                  {services.map((svc) => {
                    const localized = localizedServiceMap.get(svc.id) ?? svc;
                    const active = bookingFilterService === svc.id;
                    return (
                      <Pressable
                        key={svc.id}
                        onPress={() => setBookingFilterService(active ? null : svc.id)}
                        style={[styles.chip, active && styles.chipActive]}
                      >
                        <MaterialCommunityIcons
                          name={svc.icon}
                          size={16}
                          color={active ? colors.accentFgOn : colors.subtext}
                        />
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{localized.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View>
                <Text style={styles.filterLabel}>{bookingsCopy.filters.sort}</Text>
                <View style={styles.filterChipsRow}>
                  <Pressable
                    onPress={() => {
                      if (bookingSortOrder !== "desc") setBookingSortOrder("desc");
                    }}
                    style={[styles.chip, bookingSortOrder === "desc" && styles.chipActive]}
                  >
                    <MaterialCommunityIcons
                      name="sort-clock-descending"
                      size={16}
                      color={bookingSortOrder === "desc" ? colors.accentFgOn : colors.subtext}
                    />
                    <Text style={[styles.chipText, bookingSortOrder === "desc" && styles.chipTextActive]}>
                      {bookingsCopy.filters.sortNewest}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      if (bookingSortOrder !== "asc") setBookingSortOrder("asc");
                    }}
                    style={[styles.chip, bookingSortOrder === "asc" && styles.chipActive]}
                  >
                    <MaterialCommunityIcons
                      name="sort-clock-ascending"
                      size={16}
                      color={bookingSortOrder === "asc" ? colors.accentFgOn : colors.subtext}
                    />
                    <Text style={[styles.chipText, bookingSortOrder === "asc" && styles.chipTextActive]}>
                      {bookingsCopy.filters.sortOldest}
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View>
                <Text style={styles.filterLabel}>{bookingsCopy.filters.limit}</Text>
                <View style={styles.filterChipsRow}>
                  {BOOKING_LIMIT_OPTIONS.map((option) => {
                    const active = bookingResultLimit === option;
                    return (
                      <Pressable
                        key={option}
                        onPress={() => {
                          if (bookingResultLimit !== option) {
                            setBookingResultLimit(option);
                          }
                        }}
                        style={[styles.chip, active && styles.chipActive]}
                      >
                        <MaterialCommunityIcons
                          name="format-list-numbered"
                          size={16}
                          color={active ? colors.accentFgOn : colors.subtext}
                        />
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>
                          {bookingsCopy.filters.limitOption(option)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View>
                <Text style={styles.filterLabel}>{bookingsCopy.filters.client}</Text>
                <TextInput
                  placeholder={bookingsCopy.filters.clientPlaceholder}
                  placeholderTextColor={`${colors.subtext}99`}
                  value={bookingFilterClient}
                  onChangeText={setBookingFilterClient}
                  style={styles.input}
                />
              </View>

              <View style={[styles.filterRow, isCompactLayout && styles.filterRowStack]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.filterLabel}>{bookingsCopy.filters.startDate}</Text>
                  <DateTimeInput
                    value={bookingFilterStartDate}
                    onChange={setBookingFilterStartDate}
                    placeholder={bookingsCopy.filters.startDatePlaceholder}
                    placeholderTextColor={`${colors.subtext}99`}
                    mode="date"
                    colors={colors}
                    confirmLabel={bookingsCopy.filters.pickerConfirm}
                    cancelLabel={bookingsCopy.filters.pickerCancel}
                    containerStyle={{ flex: 1 }}
                    inputStyle={styles.input}
                    textInputProps={{ autoCapitalize: "none" }}
                    accessibilityLabel={`${bookingsCopy.filters.startDate} picker`}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.filterLabel}>{bookingsCopy.filters.startTime}</Text>
                  <DateTimeInput
                    value={bookingFilterStartTime}
                    onChange={setBookingFilterStartTime}
                    placeholder={bookingsCopy.filters.startTimePlaceholder}
                    placeholderTextColor={`${colors.subtext}99`}
                    mode="time"
                    colors={colors}
                    confirmLabel={bookingsCopy.filters.pickerConfirm}
                    cancelLabel={bookingsCopy.filters.pickerCancel}
                    containerStyle={{ flex: 1 }}
                    inputStyle={styles.input}
                    textInputProps={{ autoCapitalize: "none" }}
                    accessibilityLabel={`${bookingsCopy.filters.startTime} picker`}
                  />
                </View>
              </View>

              <View style={[styles.filterRow, isCompactLayout && styles.filterRowStack]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.filterLabel}>{bookingsCopy.filters.endDate}</Text>
                  <DateTimeInput
                    value={bookingFilterEndDate}
                    onChange={setBookingFilterEndDate}
                    placeholder={bookingsCopy.filters.endDatePlaceholder}
                    placeholderTextColor={`${colors.subtext}99`}
                    mode="date"
                    colors={colors}
                    confirmLabel={bookingsCopy.filters.pickerConfirm}
                    cancelLabel={bookingsCopy.filters.pickerCancel}
                    containerStyle={{ flex: 1 }}
                    inputStyle={styles.input}
                    textInputProps={{ autoCapitalize: "none" }}
                    accessibilityLabel={`${bookingsCopy.filters.endDate} picker`}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.filterLabel}>{bookingsCopy.filters.endTime}</Text>
                  <DateTimeInput
                    value={bookingFilterEndTime}
                    onChange={setBookingFilterEndTime}
                    placeholder={bookingsCopy.filters.endTimePlaceholder}
                    placeholderTextColor={`${colors.subtext}99`}
                    mode="time"
                    colors={colors}
                    confirmLabel={bookingsCopy.filters.pickerConfirm}
                    cancelLabel={bookingsCopy.filters.pickerCancel}
                    containerStyle={{ flex: 1 }}
                    inputStyle={styles.input}
                    textInputProps={{ autoCapitalize: "none" }}
                    accessibilityLabel={`${bookingsCopy.filters.endTime} picker`}
                  />
                </View>
              </View>

              <View style={[styles.filterActions, isCompactLayout && styles.filterActionsCompact]}>
                <Pressable onPress={clearBookingFilters} style={[styles.smallBtn, { borderColor: colors.border }]}>
                  <Text style={{ color: colors.subtext, fontWeight: "800" }}>{bookingsCopy.filters.clear}</Text>
                </Pressable>
              </View>
            </View>
          </FilterToggle>
        </View>

        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 14 }]}>
          <View style={[styles.listHeaderRow, isCompactLayout && styles.listHeaderRowCompact]}>
            <Text style={[styles.title, { color: colors.text }]}>{bookingsCopy.results.title}</Text>
            <View
              style={[
                styles.listHeaderMeta,
                isCompactLayout && styles.listHeaderMetaCompact,
              ]}
            >
              <Text style={{ color: colors.subtext, fontWeight: "700" }}>
                {bookingsCopy.results.count(filteredBookingsList.length, allBookings.length)}
              </Text>
              <Text style={styles.bookingListNotice}>
                {bookingsCopy.results.limitNotice(allBookings.length, bookingResultLimit)}
              </Text>
            </View>
          </View>

          {allBookingsLoading ? (
            <ActivityIndicator />
          ) : groupedBookings.length === 0 ? (
            <Text style={styles.empty}>{bookingsCopy.results.empty}</Text>
          ) : (
            groupedBookings.map((group, groupIndex) => {
              const dateLabel = humanDate(group.date, locale);
              const countLabel = bookingsCopy.results.sectionCount(group.bookings.length);
              return (
                <View
                  key={group.date}
                  style={[
                    styles.bookingListSection,
                    groupIndex === 0 && styles.bookingListSectionFirst,
                  ]}
                >
                  <View style={styles.bookingListSectionHeader}>
                    <Text style={styles.bookingListSectionTitle}>{dateLabel}</Text>
                    <Text style={styles.bookingListSectionCount}>{countLabel}</Text>
                  </View>
                  {group.bookings.map((booking) => {
                    const rawService = serviceMap.get(booking.service_id);
                    const displayService = localizedServiceMap.get(booking.service_id) ?? rawService;
                    const barber = BARBER_MAP[booking.barber];
                    const customerName = booking._customer
                      ? `${booking._customer.first_name}${booking._customer.last_name ? ` ${booking._customer.last_name}` : ""}`
                      : bookingsCopy.results.walkIn;
                    const reminderName = booking._customer?.first_name?.trim()
                      ? booking._customer.first_name.trim()
                      : customerName;
                    const reminderTime = booking.start;
                    const reminderMessage = bookingsCopy.results.whatsappMessage({
                      clientName: reminderName,
                      serviceName: displayService?.name ?? booking.service_id,
                      date: dateLabel,
                      time: reminderTime,
                    });
                    const phoneDigits = booking._customer?.phone?.replace(/\D/g, "");
                    const hasPhone = Boolean(phoneDigits);
                    const openWhatsAppReminder = () => {
                      if (!phoneDigits) return;
                      const url = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(reminderMessage)}`;
                      Linking.openURL(url).catch((error) => {
                        console.error(error);
                        Alert.alert(
                          bookingsCopy.results.whatsappErrorTitle,
                          bookingsCopy.results.whatsappErrorMessage,
                        );
                      });
                    };

                    return (
                      <View
                        key={booking.id}
                        style={[
                          styles.bookingListRow,
                          isUltraCompactLayout && styles.bookingListRowCompact,
                        ]}
                      >
                        <View
                          style={[
                            styles.bookingListTime,
                            isUltraCompactLayout && styles.bookingListTimeCompact,
                          ]}
                        >
                          <Text style={styles.bookingListClock}>
                            {booking.start} – {booking.end}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.bookingListTitle}>{displayService?.name ?? booking.service_id}</Text>
                          <Text style={styles.bookingListMeta}>
                            {(barber?.name ?? booking.barber) + (customerName ? ` • ${customerName}` : "")}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.bookingListActions,
                            isUltraCompactLayout && styles.bookingListActionsCompact,
                          ]}
                        >
                          <Pressable
                            onPress={openWhatsAppReminder}
                            disabled={!hasPhone}
                            style={[
                              styles.smallBtn,
                              styles.whatsappBtn,
                              {
                                borderColor: hasPhone ? WHATSAPP_BRAND_COLOR : colors.border,
                                backgroundColor: hasPhone
                                  ? applyAlpha(WHATSAPP_BRAND_COLOR, 0.12)
                                  : colors.surface,
                              },
                              isUltraCompactLayout && styles.fullWidthButton,
                              !hasPhone && styles.smallBtnDisabled,
                            ]}
                            accessibilityRole="button"
                            accessibilityState={{ disabled: !hasPhone }}
                            accessibilityLabel={bookingsCopy.results.whatsappAccessibility(customerName)}
                          >
                            <MaterialCommunityIcons
                              name="whatsapp"
                              size={16}
                              color={hasPhone ? WHATSAPP_BRAND_COLOR : colors.subtext}
                            />
                            <Text
                              style={{
                                color: hasPhone ? WHATSAPP_BRAND_COLOR : colors.subtext,
                                fontWeight: "800",
                              }}
                            >
                              {bookingsCopy.results.whatsappCta}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    ) : activeScreen === "products" ? (
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
            {products.length === 0 ? (
              <Text style={[styles.empty, { marginVertical: 8 }]}>{productsCopy.empty}</Text>
            ) : (
              products.map((product) => {
                const disableSell = product.stock_quantity <= 0;
                return (
                  <View
                    key={product.id}
                    style={[
                      styles.serviceRow,
                      styles.productRow,
                      isUltraCompactLayout && styles.productRowCompact,
                    ]}
                  >
                    <View
                      style={[
                        styles.productInfo,
                        isUltraCompactLayout && styles.productInfoCompact,
                      ]}
                    >
                      <Text style={{ color: colors.text, fontWeight: "800" }}>{product.name}</Text>
                      <Text style={{ color: colors.subtext, fontSize: 12 }}>
                        {productsCopy.productMeta(formatPrice(product.price_cents), product.stock_quantity)}
                      </Text>
                      {product.sku ? (
                        <Text style={{ color: colors.subtext, fontSize: 12 }}>{`SKU: ${product.sku}`}</Text>
                      ) : null}
                      {product.description ? (
                        <Text style={{ color: colors.subtext, fontSize: 12 }}>
                          {`${productsCopy.descriptionLabel}: ${product.description}`}
                        </Text>
                      ) : null}
                    </View>
                    <View
                      style={[
                        styles.serviceActions,
                        styles.productActions,
                        isUltraCompactLayout && styles.productActionsCompact,
                      ]}
                    >
                      <Pressable
                        onPress={() => handleOpenSellProduct(product)}
                        disabled={disableSell}
                        style={[
                          styles.smallBtn,
                          {
                            borderColor: disableSell ? colors.border : colors.accent,
                            backgroundColor: disableSell ? colors.surface : "rgba(37,99,235,0.12)",
                          },
                          disableSell && styles.smallBtnDisabled,
                          isUltraCompactLayout && styles.productActionButtonCompact,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={productsCopy.actions.sell.accessibility(product.name)}
                      >
                        <Text
                          style={{
                            color: disableSell ? colors.subtext : colors.accent,
                            fontWeight: "800",
                          }}
                        >
                          {productsCopy.actions.sell.label}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleOpenRestockProduct(product)}
                        style={[
                          styles.smallBtn,
                          {
                            borderColor: colors.accent,
                            backgroundColor: "rgba(37,99,235,0.12)",
                          },
                          isUltraCompactLayout && styles.productActionButtonCompact,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={productsCopy.actions.restock.accessibility(product.name)}
                      >
                        <Text style={{ color: colors.accent, fontWeight: "800" }}>
                          {productsCopy.actions.restock.label}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleOpenEditProduct(product)}
                        style={[
                          styles.smallBtn,
                          { borderColor: colors.border },
                          isUltraCompactLayout && styles.productActionButtonCompact,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={productsCopy.actions.edit.accessibility(product.name)}
                      >
                        <Text style={{ color: colors.subtext, fontWeight: "800" }}>
                          {productsCopy.actions.edit.label}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeleteProduct(product)}
                        style={[
                          styles.smallBtn,
                          {
                            borderColor: colors.danger,
                            backgroundColor: "rgba(239,68,68,0.1)",
                          },
                          isUltraCompactLayout && styles.productActionButtonCompact,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={productsCopy.actions.delete.accessibility(product.name)}
                      >
                        <Text style={{ color: colors.danger, fontWeight: "800" }}>
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
                    ? productsCopy.stockModal.sellTitle(stockModalProduct.name)
                    : productsCopy.stockModal.restockTitle(stockModalProduct.name)
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
    ) : activeScreen === "services" ? (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: isCompactLayout ? 16 : 20, gap: 16 }}
        refreshControl={<RefreshControl refreshing={servicesLoading} onRefresh={loadServices} />}
      >
        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 12 }]}>
          <View style={[styles.listHeaderRow, isCompactLayout && styles.listHeaderRowCompact]}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.title, { color: colors.text }]}>{copy.servicesPage.title}</Text>
              <Text style={{ color: colors.subtext, fontSize: 13, fontWeight: "600" }}>
                {copy.servicesPage.subtitle}
              </Text>
            </View>
            <Pressable
              onPress={handleOpenCreateService}
              style={[styles.defaultCta, { marginTop: 0 }, isCompactLayout && styles.fullWidthButton]}
              accessibilityRole="button"
              accessibilityLabel={copy.servicesPage.createCta.accessibility}
            >
              <Text style={styles.defaultCtaText}>{copy.servicesPage.createCta.label}</Text>
            </Pressable>
          </View>
        </View>

        {serviceFormVisible ? (
          <ServiceForm
            mode={serviceFormMode}
            service={serviceFormMode === "edit" ? serviceBeingEdited : null}
            onCreated={handleServiceCreated}
            onUpdated={handleServiceUpdated}
            onCancel={handleServiceFormClose}
            colors={{
              text: colors.text,
              subtext: colors.subtext,
              border: colors.border,
              surface: colors.surface,
              accent: colors.accent,
              accentFgOn: colors.accentFgOn,
              danger: colors.danger,
            }}
            copy={copy.serviceForm}
          />
        ) : null}

        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 12 }]}>
          <Text style={[styles.title, { color: colors.text }]}>{copy.servicesPage.listTitle}</Text>
          {services.length === 0 ? (
            <Text style={[styles.empty, { marginVertical: 8 }]}>{copy.servicesPage.empty}</Text>
          ) : (
            services.map((svc) => {
              const localized = localizedServiceMap.get(svc.id) ?? svc;
              return (
                <View key={svc.id} style={styles.serviceRow}>
                  <View
                    style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1, flexWrap: "wrap" }}
                  >
                    <MaterialCommunityIcons name={svc.icon} size={22} color={colors.accent} />
                    <View>
                      <Text style={{ color: colors.text, fontWeight: "800" }}>{localized.name}</Text>
                      <Text style={{ color: colors.subtext, fontSize: 12 }}>
                        {copy.servicesPage.serviceMeta(svc.estimated_minutes, formatPrice(svc.price_cents))}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.serviceActions}>
                    <Pressable
                      onPress={() => handleOpenEditService(svc)}
                      style={[styles.smallBtn, { borderColor: colors.border }]}
                      accessibilityRole="button"
                      accessibilityLabel={copy.servicesPage.actions.edit.accessibility(localized.name)}
                    >
                      <Text style={{ color: colors.subtext, fontWeight: "800" }}>
                        {copy.servicesPage.actions.edit.label}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleDeleteService(svc)}
                      style={[
                        styles.smallBtn,
                        {
                          borderColor: colors.danger,
                          backgroundColor: "rgba(239,68,68,0.1)",
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={copy.servicesPage.actions.delete.accessibility(localized.name)}
                    >
                      <Text style={{ color: colors.danger, fontWeight: "800" }}>
                        {copy.servicesPage.actions.delete.label}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    ) : activeScreen === "assistant" ? (
      <AssistantChat
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
        systemPrompt={assistantSystemPrompt}
        contextSummary={assistantContextSummary}
        onBookingsMutated={handleBookingsMutated}
        services={localizedServices}
        copy={assistantCopy.chat}
      />
    ) : activeScreen === "imageAssistant" ? (
      <ImageAssistant
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
        copy={imageAssistantCopy}
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
            onSaved={(row) => {
              const memberRole = (row.role ?? teamCopy.roles[0]?.value ?? "professional") as StaffRole;
              const member: StaffMember = {
                id: row.id,
                first_name: row.first_name,
                last_name: row.last_name,
                email: row.email ?? null,
                phone: row.phone ?? null,
                date_of_birth: row.date_of_birth ?? null,
                role: memberRole,
              };
              setTeamMembers((prev) => sortTeamMembers([...prev.filter((m) => m.id !== member.id), member]));
              void loadTeamMembers();
            }}
          />
        </View>
      </ScrollView>
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
  styles: ReturnType<typeof createStyles>;
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

/** ========== Design tokens & styles ========== */
const SHADOW = Platform.select({
  ios: { shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
  android: { elevation: 6 },
  default: {},
});

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  appShell: { flex: 1 },
  menuFab: {
    position: "absolute",
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 40,
    ...(SHADOW as object),
  },
  sidebarBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
    zIndex: 20,
  },
  sidebar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: 260,
    paddingTop: Platform.select({ ios: 52, android: 40, default: 24 }),
    paddingBottom: 24,
    paddingHorizontal: 16,
    borderLeftWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.sidebarBg,
    alignItems: "stretch",
    gap: 16,
    zIndex: 30,
    ...(SHADOW as object),
  },
  sidebarOpen: { transform: [{ translateX: 0 }] },
  sidebarClosed: { transform: [{ translateX: 320 }] },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sidebarBrand: { flexDirection: "row", alignItems: "center", gap: 10 },
  navBrand: { color: colors.text, fontSize: 18, fontWeight: "800", letterSpacing: 0.3 },
  sidebarClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  sidebarItems: {
    flex: 1,
    gap: 8,
    width: "100%",
  },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: "transparent",
  },
  sidebarItemActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  sidebarItemText: { color: colors.subtext, fontWeight: "700" },
  sidebarItemTextActive: { color: colors.accentFgOn },
  mainArea: { flex: 1 },

  defaultScreen: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
  defaultTitle: { color: colors.text, fontSize: 24, fontWeight: "800", textAlign: "center", letterSpacing: 0.3 },
  defaultSubtitle: { color: colors.subtext, fontSize: 14, textAlign: "center", lineHeight: 20, maxWidth: 320 },
  defaultCta: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  defaultCtaText: { color: colors.accentFgOn, fontWeight: "800", fontSize: 14 },

  header: {
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.sidebarBg,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 },
  title: { color: colors.text, fontSize: 22, fontWeight: "800", letterSpacing: 0.3 },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: colors.surface },
  badgeText: { color: colors.subtext, fontSize: 12, fontWeight: "600" },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  filterChipsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, ...(SHADOW as object) },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.subtext, fontWeight: "700" },
  chipTextActive: { color: colors.accentFgOn, fontWeight: "800" },

  container: { padding: 16, gap: 14 },
  containerCompact: { paddingHorizontal: 12, paddingVertical: 16, gap: 16 },
  sectionLabel: { color: colors.text, fontSize: 14, fontWeight: "700", letterSpacing: 0.3, marginTop: 8 },
  filterLabel: { color: colors.subtext, fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },

  card: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 12, ...(SHADOW as object) },
  languageControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  languageLabel: { fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6 },
  languageOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  languageOption: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  languageOptionText: { fontWeight: "700", fontSize: 12 },
  input: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    fontWeight: "700",
    marginTop: 6,
  },
  filterRow: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  filterRowStack: { flexDirection: "column" },
  filterActions: { flexDirection: "row", justifyContent: "flex-end" },
  filterActionsCompact: { justifyContent: "flex-start" },
  listHeaderRow: { flexDirection: "row", alignItems: "center", gap: 12, justifyContent: "space-between" },
  listHeaderRowCompact: { flexDirection: "column", alignItems: "stretch", gap: 12 },
  listHeaderMeta: { alignItems: "flex-end", gap: 4 },
  listHeaderMetaCompact: { alignItems: "flex-start" },
  bookingListNotice: { color: colors.subtext, fontSize: 12, fontWeight: "600" },
  bookingListRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  bookingListRowCompact: { flexDirection: "column", alignItems: "flex-start", gap: 8 },
  bookingListSection: { gap: 12, marginTop: 18 },
  bookingListSectionFirst: { marginTop: 8 },
  bookingListSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bookingListSectionTitle: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  bookingListSectionCount: { color: colors.subtext, fontWeight: "700", fontSize: 12 },
  bookingListTime: { width: 120, alignItems: "flex-start" },
  bookingListTimeCompact: { width: "100%" },
  bookingListClock: { color: colors.subtext, fontWeight: "700", fontSize: 12 },
  bookingListTitle: { color: colors.text, fontWeight: "800", fontSize: 15 },
  bookingListMeta: { color: colors.subtext, fontWeight: "600", fontSize: 12, marginTop: 2 },
  bookingListActions: { flexDirection: "row", alignItems: "center" },
  bookingListActionsCompact: { width: "100%" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },

  slotGroup: { gap: 8 },
  slotGroupTitle: {
    color: colors.subtext,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  slot: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface },
  slotPressed: { opacity: 0.7 },
  slotText: { color: colors.text, fontWeight: "700" },

  // seleção de horário
  slotActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  slotTextActive: { color: colors.accentFgOn },

  // slot ocupado
  slotBusy: { backgroundColor: "rgba(239,68,68,0.15)", borderColor: "rgba(239,68,68,0.4)" },
  slotBusyText: { color: colors.danger, textDecorationLine: "line-through", fontWeight: "700" },

  // slot indisponível (sem reserva direta)
  slotDisabled: { backgroundColor: applyAlpha(colors.subtext, 0.08), borderColor: applyAlpha(colors.subtext, 0.25) },
  slotDisabledText: { color: colors.subtext, fontWeight: "700", opacity: 0.7 },

  // resumo fixo
  summaryText: { marginTop: 10, textAlign: "center", color: colors.text, fontWeight: "700", fontSize: 14 },

  // botões
  bookBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.accent, borderWidth: 1, borderColor: colors.accent },
  bookBtnDisabled: { opacity: 0.5 },
  bookBtnText: { color: colors.accentFgOn, fontWeight: "800" },

  empty: { color: colors.subtext, padding: 6 },

  bookingCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: applyAlpha(colors.accent, 0.2),
    backgroundColor: mixHexColor(colors.surface, colors.accent, 0.05),
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...(SHADOW as object),
  },
  bookingIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: applyAlpha(colors.accent, 0.12),
  },
  bookingContent: { flex: 1, gap: 8 },
  bookingHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  bookingTitle: { color: colors.text, fontSize: 16, fontWeight: "800", flex: 1, flexWrap: "wrap" },
  bookingTimePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: applyAlpha(colors.accent, 0.12),
  },
  bookingTimeText: { color: colors.accent, fontSize: 12, fontWeight: "800", letterSpacing: 0.3 },
  bookingMetaRow: { flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" },
  bookingMetaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  bookingMetaText: { color: colors.subtext, fontSize: 13, fontWeight: "700" },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: applyAlpha(colors.danger, 0.45),
    backgroundColor: applyAlpha(colors.danger, 0.1),
  },
  cancelText: { color: colors.danger, fontWeight: "800", fontSize: 13 },

  note: { color: colors.subtext, fontSize: 12, marginTop: 8 },

  loadingOverlay: { position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.15)" },

  // Modal
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.45)", padding: 16 },
  sheet: {
    width: 560,
    maxWidth: "100%",
    maxHeight: "90%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.sidebarBg,
    padding: 16,
    gap: 12,
  },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  sheetScroll: { alignSelf: "stretch", flexGrow: 1 },
  tab: { borderWidth: 1, borderColor: colors.border, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999 },
  tabText: { color: colors.text, fontWeight: "800" },

  // linha lista
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
  },
  cardRowStack: { flexDirection: "column", alignItems: "stretch", gap: 12 },
  smallBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  smallBtnDisabled: { opacity: 0.5 },
  stockModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 20,
  },
  stockModalCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
    gap: 12,
  },
  stockModalTitle: { fontSize: 18, fontWeight: "800" },
  stockModalSubtitle: { fontSize: 13, fontWeight: "600" },
  stockModalLabel: { fontSize: 12, fontWeight: "700" },
  stockQuantityInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: "700",
    backgroundColor: "rgba(15,23,42,0.35)",
  },
  stockModalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  fullWidthButton: { alignSelf: "stretch", justifyContent: "center", alignItems: "center" },
  whatsappBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  productRow: {
    alignItems: "flex-start",
  },
  productRowCompact: {
    flexDirection: "column",
    alignItems: "stretch",
  },
  serviceActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  productActions: {
    justifyContent: "flex-end",
  },
  productActionsCompact: {
    width: "100%",
    justifyContent: "flex-start",
    alignItems: "stretch",
    flexDirection: "column",
  },
  productInfo: {
    flex: 1,
    gap: 4,
  },
  productInfoCompact: {
    width: "100%",
  },
  productActionButtonCompact: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statsGridCompact: { gap: 10, justifyContent: "space-between" },
  statCard: {
    flex: 1,
    minWidth: 180,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 12,
  },
  statCardCompact: {
    flexGrow: 0,
    flexBasis: "48%",
    minWidth: "48%",
    padding: 12,
    borderRadius: 14,
    gap: 8,
  },
  statCardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  statIconBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  statIconBubbleCompact: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  statLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  statLabelCompact: { fontSize: 11 },
  statValue: { fontSize: 24, fontWeight: "800" },
  statValueCompact: { fontSize: 20 },
  statDetail: { fontSize: 12, fontWeight: "600" },
  statDetailCompact: { fontSize: 11 },
  statChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  statProgressTrack: {
    height: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  statProgressTrackCompact: {
    height: 5,
  },
  statProgressFill: { height: "100%", borderRadius: 999 },
  insightsRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  insightSection: {
    flex: 1,
    minWidth: 220,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  insightSectionHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  insightSectionTitle: { fontSize: 14, fontWeight: "800" },
  insightSectionSubtitle: { fontSize: 12, fontWeight: "600" },
  pieChartBlock: { flexDirection: "row", alignItems: "center", gap: 16 },
  pieChartBlockCompact: { flexDirection: "column" },
  pieChartWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
  pieChartCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 2,
    zIndex: 2,
  },
  pieChartValue: { fontSize: 20, fontWeight: "800" },
  pieChartLabel: { fontSize: 12, fontWeight: "700" },
  pieLegend: { flex: 1, gap: 10 },
  pieLegendTitle: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  pieLegendItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  pieLegendSwatch: { width: 12, height: 12, borderRadius: 6 },
  pieLegendLabel: { fontSize: 13, fontWeight: "700" },
  pieLegendMeta: { fontSize: 12, fontWeight: "600" },
  highlightGroup: { gap: 8 },
  highlightPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  chartCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  barChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 4,
  },
  barColumn: { flex: 1, minWidth: 36, alignItems: "center", gap: 8 },
  barValue: { fontSize: 13, fontWeight: "700" },
  productBarUnits: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  barTrack: {
    width: 28,
    height: 120,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: { width: "100%", borderRadius: 14 },
  barLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  productBarPrice: { fontSize: 11, fontWeight: "600", textAlign: "center" },
  productBarName: { fontSize: 12, fontWeight: "700", textAlign: "center" },
  leaderboard: { gap: 12 },
  leaderboardRow: { gap: 8, paddingVertical: 4 },
  leaderboardInfo: { flexDirection: "row", alignItems: "center", gap: 8 },
  leaderboardBarTrack: { width: "100%", height: 6, borderRadius: 999, overflow: "hidden" },
  leaderboardBarFill: { height: "100%", borderRadius: 999 },
  teamList: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 12 },
  teamListRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  teamListIcon: { marginTop: 2 },
  teamListInfo: { flex: 1, gap: 6 },
  teamRoleBadge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
});
