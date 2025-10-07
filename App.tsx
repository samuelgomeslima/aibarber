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
} from "react-native";
import { supabase } from "./src/lib/supabase";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import * as Localization from "expo-localization";

import {
  BARBERS,
  BARBER_MAP,
  type Service,
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

const getTodayDateKey = () => toDateKey(new Date());

const getCurrentTimeString = () => {
  const now = new Date();
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

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
  createBooking,
  cancelBooking,
  listCustomers,
  listRecentBookings,
  type BookingWithCustomer,
  type Customer,
} from "./src/lib/bookings";
import { deleteService, listServices } from "./src/lib/services";

/* Components (mantidos) */
import DateSelector from "./src/components/DateSelector";
import RecurrenceModal from "./src/components/RecurrenceModal"; // recebe fixedDate/fixedTime/fixedService/fixedBarber
import OccurrencePreviewModal, { PreviewItem } from "./src/components/OccurrencePreviewModal";
import BarberSelector, { Barber } from "./src/components/BarberSelector";
import AssistantChat from "./src/components/AssistantChat";
import ImageAssistant from "./src/components/ImageAssistant";
import ServiceForm from "./src/components/ServiceForm";

/* Novo: formulário de usuário (com date_of_birth e salvando no Supabase) */
import UserForm from "./src/components/UserForm";

const LANGUAGE_COPY = {
  en: {
    languageLabel: "Language",
    switchLanguage: "Switch language to",
    navigation: {
      overview: "Overview",
      bookings: "Bookings",
      services: "Services",
      assistant: "Assistant",
      imageAssistant: "Image lab",
      settings: "Settings",
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
    serviceForm: {
      createTitle: "Register a service",
      editTitle: "Edit service",
      createSubtitle: "Services define the duration and price of each booking.",
      editSubtitle: "Adjust the duration, price, or icon for this service.",
      fields: {
        nameLabel: "Name",
        namePlaceholder: "Cut & Style",
        nameError: "Name is required",
        durationLabel: "Duration (minutes)",
        durationPlaceholder: "45",
        durationError: "Enter minutes > 0",
        priceLabel: "Price",
        pricePlaceholder: "30.00",
        priceError: "Enter a valid price",
        iconLabel: "Icon (MaterialCommunityIcons)",
        iconPlaceholder: "content-cut",
        iconError: "Unknown icon",
        previewLabel: "Preview:",
      },
      buttons: {
        create: "Create service",
        edit: "Save changes",
        saving: "Saving…",
        cancel: "Cancel",
      },
      accessibility: {
        submitCreate: "Create service",
        submitEdit: "Save service changes",
        cancel: "Cancel service form",
      },
      alerts: {
        createdTitle: "Service created",
        createdMessage: (name: string, minutes: number) => `${name} (${minutes} min)`,
        updatedTitle: "Service updated",
        updatedMessage: (name: string, minutes: number) => `${name} (${minutes} min)`,
        createErrorTitle: "Create service failed",
        updateErrorTitle: "Update service failed",
      },
    },
    assistant: {
      chat: {
        initialMessage:
          "Hi! I'm your AIBarber agent. I can check availability, book services, and cancel existing appointments for you.",
        apiKeyWarning: "Set EXPO_PUBLIC_OPENAI_API_KEY to enable the assistant.",
        contextPrefix: "Booking context:",
        quickRepliesTitle: "Suggested prompts",
        quickRepliesToggleShow: "Show suggestions",
        quickRepliesToggleHide: "Hide quick suggestions",
        quickReplyAccessibility: (suggestion: string) => `Send quick message: ${suggestion}`,
        quickReplies: {
          existingBookings: "Show my existing bookings",
          bookService: "Help me book a service",
          bookSpecificService: (serviceName: string) => `Book a ${serviceName}`,
          barberAvailability: (barberName: string) => `Available hours for ${barberName}`,
        },
        inputPlaceholder: "Ask about bookings...",
        sendAccessibility: "Send message",
        suggestionsAccessibility: {
          show: "Show quick suggestions",
          hide: "Hide quick suggestions",
        },
        voiceButtonAccessibility: {
          start: "Start voice input",
          stop: "Stop voice input",
        },
        errors: {
          generic: "Something went wrong.",
          missingApiKey: "Set EXPO_PUBLIC_OPENAI_API_KEY to enable voice input.",
          voiceWebOnly: "Voice capture is currently supported on the web experience only.",
          voiceUnsupported: "Voice capture is not supported in this browser.",
          voiceStartFailed: "Unable to start voice recording.",
          noAudio: "No audio captured. Try again.",
          processFailed: "Failed to process voice message.",
        },
      },
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
    imageAssistant: {
      title: "Image assistant",
      subtitle: {
        before: "Generate marketing visuals for your shop using the OpenAI image API deployed under ",
        highlight: "/api/GenerateImage",
        after: ".",
      },
      helperMessage:
        "Set EXPO_PUBLIC_IMAGE_API_TOKEN to authenticate requests to the GenerateImage function.",
      promptLabel: "Prompt",
      promptPlaceholder:
        "Create a premium hero image for a barber shop website featuring a modern haircut session.",
      sizeLabel: "Size",
      sizeOptions: [
        { label: "Square • 256px", value: "256x256" },
        { label: "Detailed • 512px", value: "512x512" },
        { label: "Showcase • 1024px", value: "1024x1024" },
      ] as const,
      qualityLabel: "Quality",
      qualityOptions: [
        { label: "Standard", value: "standard", helper: "Fastest option for quick previews." },
        { label: "HD", value: "hd", helper: "Sharper output, slightly slower." },
      ] as const,
      optionAccessibility: {
        size: (label: string) => `Select ${label} size`,
        quality: (label: string) => `Use ${label} quality`,
      },
      generateButton: "Generate image",
      generateAccessibility: "Generate marketing image",
      errors: {
        generateFailed: "Unable to generate image.",
      },
      history: {
        title: "Recent results",
        clearLabel: "Clear",
        clearAccessibility: "Clear generated images",
        promptLabel: "Prompt:",
        revisedPrefix: "Revised prompt:",
        meta: (size: string, quality: string) => `Size: ${size} • Quality: ${quality}`,
        generatedAt: (timestamp: string) => `Generated ${timestamp}`,
      },
    },
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
    },
    bookingsByDayTitle: "Bookings by day",
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
      },
      results: {
        title: "Results",
        count: (current: number, total: number) => `${current} of ${total}`,
        empty: "No bookings match your filters.",
        walkIn: "Walk-in",
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
      assistant: "Assistente",
      imageAssistant: "Laboratório de imagens",
      settings: "Configurações",
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
    serviceForm: {
      createTitle: "Cadastrar serviço",
      editTitle: "Editar serviço",
      createSubtitle: "Os serviços definem a duração e o preço de cada agendamento.",
      editSubtitle: "Ajuste a duração, o preço ou o ícone deste serviço.",
      fields: {
        nameLabel: "Nome",
        namePlaceholder: "Corte & Estilo",
        nameError: "Nome é obrigatório",
        durationLabel: "Duração (minutos)",
        durationPlaceholder: "45",
        durationError: "Informe minutos > 0",
        priceLabel: "Preço",
        pricePlaceholder: "30,00",
        priceError: "Informe um preço válido",
        iconLabel: "Ícone (MaterialCommunityIcons)",
        iconPlaceholder: "content-cut",
        iconError: "Ícone desconhecido",
        previewLabel: "Prévia:",
      },
      buttons: {
        create: "Criar serviço",
        edit: "Salvar alterações",
        saving: "Salvando…",
        cancel: "Cancelar",
      },
      accessibility: {
        submitCreate: "Criar serviço",
        submitEdit: "Salvar alterações do serviço",
        cancel: "Cancelar formulário de serviço",
      },
      alerts: {
        createdTitle: "Serviço criado",
        createdMessage: (name: string, minutes: number) => `${name} (${minutes} min)`,
        updatedTitle: "Serviço atualizado",
        updatedMessage: (name: string, minutes: number) => `${name} (${minutes} min)`,
        createErrorTitle: "Falha ao criar serviço",
        updateErrorTitle: "Falha ao atualizar serviço",
      },
    },
    assistant: {
      chat: {
        initialMessage:
          "Olá! Sou o seu agente AIBarber. Posso verificar disponibilidade, agendar serviços e cancelar compromissos existentes para você.",
        apiKeyWarning: "Defina EXPO_PUBLIC_OPENAI_API_KEY para habilitar o assistente.",
        contextPrefix: "Contexto de agendamentos:",
        quickRepliesTitle: "Prompts sugeridos",
        quickRepliesToggleShow: "Mostrar sugestões",
        quickRepliesToggleHide: "Ocultar sugestões rápidas",
        quickReplyAccessibility: (suggestion: string) => `Enviar mensagem rápida: ${suggestion}`,
        quickReplies: {
          existingBookings: "Mostrar meus agendamentos",
          bookService: "Ajudar a agendar um serviço",
          bookSpecificService: (serviceName: string) => `Agendar ${serviceName}`,
          barberAvailability: (barberName: string) => `Horários disponíveis para ${barberName}`,
        },
        inputPlaceholder: "Pergunte sobre os agendamentos...",
        sendAccessibility: "Enviar mensagem",
        suggestionsAccessibility: {
          show: "Mostrar sugestões rápidas",
          hide: "Ocultar sugestões rápidas",
        },
        voiceButtonAccessibility: {
          start: "Iniciar entrada por voz",
          stop: "Parar entrada por voz",
        },
        errors: {
          generic: "Algo deu errado.",
          missingApiKey: "Defina EXPO_PUBLIC_OPENAI_API_KEY para habilitar a entrada por voz.",
          voiceWebOnly: "A captura de voz está disponível apenas na experiência web no momento.",
          voiceUnsupported: "A captura de voz não é suportada neste navegador.",
          voiceStartFailed: "Não foi possível iniciar a gravação de voz.",
          noAudio: "Nenhum áudio capturado. Tente novamente.",
          processFailed: "Falha ao processar a mensagem de voz.",
        },
      },
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
    imageAssistant: {
      title: "Laboratório de imagens",
      subtitle: {
        before: "Gere visuais de marketing para a sua barbearia usando a API de imagens da OpenAI disponível em ",
        highlight: "/api/GenerateImage",
        after: ".",
      },
      helperMessage:
        "Defina EXPO_PUBLIC_IMAGE_API_TOKEN para autenticar as requisições para a função GenerateImage.",
      promptLabel: "Prompt",
      promptPlaceholder:
        "Crie uma imagem hero premium para o site de uma barbearia mostrando um corte moderno.",
      sizeLabel: "Tamanho",
      sizeOptions: [
        { label: "Quadrado • 256px", value: "256x256" },
        { label: "Detalhado • 512px", value: "512x512" },
        { label: "Vitrine • 1024px", value: "1024x1024" },
      ] as const,
      qualityLabel: "Qualidade",
      qualityOptions: [
        { label: "Padrão", value: "standard", helper: "Opção mais rápida para pré-visualizações." },
        { label: "HD", value: "hd", helper: "Resultado mais nítido, um pouco mais lento." },
      ] as const,
      optionAccessibility: {
        size: (label: string) => `Selecionar tamanho ${label}`,
        quality: (label: string) => `Usar qualidade ${label}`,
      },
      generateButton: "Gerar imagem",
      generateAccessibility: "Gerar imagem de marketing",
      errors: {
        generateFailed: "Não foi possível gerar a imagem.",
      },
      history: {
        title: "Resultados recentes",
        clearLabel: "Limpar",
        clearAccessibility: "Limpar imagens geradas",
        promptLabel: "Prompt:",
        revisedPrefix: "Prompt revisado:",
        meta: (size: string, quality: string) => `Tamanho: ${size} • Qualidade: ${quality}`,
        generatedAt: (timestamp: string) => `Gerado em ${timestamp}`,
      },
    },
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
      busiestDetail: (count: number) =>
        `${count} agendamento${count === 1 ? "" : "s"}`,
    },
    bookingsByDayTitle: "Agendamentos por dia",
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
      },
      results: {
        title: "Resultados",
        count: (current: number, total: number) => `${current} de ${total}`,
        empty: "Nenhum agendamento corresponde aos filtros.",
        walkIn: "Cliente avulso",
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
  const [activeScreen, setActiveScreen] = useState<
    | "home"
    | "bookings"
    | "bookService"
    | "services"
    | "assistant"
    | "imageAssistant"
    | "settings"
  >("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [language, setLanguage] = useState<SupportedLanguage>(() => getInitialLanguage());
  const copy = useMemo(() => LANGUAGE_COPY[language], [language]);
  const bookServiceCopy = copy.bookService;
  const bookingsCopy = copy.bookings;
  const assistantCopy = copy.assistant;
  const imageAssistantCopy = copy.imageAssistant;

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
  const [bookingFilterBarber, setBookingFilterBarber] = useState<string | null>(null);
  const [bookingFilterService, setBookingFilterService] = useState<string | null>(null);
  const [bookingFilterClient, setBookingFilterClient] = useState("");
  const [bookingFilterStartDate, setBookingFilterStartDate] = useState<string>(() => getTodayDateKey());
  const [bookingFilterStartTime, setBookingFilterStartTime] = useState<string>(() => getCurrentTimeString());
  const [bookingFilterEndDate, setBookingFilterEndDate] = useState("");
  const [bookingFilterEndTime, setBookingFilterEndTime] = useState("");

  const [recurrenceOpen, setRecurrenceOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);

  const [weekBookings, setWeekBookings] = useState<BookingWithCustomer[]>([]);
  const [weekDays, setWeekDays] = useState<{ date: Date; key: string }[]>([]);
  const [weekLoading, setWeekLoading] = useState(false);

  // Horário selecionado (só cria ao clicar "Book service")
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

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

      const confirm = () => {
        void (async () => {
          try {
            await deleteService(svc.id);
            setSelectedServiceId((prev) => (prev === svc.id ? null : prev));
            void loadServices();
          } catch (e: any) {
            console.error(e);
            Alert.alert(copy.servicesPage.alerts.deleteErrorTitle, e?.message ?? String(e));
          }
        })();
      };

      Alert.alert(
        copy.servicesPage.alerts.deleteTitle,
        copy.servicesPage.alerts.deleteMessage(svc.name),
        [
          { text: copy.servicesPage.alerts.cancel, style: "cancel" },
          { text: copy.servicesPage.alerts.confirm, style: "destructive", onPress: confirm },
        ],
      );
    },
    [copy, loadServices],
  );

  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedServiceId) ?? null,
    [services, selectedServiceId],
  );

  const serviceMap = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);

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
      const rows = await listRecentBookings();
      setAllBookings(Array.isArray(rows) ? rows : []);
    } catch (e: any) {
      console.error(e);
      Alert.alert(LANGUAGE_COPY[language].bookings.alerts.loadTitle, e?.message ?? String(e));
      setAllBookings([]);
    } finally {
      setAllBookingsLoading(false);
    }
  }, [language]);

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
    for (let t = start; t <= end - 30; t += 30) slots.push(minutesToTime(t));
    return slots;
  }, []);

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
      Alert.alert(
        bookServiceCopy.alerts.bookingSuccessTitle,
        `${selectedService.name} • ${selectedCustomer.first_name} • ${barberName} • ${start} • ${humanDate(dateKey)}`,
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
  async function handleRecurrenceSubmit(opts: { time: string; count: number; startFrom: Date }) {
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

    const raw = Array.from({ length: opts.count }, (_, i) => {
      const d = new Date(first);
      d.setDate(first.getDate() + i * 7); // semanal
      const date = toDateKey(d);
      const start = `${pad(hh)}:${pad(mm)}`;
      const end = addMinutes(start, minutes);
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
      const { data: existingAll, error } = await supabase
        .from("bookings")
        .select('id,date,start,"end",service_id,barber')
        .in("date", dates);
      if (error) throw error;

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
      const { error } = await supabase.from("bookings").insert(toInsert);
      if (error) throw error;
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
    const serviceList = services
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
  }, [assistantCopy.contextSummary, bookings, services]);

  const assistantSystemPrompt = useMemo(() => {
    const serviceLines = services
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
        const serviceName = serviceMap.get(b.service_id)?.name ?? b.service_id;
        const barberName = BARBER_MAP[b.barber]?.name ?? b.barber;
        const customerName = b._customer
          ? `${b._customer.first_name}${b._customer.last_name ? ` ${b._customer.last_name}` : ""}`
          : null;
        return assistantCopy.systemPrompt.bookingLine({
          date: humanDate(b.date),
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
  }, [assistantCopy.systemPrompt, bookings, serviceMap, services]);

  const filteredBookingsList = useMemo(() => {
    const barber = bookingFilterBarber?.trim();
    const service = bookingFilterService?.trim();
    const client = bookingFilterClient.trim().toLowerCase();
    const startDateTime = buildDateTime(bookingFilterStartDate, bookingFilterStartTime, "00:00");
    const endDateTime = buildDateTime(bookingFilterEndDate, bookingFilterEndTime, "23:59");
    const rangeStartMs = startDateTime?.getTime() ?? null;
    const rangeEndMs = endDateTime?.getTime() ?? null;

    return [...allBookings]
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
        if (a.date === b.date) return a.start.localeCompare(b.start);
        return a.date.localeCompare(b.date);
      });
  }, [
    allBookings,
    bookingFilterBarber,
    bookingFilterService,
    bookingFilterClient,
    bookingFilterStartDate,
    bookingFilterStartTime,
    bookingFilterEndDate,
    bookingFilterEndTime,
  ]);

  const clearBookingFilters = useCallback(() => {
    setBookingFilterBarber(null);
    setBookingFilterService(null);
    setBookingFilterClient("");
    setBookingFilterStartDate(getTodayDateKey());
    setBookingFilterStartTime(getCurrentTimeString());
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

  const locale = language === "pt" ? "pt-BR" : "en-US";

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

  const bookingsNavActive = activeScreen === "bookings" || activeScreen === "bookService";

  const handleNavigate = useCallback(
    (
      screen:
        | "home"
        | "bookings"
        | "bookService"
        | "services"
        | "assistant"
        | "imageAssistant"
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

    html.style.backgroundColor = COLORS.bg;
    body.style.backgroundColor = COLORS.bg;
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
  }, []);

  return (
    <View style={[styles.appShell, { backgroundColor: COLORS.bg }]}>
      {!sidebarOpen && (
        <Pressable
          onPress={() => setSidebarOpen(true)}
          style={[
            styles.menuFab,
            {
              top: menuButtonTop,
              borderColor: COLORS.border,
              backgroundColor: COLORS.sidebarBg,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Open navigation menu"
        >
          <MaterialCommunityIcons name="menu" size={20} color="#fff" />
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
          { borderColor: COLORS.border, backgroundColor: COLORS.sidebarBg },
          sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed,
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
            <Ionicons name="close" size={18} color={COLORS.subtext} />
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
              color={activeScreen === "home" ? COLORS.accentFgOn : COLORS.subtext}
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
              color={bookingsNavActive ? COLORS.accentFgOn : COLORS.subtext}
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
              color={activeScreen === "services" ? COLORS.accentFgOn : COLORS.subtext}
            />
            <Text style={[styles.sidebarItemText, activeScreen === "services" && styles.sidebarItemTextActive]}>
              {copy.navigation.services}
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
              color={activeScreen === "assistant" ? COLORS.accentFgOn : COLORS.subtext}
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
              color={activeScreen === "imageAssistant" ? COLORS.accentFgOn : COLORS.subtext}
            />
            <Text
              style={[styles.sidebarItemText, activeScreen === "imageAssistant" && styles.sidebarItemTextActive]}
            >
              {copy.navigation.imageAssistant}
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
              color={activeScreen === "settings" ? COLORS.accentFgOn : COLORS.subtext}
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
                  <Ionicons name="time-outline" size={14} color={COLORS.subtext} />
                  <Text style={styles.badgeText}>09:00–18:00</Text>
                </View>
              </View>
            </View>

            {/* Content */}
            <ScrollView
              contentContainerStyle={styles.container}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
              <View style={{ gap: 20 }}>
                <View>
                  <Text style={styles.sectionLabel}>{bookServiceCopy.serviceSection.title}</Text>
                  <View style={styles.chipsRow}>
                    {services.length === 0 ? (
                      <View style={[styles.chip, { opacity: 0.7 }]}>
                        <Text style={[styles.chipText, { color: COLORS.subtext }]}>
                          {bookServiceCopy.serviceSection.empty}
                        </Text>
                      </View>
                    ) : (
                      services.map((s) => {
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
                              color={active ? COLORS.accentFgOn : COLORS.subtext}
                            />
                            <Text style={[styles.chipText, active && styles.chipTextActive]}>
                              {s.name} · {s.estimated_minutes}m
                            </Text>
                          </Pressable>
                        );
                      })
                    )}
                  </View>
                </View>

                {/* Client picker (novo, antes do barbeiro) */}
                <View style={{ gap: 8 }}>
                  <Text style={{ color: COLORS.subtext, fontWeight: "800", fontSize: 12 }}>
                    {bookServiceCopy.clientSection.title}
                  </Text>
                  <View style={[styles.cardRow, { borderColor: COLORS.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: COLORS.text, fontWeight: "800" }}>
                        {selectedCustomer
                          ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}`
                          : bookServiceCopy.clientSection.noneSelected}
                      </Text>
                      {selectedCustomer?.phone ? (
                        <Text style={{ color: COLORS.subtext, fontSize: 12 }}>
                          {selectedCustomer.phone} · {selectedCustomer.email ?? ""}
                        </Text>
                      ) : null}
                    </View>
                    <Pressable
                      onPress={() => setClientModalOpen(true)}
                      style={[styles.smallBtn, { borderColor: COLORS.accent, backgroundColor: COLORS.accent }]}
                    >
                      <Text style={{ color: COLORS.accentFgOn, fontWeight: "900" }}>
                        {selectedCustomer ? bookServiceCopy.clientSection.change : bookServiceCopy.clientSection.select}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* Barber selector (desabilita se não houver cliente) */}
                <View style={{ opacity: selectedCustomer ? 1 : 0.6 }}>
                  <Text style={styles.sectionLabel}>{bookServiceCopy.barberSectionTitle}</Text>
                  <BarberSelector
                    selected={selectedBarber}
                    onChange={setSelectedBarber}
                    disabled={!selectedCustomer}
                  />
                </View>
              </View>

              {/* Date selector */}
              <Text style={styles.sectionLabel}>{bookServiceCopy.dateSectionTitle}</Text>
              <DateSelector
                value={day}
                onChange={setDay}
                colors={{
                  text: COLORS.text,
                  subtext: COLORS.subtext,
                  surface: COLORS.surface,
                  border: COLORS.border,
                  accent: COLORS.accent,
                }}
              />

              {/* Slots */}
              <Text style={styles.sectionLabel}>{bookServiceCopy.slots.title(humanDate(dateKey))}</Text>
          <View style={styles.card}>
            {selectedService ? (
              <View style={styles.grid}>
                {allSlots.map((t) => {
                  const isAvailable = availableSlots.includes(t);
                  const isSelected = selectedSlot === t;

                  if (!isAvailable) {
                    const conflict = bookings.find(
                      (b) =>
                        b.barber === selectedBarber.id &&
                        overlap(t, addMinutes(t, selectedService.estimated_minutes), b.start, b.end),
                    );
                    const conflictService = conflict ? serviceMap.get(conflict.service_id) : null;
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
                        style={[styles.slot, styles.slotBusy]}
                      >
                        <Ionicons name="close-circle-outline" size={16} color={COLORS.danger} />
                        <Text style={styles.slotBusyText}>{t}</Text>
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
                        color={isSelected ? COLORS.accentFgOn : COLORS.subtext}
                      />
                      <Text style={[styles.slotText, isSelected && styles.slotTextActive]}>{t}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.empty}>{bookServiceCopy.slots.empty}</Text>
            )}

            {/* Resumo fixo */}
            {selectedSlot && selectedService && (
              <Text style={styles.summaryText}>
                {selectedService.name} • {BARBER_MAP[selectedBarber.id]?.name} • {selectedSlot} • {humanDate(dateKey)}
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
                <Ionicons name="repeat" size={16} color={COLORS.accentFgOn} />
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
                const service = serviceMap.get(b.service_id);
                const svc = service?.name ?? b.service_id;
                const barber = BARBER_MAP[b.barber] ?? { name: b.barber, icon: "account" as const };
                const serviceIcon = (service?.icon ?? "content-cut") as keyof typeof MaterialCommunityIcons.glyphMap;
                return (
                  <View key={b.id} style={styles.bookingCard}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <MaterialCommunityIcons name={serviceIcon} size={20} color="#93c5fd" />
                      <MaterialCommunityIcons name={barber.icon} size={18} color="#cbd5e1" />
                      <Text style={styles.bookingText}>
                        {svc} • {b.start}–{b.end} • {barber.name}
                        {b._customer ? ` • ${b._customer.first_name}` : ""}
                      </Text>
                    </View>
                    <Pressable onPress={() => onCancel(b.id)} style={styles.cancelBtn}>
                      <Ionicons name="trash-outline" size={16} color="#fecaca" />
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
          fixedService={selectedService?.name ?? ""}
          fixedBarber={BARBER_MAP[selectedBarber.id]?.name || selectedBarber.id}
          colors={{ text: COLORS.text, subtext: COLORS.subtext, surface: COLORS.surface, border: COLORS.border, accent: COLORS.accent, bg: "#0c1017" }}
        />
        <OccurrencePreviewModal
          visible={previewOpen}
          items={previewItems}
          onClose={() => setPreviewOpen(false)}
          onConfirm={confirmPreviewInsert}
          colors={{ text: COLORS.text, subtext: COLORS.subtext, surface: COLORS.surface, border: COLORS.border, accent: COLORS.accent, bg: "#0b0d13", danger: COLORS.danger }}
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
        contentContainerStyle={{ padding: 20, gap: 16 }}
        refreshControl={<RefreshControl refreshing={allBookingsLoading} onRefresh={loadAllBookings} />}
      >
        <View style={[styles.card, { borderColor: COLORS.border, backgroundColor: COLORS.surface, gap: 12 }]}>
          <View style={styles.listHeaderRow}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.title, { color: COLORS.text }]}>{bookingsCopy.title}</Text>
              <Text style={{ color: COLORS.subtext, fontSize: 13, fontWeight: "600" }}>
                {bookingsCopy.subtitle}
              </Text>
            </View>
            <Pressable
              onPress={() => setActiveScreen("bookService")}
              style={[styles.defaultCta, { marginTop: 0 }]}
              accessibilityRole="button"
              accessibilityLabel={bookingsCopy.ctaAccessibility}
            >
              <Text style={styles.defaultCtaText}>{bookingsCopy.ctaLabel}</Text>
            </Pressable>
          </View>

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
                    color={!bookingFilterBarber ? COLORS.accentFgOn : COLORS.subtext}
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
                        color={active ? COLORS.accentFgOn : COLORS.subtext}
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
                    color={!bookingFilterService ? COLORS.accentFgOn : COLORS.subtext}
                  />
                  <Text style={[styles.chipText, !bookingFilterService && styles.chipTextActive]}>
                    {bookingsCopy.filters.all}
                  </Text>
                </Pressable>
                {services.map((svc) => {
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
                        color={active ? COLORS.accentFgOn : COLORS.subtext}
                      />
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{svc.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View>
              <Text style={styles.filterLabel}>{bookingsCopy.filters.client}</Text>
              <TextInput
                placeholder={bookingsCopy.filters.clientPlaceholder}
                placeholderTextColor={`${COLORS.subtext}99`}
                value={bookingFilterClient}
                onChangeText={setBookingFilterClient}
                style={styles.input}
              />
            </View>

            <View style={styles.filterRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.filterLabel}>{bookingsCopy.filters.startDate}</Text>
                <TextInput
                  placeholder={bookingsCopy.filters.startDatePlaceholder}
                  placeholderTextColor={`${COLORS.subtext}99`}
                  value={bookingFilterStartDate}
                  onChangeText={setBookingFilterStartDate}
                  style={styles.input}
                  autoCapitalize="none"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.filterLabel}>{bookingsCopy.filters.startTime}</Text>
                <TextInput
                  placeholder={bookingsCopy.filters.startTimePlaceholder}
                  placeholderTextColor={`${COLORS.subtext}99`}
                  value={bookingFilterStartTime}
                  onChangeText={setBookingFilterStartTime}
                  style={styles.input}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.filterRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.filterLabel}>{bookingsCopy.filters.endDate}</Text>
                <TextInput
                  placeholder={bookingsCopy.filters.endDatePlaceholder}
                  placeholderTextColor={`${COLORS.subtext}99`}
                  value={bookingFilterEndDate}
                  onChangeText={setBookingFilterEndDate}
                  style={styles.input}
                  autoCapitalize="none"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.filterLabel}>{bookingsCopy.filters.endTime}</Text>
                <TextInput
                  placeholder={bookingsCopy.filters.endTimePlaceholder}
                  placeholderTextColor={`${COLORS.subtext}99`}
                  value={bookingFilterEndTime}
                  onChangeText={setBookingFilterEndTime}
                  style={styles.input}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.filterActions}>
              <Pressable onPress={clearBookingFilters} style={[styles.smallBtn, { borderColor: COLORS.border }]}>
                <Text style={{ color: COLORS.subtext, fontWeight: "800" }}>{bookingsCopy.filters.clear}</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={[styles.card, { borderColor: COLORS.border, backgroundColor: COLORS.surface, gap: 10 }]}>
          <View style={styles.listHeaderRow}>
            <Text style={[styles.title, { color: COLORS.text }]}>{bookingsCopy.results.title}</Text>
            <Text style={{ color: COLORS.subtext, fontWeight: "700" }}>
              {bookingsCopy.results.count(filteredBookingsList.length, allBookings.length)}
            </Text>
          </View>

          {allBookingsLoading ? (
            <ActivityIndicator />
          ) : filteredBookingsList.length === 0 ? (
            <Text style={styles.empty}>{bookingsCopy.results.empty}</Text>
          ) : (
            filteredBookingsList.map((booking) => {
              const service = serviceMap.get(booking.service_id);
              const barber = BARBER_MAP[booking.barber];
              const customerName = booking._customer
                ? `${booking._customer.first_name}${booking._customer.last_name ? ` ${booking._customer.last_name}` : ""}`
                : bookingsCopy.results.walkIn;
              return (
                <View key={booking.id} style={styles.bookingListRow}>
                  <View style={styles.bookingListTime}>
                    <Text style={styles.bookingListDate}>{humanDate(booking.date)}</Text>
                    <Text style={styles.bookingListClock}>
                      {booking.start} – {booking.end}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bookingListTitle}>{service?.name ?? booking.service_id}</Text>
                    <Text style={styles.bookingListMeta}>
                      {(barber?.name ?? booking.barber) + (customerName ? ` • ${customerName}` : "")}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    ) : activeScreen === "services" ? (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, gap: 16 }}
        refreshControl={<RefreshControl refreshing={servicesLoading} onRefresh={loadServices} />}
      >
        <View style={[styles.card, { borderColor: COLORS.border, backgroundColor: COLORS.surface, gap: 12 }]}>
          <View style={styles.listHeaderRow}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.title, { color: COLORS.text }]}>{copy.servicesPage.title}</Text>
              <Text style={{ color: COLORS.subtext, fontSize: 13, fontWeight: "600" }}>
                {copy.servicesPage.subtitle}
              </Text>
            </View>
            <Pressable
              onPress={handleOpenCreateService}
              style={[styles.defaultCta, { marginTop: 0 }]}
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
              text: COLORS.text,
              subtext: COLORS.subtext,
              border: COLORS.border,
              surface: COLORS.surface,
              accent: COLORS.accent,
              accentFgOn: COLORS.accentFgOn,
              danger: COLORS.danger,
            }}
            copy={copy.serviceForm}
          />
        ) : null}

        <View style={[styles.card, { borderColor: COLORS.border, backgroundColor: COLORS.surface, gap: 12 }]}>
          <Text style={[styles.title, { color: COLORS.text }]}>{copy.servicesPage.listTitle}</Text>
          {services.length === 0 ? (
            <Text style={[styles.empty, { marginVertical: 8 }]}>{copy.servicesPage.empty}</Text>
          ) : (
            services.map((svc) => (
              <View key={svc.id} style={styles.serviceRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                  <MaterialCommunityIcons name={svc.icon} size={22} color={COLORS.accent} />
                  <View>
                    <Text style={{ color: COLORS.text, fontWeight: "800" }}>{svc.name}</Text>
                    <Text style={{ color: COLORS.subtext, fontSize: 12 }}>
                      {copy.servicesPage.serviceMeta(svc.estimated_minutes, formatPrice(svc.price_cents))}
                    </Text>
                  </View>
                </View>
                <View style={styles.serviceActions}>
                  <Pressable
                    onPress={() => handleOpenEditService(svc)}
                    style={[styles.smallBtn, { borderColor: COLORS.border }]}
                    accessibilityRole="button"
                    accessibilityLabel={copy.servicesPage.actions.edit.accessibility(svc.name)}
                  >
                    <Text style={{ color: COLORS.subtext, fontWeight: "800" }}>
                      {copy.servicesPage.actions.edit.label}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleDeleteService(svc)}
                    style={[
                      styles.smallBtn,
                      {
                        borderColor: COLORS.danger,
                        backgroundColor: "rgba(239,68,68,0.1)",
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={copy.servicesPage.actions.delete.accessibility(svc.name)}
                  >
                    <Text style={{ color: COLORS.danger, fontWeight: "800" }}>
                      {copy.servicesPage.actions.delete.label}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    ) : activeScreen === "assistant" ? (
      <AssistantChat
        colors={{
          text: COLORS.text,
          subtext: COLORS.subtext,
          surface: COLORS.surface,
          border: COLORS.border,
          accent: COLORS.accent,
          accentFgOn: COLORS.accentFgOn,
          danger: COLORS.danger,
          bg: COLORS.bg,
        }}
        systemPrompt={assistantSystemPrompt}
        contextSummary={assistantContextSummary}
        onBookingsMutated={handleBookingsMutated}
        services={services}
        copy={assistantCopy.chat}
      />
    ) : activeScreen === "imageAssistant" ? (
      <ImageAssistant
        colors={{
          text: COLORS.text,
          subtext: COLORS.subtext,
          surface: COLORS.surface,
          border: COLORS.border,
          accent: COLORS.accent,
          accentFgOn: COLORS.accentFgOn,
          danger: COLORS.danger,
          bg: COLORS.bg,
        }}
        copy={imageAssistantCopy}
      />
    ) : activeScreen === "settings" ? (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 16 }}>
        <View style={[styles.card, { borderColor: COLORS.border, backgroundColor: COLORS.surface, gap: 12 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Ionicons name="settings-outline" size={22} color={COLORS.accent} />
            <Text style={[styles.title, { color: COLORS.text }]}>Settings</Text>
          </View>
          <Text style={{ color: COLORS.subtext, fontSize: 13, fontWeight: "600" }}>
            Manage your preferences for the AIBarber dashboard.
          </Text>
        </View>

        <View style={[styles.card, { borderColor: COLORS.border, backgroundColor: COLORS.surface, gap: 16 }]}>
          <Text style={[styles.languageLabel, { color: COLORS.subtext }]}>{copy.languageLabel}</Text>
          <View style={styles.languageOptions}>
            {LANGUAGE_OPTIONS.map((option) => {
              const isActive = option.code === language;
              return (
                <Pressable
                  key={option.code}
                  onPress={() => setLanguage(option.code)}
                  style={[
                    styles.languageOption,
                    { borderColor: COLORS.border, backgroundColor: COLORS.surface },
                    isActive && { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${copy.switchLanguage} ${option.label}`}
                >
                  <Text
                    style={[
                      styles.languageOptionText,
                      { color: isActive ? COLORS.accentFgOn : COLORS.subtext },
                    ]}
                  >
                    {option.label}
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
        contentContainerStyle={{ padding: 20, gap: 16 }}
        refreshControl={<RefreshControl refreshing={weekLoading} onRefresh={loadWeek} />}
      >
        <View style={[styles.card, { borderColor: COLORS.border, backgroundColor: COLORS.surface, gap: 12 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <MaterialCommunityIcons name="view-dashboard-outline" size={22} color={COLORS.accent} />
            <Text style={[styles.title, { color: COLORS.text }]}>{copy.weekTitle}</Text>
          </View>
          <Text style={{ color: COLORS.subtext, fontSize: 13, fontWeight: "600" }}>
            {copy.overviewSubtitle(weekRangeLabel)}
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { borderColor: COLORS.border, backgroundColor: COLORS.surface }]}>
            <Text style={[styles.statLabel, { color: COLORS.subtext }]}>{copy.stats.bookingsLabel}</Text>
            <Text style={[styles.statValue, { color: COLORS.text }]}>{weekSummary.total}</Text>
            <Text style={[styles.statDetail, { color: COLORS.subtext }]}>
              {copy.stats.averagePerDay(
                weekDays.length ? (weekSummary.total / weekDays.length).toFixed(1) : "0.0",
              )}
            </Text>
          </View>
          <View style={[styles.statCard, { borderColor: COLORS.border, backgroundColor: COLORS.surface }]}>
            <Text style={[styles.statLabel, { color: COLORS.subtext }]}>{copy.stats.serviceHoursLabel}</Text>
            <Text style={[styles.statValue, { color: COLORS.text }]}>
              {(weekSummary.totalMinutes / 60).toFixed(weekSummary.totalMinutes / 60 >= 10 ? 0 : 1)}
            </Text>
            <Text style={[styles.statDetail, { color: COLORS.subtext }]}>
              {copy.stats.serviceHoursDetail}
            </Text>
          </View>
          <View style={[styles.statCard, { borderColor: COLORS.border, backgroundColor: COLORS.surface }]}>
            <Text style={[styles.statLabel, { color: COLORS.subtext }]}>{copy.stats.revenueLabel}</Text>
            <Text style={[styles.statValue, { color: COLORS.text }]}>{formatPrice(weekSummary.totalRevenue)}</Text>
            <Text style={[styles.statDetail, { color: COLORS.subtext }]}>
              {copy.stats.revenueDetail}
            </Text>
          </View>
          <View style={[styles.statCard, { borderColor: COLORS.border, backgroundColor: COLORS.surface }]}>
            <Text style={[styles.statLabel, { color: COLORS.subtext }]}>{copy.stats.busiestBarberLabel}</Text>
            <Text style={[styles.statValue, { color: COLORS.text }]}>
              {topBarberEntry ? BARBER_MAP[topBarberEntry[0]]?.name ?? topBarberEntry[0] : "—"}
            </Text>
            <Text style={[styles.statDetail, { color: COLORS.subtext }]}>
              {topBarberEntry
                ? copy.stats.busiestDetail(topBarberEntry[1])
                : copy.noBookings}
            </Text>
          </View>
        </View>

        <View style={[styles.card, { borderColor: COLORS.border, backgroundColor: COLORS.surface, gap: 12 }]}>
          <Text style={[styles.title, { color: COLORS.text }]}>{copy.bookingsByDayTitle}</Text>
          {weekDaySummaries.map(({ key, date, bookings }) => (
            <View key={key} style={styles.dayRow}>
              <View style={styles.dayHeader}>
                <Text style={[styles.dayTitle, { color: COLORS.text }]}>{formatWeekday(date, locale)}</Text>
                <View style={[styles.dayCountBadge, { borderColor: COLORS.border, backgroundColor: COLORS.bg }]}>
                  <Text style={[styles.dayCountText, { color: COLORS.subtext }]}>
                    {copy.dayBookingCount(bookings.length)}
                  </Text>
                </View>
              </View>
              {bookings.length === 0 ? (
                <Text style={[styles.empty, { marginLeft: 2 }]}>{copy.noBookings}</Text>
              ) : (
                bookings.map((b) => {
                  const svc = serviceMap.get(b.service_id);
                  const barberName = BARBER_MAP[b.barber]?.name ?? b.barber;
                  const customerName = b._customer
                    ? `${b._customer.first_name}${b._customer.last_name ? ` ${b._customer.last_name}` : ""}`
                    : "";
                  return (
                    <View key={b.id} style={styles.dayBookingRow}>
                      <MaterialCommunityIcons name={svc?.icon ?? "calendar"} size={18} color={COLORS.accent} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.dayBookingText, { color: COLORS.text }]}>
                          {b.start} – {b.end} • {svc?.name ?? b.service_id}
                        </Text>
                        <Text style={[styles.dayBookingMeta, { color: COLORS.subtext }]}>
                          {barberName}
                          {customerName ? ` • ${customerName}` : ""}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          ))}
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
}: {
  visible: boolean;
  onClose: () => void;
  customers: Customer[];
  loading: boolean;
  onRefreshQuery: (q: string) => void;
  onPick: (c: Customer) => void;
  onSaved: (c: Customer) => void;
  copy: typeof LANGUAGE_COPY.en.bookService.clientModal;
}) {
  const [tab, setTab] = useState<"list" | "create">("list");
  const [query, setQuery] = useState("");

  useEffect(() => { if (visible) { setTab("list"); setQuery(""); } }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: "#0c1017", borderColor: COLORS.border }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: COLORS.text, fontWeight: "900", fontSize: 16 }}>{copy.title}</Text>
            <Pressable onPress={onClose}><Ionicons name="close" size={22} color={COLORS.subtext} /></Pressable>
          </View>

          {/* Tabs */}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable onPress={() => setTab("list")}
              style={[styles.tab, tab === "list" && { backgroundColor: COLORS.accent, borderColor: COLORS.accent }]}>
              <Text style={[styles.tabText, tab === "list" && { color: COLORS.accentFgOn }]}>{copy.tabs.list}</Text>
            </Pressable>
            <Pressable onPress={() => setTab("create")}
              style={[styles.tab, tab === "create" && { backgroundColor: COLORS.accent, borderColor: COLORS.accent }]}>
              <Text style={[styles.tabText, tab === "create" && { color: COLORS.accentFgOn }]}>{copy.tabs.create}</Text>
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
                    border: `1px solid ${COLORS.border}`,
                    background: "rgba(255,255,255,0.06)",
                    color: COLORS.text,
                    fontWeight: 700,
                  }}
                />
              )}
              <Pressable onPress={() => onRefreshQuery(query)} style={[styles.smallBtn, { alignSelf: "flex-start", borderColor: COLORS.border }]}>
                <Text style={{ color: COLORS.subtext, fontWeight: "800" }}>{copy.searchButton}</Text>
              </Pressable>

              <View style={[styles.card, { gap: 6 }]}>
                {loading ? <ActivityIndicator /> : customers.length === 0 ? (
                  <Text style={{ color: COLORS.subtext }}>{copy.empty}</Text>
                ) : (
                  customers.map(c => (
                    <Pressable key={c.id} onPress={() => onPick(c)} style={styles.listRow}>
                      <MaterialCommunityIcons name="account" size={18} color="#93c5fd" />
                      <Text style={{ color: COLORS.text, fontWeight: "800" }}>
                        {c.first_name} {c.last_name}
                      </Text>
                      {c.email ? <Text style={{ color: COLORS.subtext, marginLeft: 6, fontSize: 12 }}>{c.email}</Text> : null}
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
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

/** ========== Design tokens & styles ========== */
const COLORS = {
  bg: "#0b0d13",
  surface: "rgba(255,255,255,0.045)",
  sidebarBg: "#111827",
  border: "rgba(255,255,255,0.07)",
  text: "#e5e7eb",
  subtext: "#cbd5e1",
  accent: "#60a5fa",
  accentFgOn: "#091016",
  danger: "#ef4444",
};

const SHADOW = Platform.select({
  ios: { shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
  android: { elevation: 6 },
  default: {},
});

const styles = StyleSheet.create({
  appShell: { flex: 1 },
  menuFab: {
    position: "absolute",
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
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
  navBrand: { color: "#fff", fontSize: 18, fontWeight: "800", letterSpacing: 0.3 },
  sidebarClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
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
  sidebarItemActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  sidebarItemText: { color: COLORS.subtext, fontWeight: "700" },
  sidebarItemTextActive: { color: COLORS.accentFgOn },
  mainArea: { flex: 1 },

  defaultScreen: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 },
  defaultTitle: { color: COLORS.text, fontSize: 24, fontWeight: "800", textAlign: "center", letterSpacing: 0.3 },
  defaultSubtitle: { color: COLORS.subtext, fontSize: 14, textAlign: "center", lineHeight: 20, maxWidth: 320 },
  defaultCta: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
    backgroundColor: COLORS.accent,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  defaultCtaText: { color: COLORS.accentFgOn, fontWeight: "800", fontSize: 14 },

  header: { paddingTop: 24, paddingBottom: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: "#11151c", backgroundColor: "#0c1017" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: "#fff", fontSize: 22, fontWeight: "800", letterSpacing: 0.3 },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.06)" },
  badgeText: { color: "#cbd5e1", fontSize: 12, fontWeight: "600" },

  chipsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  filterChipsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: "#ffffff12", backgroundColor: "rgba(255,255,255,0.045)", ...(SHADOW as object) },
  chipActive: { backgroundColor: "#60a5fa", borderColor: "#60a5fa" },
  chipText: { color: "#cbd5e1", fontWeight: "700" },
  chipTextActive: { color: "#091016", fontWeight: "800" },

  container: { padding: 16, gap: 14 },
  sectionLabel: { color: "#e5e7eb", fontSize: 14, fontWeight: "700", letterSpacing: 0.3, marginTop: 8 },
  filterLabel: { color: COLORS.subtext, fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },

  card: { backgroundColor: "rgba(255,255,255,0.045)", borderRadius: 18, borderWidth: 1, borderColor: "#ffffff12", padding: 12, ...(SHADOW as object) },
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
    borderColor: "#ffffff12",
    backgroundColor: "rgba(255,255,255,0.035)",
    color: COLORS.text,
    fontWeight: "700",
    marginTop: 6,
  },
  filterRow: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  filterActions: { flexDirection: "row", justifyContent: "flex-end" },
  listHeaderRow: { flexDirection: "row", alignItems: "center", gap: 12, justifyContent: "space-between" },
  bookingListRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ffffff12",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  bookingListTime: { width: 140 },
  bookingListDate: { color: COLORS.text, fontWeight: "800", fontSize: 13 },
  bookingListClock: { color: COLORS.subtext, fontWeight: "700", fontSize: 12 },
  bookingListTitle: { color: COLORS.text, fontWeight: "800", fontSize: 15 },
  bookingListMeta: { color: COLORS.subtext, fontWeight: "600", fontSize: 12, marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },

  slot: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: "#ffffff12", borderRadius: 12, backgroundColor: "rgba(255,255,255,0.03)" },
  slotPressed: { opacity: 0.7 },
  slotText: { color: "#e5e7eb", fontWeight: "700" },

  // seleção de horário
  slotActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  slotTextActive: { color: COLORS.accentFgOn },

  // slot ocupado
  slotBusy: { backgroundColor: "rgba(239,68,68,0.15)", borderColor: "rgba(239,68,68,0.4)" },
  slotBusyText: { color: COLORS.danger, textDecorationLine: "line-through", fontWeight: "700" },

  // resumo fixo
  summaryText: { marginTop: 10, textAlign: "center", color: COLORS.text, fontWeight: "700", fontSize: 14 },

  // botões
  bookBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: COLORS.accent, borderWidth: 1, borderColor: COLORS.accent },
  bookBtnDisabled: { opacity: 0.5 },
  bookBtnText: { color: COLORS.accentFgOn, fontWeight: "800" },

  empty: { color: "#cbd5e1", padding: 6 },

  bookingCard: { borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "#ffffff12", backgroundColor: "rgba(255,255,255,0.035)", flexDirection: "row", alignItems: "center", justifyContent: "space-between", ...(SHADOW as object) },
  bookingText: { color: "#e5e7eb", fontSize: 15, fontWeight: "700" },
  cancelBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: "rgba(239,68,68,0.35)", backgroundColor: "rgba(239,68,68,0.1)" },
  cancelText: { color: "#fecaca", fontWeight: "800" },

  note: { color: "#94a3b8", fontSize: 12, marginTop: 8 },

  loadingOverlay: { position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.15)" },

  // Modal
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.45)", padding: 16 },
  sheet: { width: 560, maxWidth: "100%", borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  tab: { borderWidth: 1, borderColor: "#ffffff12", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999 },
  tabText: { color: "#e5e7eb", fontWeight: "800" },

  // linha lista
  listRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 14, padding: 12 },
  smallBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ffffff12",
    backgroundColor: "rgba(255,255,255,0.035)",
  },
  serviceActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: 180,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  statLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  statValue: { fontSize: 24, fontWeight: "800" },
  statDetail: { fontSize: 12, fontWeight: "600" },
  dayRow: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ffffff12",
    padding: 12,
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  dayHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  dayTitle: { fontSize: 14, fontWeight: "800" },
  dayCountBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  dayCountText: { fontSize: 12, fontWeight: "700" },
  dayBookingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dayBookingText: { fontSize: 13, fontWeight: "700" },
  dayBookingMeta: { fontSize: 12, fontWeight: "600" },
});
