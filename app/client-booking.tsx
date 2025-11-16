import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { useThemeContext } from "../src/contexts/ThemeContext";
import {
  formatPrice,
  humanDate,
  minutesToTime,
  openingHour,
  closingHour,
  timeToMinutes,
  toDateKey,
} from "../src/lib/domain";
import type { ThemeColors } from "../src/theme/theme";

const SLOT_INTERVAL_MINUTES = 15;
const UPCOMING_DAYS = 7;

type BarbershopOption = {
  id: string;
  name: string;
  description: string;
  address: string;
};

type BarberOption = {
  id: string;
  name: string;
  headline: string;
  barbershopId: string;
  experience: string;
};

type ServiceOption = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceCents: number;
};

type SampleBooking = {
  start: string;
  durationMinutes: number;
};

type PastBooking = {
  id: string;
  serviceId: string;
  barberId: string;
  barbershopId: string;
  date: string;
  start: string;
};

type ContactMethod = "email" | "phone";

type PastBookingsIndex = Record<string, PastBooking[]>;

type BookingSummary = {
  barbershopId: string;
  barberId: string;
  serviceId: string;
  date: string;
  start: string;
  durationMinutes: number;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
};

function createDateKey(offset: number): string {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() + offset);
  return toDateKey(base);
}

const UPCOMING_DATE_KEYS = Array.from({ length: UPCOMING_DAYS }, (_, index) => createDateKey(index));

const BARBERSHOPS: BarbershopOption[] = [
  {
    id: "central",
    name: "AIBarber Central",
    description: "A bright flagship studio tailored for quick, modern looks.",
    address: "123 Downtown Ave",
  },
  {
    id: "uptown",
    name: "AIBarber Uptown",
    description: "Cozy environment focused on beard design and styling.",
    address: "782 Greenway Blvd",
  },
  {
    id: "seaside",
    name: "AIBarber Seaside",
    description: "A relaxing space with sea views and deluxe treatments.",
    address: "45 Ocean Drive",
  },
];

const BARBERS: BarberOption[] = [
  {
    id: "joao",
    name: "João Alves",
    headline: "Detail-oriented fades and razor finishes",
    barbershopId: "central",
    experience: "7 years experience",
  },
  {
    id: "maria",
    name: "Maria Fernandes",
    headline: "Color specialist and beard sculptor",
    barbershopId: "central",
    experience: "10 years experience",
  },
  {
    id: "carlos",
    name: "Carlos Nogueira",
    headline: "Classic cuts blended with modern styling",
    barbershopId: "uptown",
    experience: "5 years experience",
  },
  {
    id: "aline",
    name: "Aline Ribeiro",
    headline: "Deluxe grooming rituals and treatments",
    barbershopId: "uptown",
    experience: "8 years experience",
  },
  {
    id: "sofia",
    name: "Sofia Matos",
    headline: "Relaxing scalp treatments and styling",
    barbershopId: "seaside",
    experience: "6 years experience",
  },
  {
    id: "leo",
    name: "Leonardo Rocha",
    headline: "Signature beard shaves with hot towel finish",
    barbershopId: "seaside",
    experience: "9 years experience",
  },
];

const SERVICES: ServiceOption[] = [
  {
    id: "classic-cut",
    name: "Classic haircut",
    description: "Tailored haircut with wash and style",
    durationMinutes: 45,
    priceCents: 9000,
  },
  {
    id: "beard-trim",
    name: "Beard trim",
    description: "Precision beard trim with line-up",
    durationMinutes: 30,
    priceCents: 6500,
  },
  {
    id: "deluxe-package",
    name: "Deluxe grooming",
    description: "Full service haircut, beard, and hot towel treatment",
    durationMinutes: 75,
    priceCents: 15500,
  },
];

const SERVICE_MAP = new Map(SERVICES.map((service) => [service.id, service]));

const SAMPLE_BOOKINGS: Record<string, Record<string, Record<string, SampleBooking[]>>> = {
  central: {
    joao: {
      [UPCOMING_DATE_KEYS[0]]: [
        { start: "10:00", durationMinutes: 45 },
        { start: "14:15", durationMinutes: 30 },
      ],
      [UPCOMING_DATE_KEYS[1]]: [{ start: "11:30", durationMinutes: 45 }],
    },
    maria: {
      [UPCOMING_DATE_KEYS[0]]: [
        { start: "09:30", durationMinutes: 45 },
        { start: "13:00", durationMinutes: 75 },
      ],
      [UPCOMING_DATE_KEYS[2]]: [{ start: "15:30", durationMinutes: 30 }],
    },
  },
  uptown: {
    carlos: {
      [UPCOMING_DATE_KEYS[1]]: [
        { start: "09:45", durationMinutes: 30 },
        { start: "16:00", durationMinutes: 45 },
      ],
    },
    aline: {
      [UPCOMING_DATE_KEYS[0]]: [{ start: "12:30", durationMinutes: 60 }],
      [UPCOMING_DATE_KEYS[3]]: [{ start: "10:15", durationMinutes: 30 }],
    },
  },
  seaside: {
    sofia: {
      [UPCOMING_DATE_KEYS[0]]: [
        { start: "09:00", durationMinutes: 45 },
        { start: "11:45", durationMinutes: 30 },
      ],
    },
    leo: {
      [UPCOMING_DATE_KEYS[2]]: [
        { start: "10:30", durationMinutes: 45 },
        { start: "13:15", durationMinutes: 45 },
      ],
    },
  },
};

const PAST_BOOKINGS: PastBookingsIndex = {
  "email:ana@example.com": [
    {
      id: "PB-1001",
      serviceId: "classic-cut",
      barberId: "joao",
      barbershopId: "central",
      date: UPCOMING_DATE_KEYS[0],
      start: "09:00",
    },
    {
      id: "PB-1002",
      serviceId: "beard-trim",
      barberId: "joao",
      barbershopId: "central",
      date: UPCOMING_DATE_KEYS[0],
      start: "11:00",
    },
  ],
  "phone:+551198887766": [
    {
      id: "PB-2027",
      serviceId: "deluxe-package",
      barberId: "sofia",
      barbershopId: "seaside",
      date: UPCOMING_DATE_KEYS[1],
      start: "15:00",
    },
  ],
};

function normalizeContactKey(value: string, method: ContactMethod): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (method === "phone") {
    const digits = trimmed.replace(/\D/g, "");
    return digits ? `phone:+${digits}` : "";
  }
  return `email:${trimmed.toLowerCase()}`;
}

function getBookingsForDate(
  barbershopId: string | null,
  barberId: string | null,
  dateKey: string,
): SampleBooking[] {
  if (!barbershopId || !barberId) {
    return [];
  }
  return SAMPLE_BOOKINGS[barbershopId]?.[barberId]?.[dateKey] ?? [];
}

function getAvailableSlots(
  barbershopId: string | null,
  barberId: string | null,
  dateKey: string,
  serviceDuration: number,
): string[] {
  if (!barbershopId || !barberId) {
    return [];
  }
  const openingMinutes = openingHour * 60;
  const closingMinutes = closingHour * 60;
  const slots: string[] = [];
  const existingBookings = getBookingsForDate(barbershopId, barberId, dateKey);

  for (
    let candidateStart = openingMinutes;
    candidateStart + serviceDuration <= closingMinutes;
    candidateStart += SLOT_INTERVAL_MINUTES
  ) {
    const candidateEnd = candidateStart + serviceDuration;
    const overlaps = existingBookings.some((booking) => {
      const bookingStart = timeToMinutes(booking.start);
      const bookingEnd = bookingStart + booking.durationMinutes;
      return Math.max(candidateStart, bookingStart) < Math.min(candidateEnd, bookingEnd);
    });

    if (!overlaps) {
      slots.push(minutesToTime(candidateStart));
    }
  }

  return slots;
}

const STEP_KEYS = ["barbershop", "barber", "service", "time", "details"] as const;
type StepKey = (typeof STEP_KEYS)[number];

const STEP_TITLES: Record<StepKey, string> = {
  barbershop: "Escolha a barbearia",
  barber: "Escolha o profissional",
  service: "Escolha o serviço",
  time: "Escolha o horário",
  details: "Revise e confirme",
};

const STEP_DESCRIPTIONS: Record<StepKey, string> = {
  barbershop: "Encontre a unidade mais conveniente.",
  barber: "Selecione quem cuidará de você.",
  service: "Defina o cuidado que procura.",
  time: "Mostramos apenas horários disponíveis.",
  details: "Informe seus dados e finalize o agendamento.",
};

const MIN_NAME_LENGTH = 2;

function ClientBookingScreen(): React.ReactElement {
  const { colors } = useThemeContext();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedBarbershop, setSelectedBarbershop] = useState<string | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [submittedBooking, setSubmittedBooking] = useState<BookingSummary | null>(null);
  const [pastBookingsVisible, setPastBookingsVisible] = useState(false);
  const [pastLookupMethod, setPastLookupMethod] = useState<ContactMethod>("email");
  const [pastLookupValue, setPastLookupValue] = useState("");
  const [pastBookings, setPastBookings] = useState<PastBooking[] | null>(null);
  const [pastLookupError, setPastLookupError] = useState<string | null>(null);

  const stepKey = STEP_KEYS[currentStepIndex];

  const barbersForShop = useMemo(() => {
    if (!selectedBarbershop) {
      return [];
    }
    return BARBERS.filter((barber) => barber.barbershopId === selectedBarbershop);
  }, [selectedBarbershop]);

  const availableDates = useMemo(() => {
    if (!selectedBarbershop || !selectedBarber || !selectedService) {
      return [];
    }
    const service = SERVICE_MAP.get(selectedService);
    if (!service) {
      return [];
    }
    return UPCOMING_DATE_KEYS.filter((dateKey) => {
      const slots = getAvailableSlots(selectedBarbershop, selectedBarber, dateKey, service.durationMinutes);
      return slots.length > 0;
    });
  }, [selectedBarber, selectedBarbershop, selectedService]);

  const availableSlotsForDate = useMemo(() => {
    if (!selectedBarbershop || !selectedBarber || !selectedService || !selectedDate) {
      return [];
    }
    const service = SERVICE_MAP.get(selectedService);
    if (!service) {
      return [];
    }
    return getAvailableSlots(selectedBarbershop, selectedBarber, selectedDate, service.durationMinutes);
  }, [selectedBarber, selectedBarbershop, selectedService, selectedDate]);

  const canProceed = useMemo(() => {
    switch (stepKey) {
      case "barbershop":
        return Boolean(selectedBarbershop);
      case "barber":
        return Boolean(selectedBarber);
      case "service":
        return Boolean(selectedService);
      case "time":
        return Boolean(selectedDate && selectedStart);
      case "details":
        return false;
      default:
        return false;
    }
  }, [selectedBarbershop, selectedBarber, selectedService, selectedDate, selectedStart, stepKey]);

  const currentService = selectedService ? SERVICE_MAP.get(selectedService) ?? null : null;
  const currentBarbershop = selectedBarbershop
    ? BARBERSHOPS.find((shop) => shop.id === selectedBarbershop) ?? null
    : null;
  const currentBarber = selectedBarber ? BARBERS.find((barber) => barber.id === selectedBarber) ?? null : null;

  const resetLaterSteps = (fromStep: StepKey) => {
    switch (fromStep) {
      case "barbershop":
        setSelectedBarber(null);
        setSelectedService(null);
        setSelectedDate(null);
        setSelectedStart(null);
        break;
      case "barber":
        setSelectedService(null);
        setSelectedDate(null);
        setSelectedStart(null);
        break;
      case "service":
        setSelectedDate(null);
        setSelectedStart(null);
        break;
      case "time":
        setSelectedStart(null);
        break;
      default:
        break;
    }
  };

  const goToNextStep = () => {
    setCurrentStepIndex((index) => Math.min(STEP_KEYS.length - 1, index + 1));
  };

  const goToPreviousStep = () => {
    setCurrentStepIndex((index) => Math.max(0, index - 1));
  };

  const handleConfirmBooking = () => {
    const trimmedName = contactName.trim();
    const trimmedEmail = contactEmail.trim();
    const phoneDigits = contactPhone.replace(/\D/g, "");

    if (trimmedName.length < MIN_NAME_LENGTH) {
      Alert.alert("Informe seu nome", "Precisamos saber como chamar você no dia do atendimento.");
      return;
    }

    if (!trimmedEmail && phoneDigits.length < 8) {
      Alert.alert(
        "Como podemos falar com você?",
        "Informe um e-mail válido ou um telefone com DDD para confirmarmos o agendamento.",
      );
      return;
    }

    if (!selectedBarbershop || !selectedBarber || !selectedService || !selectedDate || !selectedStart) {
      Alert.alert("Selecione o horário", "Escolha um horário disponível antes de confirmar.");
      return;
    }

    const service = SERVICE_MAP.get(selectedService);
    if (!service) {
      Alert.alert("Serviço inválido", "Escolha um serviço válido antes de prosseguir.");
      return;
    }

    const summary: BookingSummary = {
      barbershopId: selectedBarbershop,
      barberId: selectedBarber,
      serviceId: selectedService,
      date: selectedDate,
      start: selectedStart,
      durationMinutes: service.durationMinutes,
      contactName: trimmedName,
      contactEmail: trimmedEmail || undefined,
      contactPhone: phoneDigits ? `+${phoneDigits}` : undefined,
    };

    setSubmittedBooking(summary);
    Alert.alert(
      "Agendamento solicitado!",
      "Enviamos o seu pedido. Entraremos em contato para confirmar em instantes.",
    );
  };

  const handleLookupPastBookings = () => {
    const key = normalizeContactKey(pastLookupValue, pastLookupMethod);
    if (!key) {
      setPastLookupError("Informe o e-mail ou telefone cadastrado.");
      setPastBookings(null);
      return;
    }
    const bookings = PAST_BOOKINGS[key];
    if (!bookings) {
      setPastLookupError("Não encontramos agendamentos associados a esse contato.");
      setPastBookings([]);
      return;
    }
    setPastLookupError(null);
    setPastBookings(bookings);
  };

  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Agende seu horário</Text>
        <Text style={styles.subtitle}>
          Siga o passo a passo abaixo para reservar o melhor horário para você.
        </Text>
      </View>

      <View style={styles.stepper}>
        {STEP_KEYS.map((key, index) => {
          const active = index === currentStepIndex;
          const completed = index < currentStepIndex;
          return (
            <View key={key} style={styles.stepItem}>
              <View
                style={[
                  styles.stepBullet,
                  completed && styles.stepBulletCompleted,
                  active && styles.stepBulletActive,
                ]}
              >
                <Text style={[styles.stepBulletText, completed && styles.stepBulletTextCompleted]}>{index + 1}</Text>
              </View>
              <View style={styles.stepLabelWrapper}>
                <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>{STEP_TITLES[key]}</Text>
                <Text style={styles.stepDescription}>{STEP_DESCRIPTIONS[key]}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.card}>
        {stepKey === "barbershop" && (
          <View>
            <Text style={styles.sectionTitle}>Escolha a unidade</Text>
            <Text style={styles.sectionDescription}>
              Todas as unidades oferecem os mesmos padrões de qualidade. Escolha a mais conveniente para você.
            </Text>
            <View style={styles.optionsGrid}>
              {BARBERSHOPS.map((shop) => {
                const selected = shop.id === selectedBarbershop;
                return (
                  <Pressable
                    key={shop.id}
                    onPress={() => {
                      const isNewSelection = shop.id !== selectedBarbershop;
                      setSelectedBarbershop(shop.id);
                      if (isNewSelection) {
                        resetLaterSteps("barbershop");
                      }
                    }}
                    style={[styles.optionCard, selected && styles.optionCardSelected]}
                  >
                    <Text style={styles.optionTitle}>{shop.name}</Text>
                    <Text style={styles.optionDescription}>{shop.description}</Text>
                    <View style={styles.optionFooter}>
                      <Ionicons name="location-outline" size={16} color={colors.accent} />
                      <Text style={styles.optionFooterText}>{shop.address}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {stepKey === "barber" && (
          <View>
            <Text style={styles.sectionTitle}>Quem vai cuidar de você?</Text>
            <Text style={styles.sectionDescription}>
              Escolha o profissional preferido. Você pode alterar a unidade a qualquer momento.
            </Text>
            {barbersForShop.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="clock-alert" size={24} color={colors.subtext} />
                <Text style={styles.emptyStateText}>
                  Selecione uma barbearia para visualizar os profissionais disponíveis.
                </Text>
              </View>
            ) : (
              <View style={styles.optionsGrid}>
                {barbersForShop.map((barber) => {
                  const selected = barber.id === selectedBarber;
                  return (
                    <Pressable
                      key={barber.id}
                      onPress={() => {
                        const isNewSelection = barber.id !== selectedBarber;
                        setSelectedBarber(barber.id);
                        if (isNewSelection) {
                          resetLaterSteps("barber");
                        }
                      }}
                      style={[styles.optionCard, selected && styles.optionCardSelected]}
                    >
                      <Text style={styles.optionTitle}>{barber.name}</Text>
                      <Text style={styles.optionDescription}>{barber.headline}</Text>
                      <View style={styles.optionFooter}>
                        <Ionicons name="ribbon-outline" size={16} color={colors.accent} />
                        <Text style={styles.optionFooterText}>{barber.experience}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {stepKey === "service" && (
          <View>
            <Text style={styles.sectionTitle}>Qual serviço você deseja?</Text>
            <Text style={styles.sectionDescription}>
              O tempo estimado determina os horários disponíveis. Escolha o que melhor combina com seu momento.
            </Text>
            <View style={styles.optionsGrid}>
              {SERVICES.map((service) => {
                const selected = service.id === selectedService;
                return (
                  <Pressable
                    key={service.id}
                    onPress={() => {
                      const isNewSelection = service.id !== selectedService;
                      setSelectedService(service.id);
                      if (isNewSelection) {
                        resetLaterSteps("service");
                      }
                    }}
                    style={[styles.optionCard, selected && styles.optionCardSelected]}
                  >
                    <Text style={styles.optionTitle}>{service.name}</Text>
                    <Text style={styles.optionDescription}>{service.description}</Text>
                    <View style={styles.optionFooter}>
                      <Ionicons name="time-outline" size={16} color={colors.accent} />
                      <Text style={styles.optionFooterText}>
                        {service.durationMinutes} min • {formatPrice(service.priceCents)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {stepKey === "time" && (
          <View>
            <Text style={styles.sectionTitle}>Escolha o horário perfeito</Text>
            <Text style={styles.sectionDescription}>
              Mostramos apenas horários disponíveis considerando a duração do serviço selecionado.
            </Text>
            {availableDates.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="calendar-remove" size={24} color={colors.subtext} />
                <Text style={styles.emptyStateText}>
                  Escolha a barbearia, o profissional e o serviço para visualizar os horários.
                </Text>
              </View>
            ) : (
              <View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.dateChipRow}
                >
                  {availableDates.map((dateKey) => {
                    const selected = dateKey === selectedDate;
                    return (
                      <Pressable
                        key={dateKey}
                        onPress={() => {
                          const isNewSelection = dateKey !== selectedDate;
                          setSelectedDate(dateKey);
                          if (isNewSelection) {
                            resetLaterSteps("time");
                          }
                        }}
                        style={[styles.dateChip, selected && styles.dateChipSelected]}
                      >
                        <Text style={[styles.dateChipText, selected && styles.dateChipTextSelected]}>
                          {humanDate(dateKey)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                {selectedDate ? (
                  availableSlotsForDate.length === 0 ? (
                    <View style={styles.emptyState}>
                      <MaterialCommunityIcons name="clock-alert" size={24} color={colors.subtext} />
                      <Text style={styles.emptyStateText}>
                        Os horários para este dia se esgotaram. Escolha outra data.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.slotGrid}>
                      {availableSlotsForDate.map((slot) => {
                        const selected = slot === selectedStart;
                        return (
                          <Pressable
                            key={slot}
                            onPress={() => setSelectedStart(slot)}
                            style={[styles.slotButton, selected && styles.slotButtonSelected]}
                          >
                            <Text style={[styles.slotButtonText, selected && styles.slotButtonTextSelected]}>{slot}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )
                ) : null}
              </View>
            )}
          </View>
        )}

        {stepKey === "details" && (
          <View>
            <Text style={styles.sectionTitle}>Informe seus dados</Text>
            <Text style={styles.sectionDescription}>
              Precisamos deles para confirmar o agendamento com você.
            </Text>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Resumo do agendamento</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Unidade</Text>
                <Text style={styles.summaryValue}>
                  {currentBarbershop ? currentBarbershop.name : "—"}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Profissional</Text>
                <Text style={styles.summaryValue}>{currentBarber ? currentBarber.name : "—"}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Serviço</Text>
                <Text style={styles.summaryValue}>{currentService ? currentService.name : "—"}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Data</Text>
                <Text style={styles.summaryValue}>
                  {selectedDate ? humanDate(selectedDate) : "—"}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Horário</Text>
                <Text style={styles.summaryValue}>{selectedStart ?? "—"}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Valor</Text>
                <Text style={styles.summaryValue}>
                  {currentService ? formatPrice(currentService.priceCents) : "—"}
                </Text>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nome completo</Text>
              <TextInput
                value={contactName}
                onChangeText={setContactName}
                placeholder="Como devemos chamá-lo(a)?"
                placeholderTextColor={colors.subtext}
                style={styles.input}
                autoComplete="name"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Telefone (opcional)</Text>
              <TextInput
                value={contactPhone}
                onChangeText={setContactPhone}
                placeholder="(11) 98888-7766"
                placeholderTextColor={colors.subtext}
                keyboardType="phone-pad"
                style={styles.input}
                autoComplete="tel"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>E-mail (opcional)</Text>
              <TextInput
                value={contactEmail}
                onChangeText={setContactEmail}
                placeholder="voce@email.com"
                placeholderTextColor={colors.subtext}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
                autoComplete="email"
              />
            </View>
            <Text style={styles.helperText}>
              Precisamos do seu nome e pelo menos um canal de contato (telefone ou e-mail).
            </Text>
            <Pressable
              style={styles.primaryButton}
              onPress={handleConfirmBooking}
              accessibilityRole="button"
            >
              <Text style={styles.primaryButtonText}>Confirmar agendamento</Text>
            </Pressable>
            {submittedBooking ? (
              <View style={styles.confirmationBanner}>
                <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
                <Text style={styles.confirmationText}>
                  Recebemos o seu pedido para {humanDate(submittedBooking.date)} às {submittedBooking.start}.
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </View>

      <View style={styles.footerActions}>
        <Pressable
          onPress={goToPreviousStep}
          disabled={currentStepIndex === 0}
          style={[styles.secondaryButton, currentStepIndex === 0 && styles.buttonDisabled]}
        >
          <Text style={[styles.secondaryButtonText, currentStepIndex === 0 && styles.secondaryButtonTextDisabled]}>
            Voltar
          </Text>
        </Pressable>
        {currentStepIndex < STEP_KEYS.length - 1 ? (
          <Pressable
            onPress={goToNextStep}
            disabled={!canProceed}
            style={[styles.secondaryButton, !canProceed && styles.buttonDisabled]}
          >
            <Text style={[styles.secondaryButtonText, !canProceed && styles.secondaryButtonTextDisabled]}>
              Continuar
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.pastBookingsCard}>
        <View style={styles.pastBookingsHeader}>
          <Text style={styles.sectionTitle}>Já é cliente AIBarber?</Text>
          <Pressable onPress={() => setPastBookingsVisible((value) => !value)}>
            <View style={styles.toggleRow}>
              <Text style={styles.toggleText}>{pastBookingsVisible ? "Fechar" : "Ver agendamentos passados"}</Text>
              <Ionicons
                name={pastBookingsVisible ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.accent}
              />
            </View>
          </Pressable>
        </View>
        {pastBookingsVisible ? (
          <View>
            <Text style={styles.sectionDescription}>
              Entre com o e-mail ou telefone cadastrado e exibiremos seus agendamentos anteriores.
            </Text>
            <View style={styles.lookupRow}>
              <Pressable
                onPress={() => setPastLookupMethod("email")}
                style={[styles.lookupToggle, pastLookupMethod === "email" && styles.lookupToggleActive]}
              >
                <Text
                  style={[styles.lookupToggleText, pastLookupMethod === "email" && styles.lookupToggleTextActive]}
                >
                  E-mail
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setPastLookupMethod("phone")}
                style={[styles.lookupToggle, pastLookupMethod === "phone" && styles.lookupToggleActive]}
              >
                <Text
                  style={[styles.lookupToggleText, pastLookupMethod === "phone" && styles.lookupToggleTextActive]}
                >
                  Telefone
                </Text>
              </Pressable>
            </View>
            <TextInput
              value={pastLookupValue}
              onChangeText={setPastLookupValue}
              placeholder={pastLookupMethod === "email" ? "voce@email.com" : "(11) 98888-7766"}
              placeholderTextColor={colors.subtext}
              keyboardType={pastLookupMethod === "email" ? "email-address" : "phone-pad"}
              autoCapitalize={pastLookupMethod === "email" ? "none" : "words"}
              style={styles.input}
            />
            <Pressable style={styles.secondaryButton} onPress={handleLookupPastBookings}>
              <Text style={styles.secondaryButtonText}>Acessar</Text>
            </Pressable>
            {pastLookupError ? <Text style={styles.errorText}>{pastLookupError}</Text> : null}
            {pastBookings ? (
              pastBookings.length === 0 ? (
                <Text style={styles.helperText}>Nenhum agendamento encontrado.</Text>
              ) : (
                <View style={styles.pastBookingsList}>
                  {pastBookings.map((booking) => {
                    const service = SERVICE_MAP.get(booking.serviceId);
                    const barber = BARBERS.find((item) => item.id === booking.barberId);
                    const shop = BARBERSHOPS.find((item) => item.id === booking.barbershopId);
                    return (
                      <View key={booking.id} style={styles.pastBookingItem}>
                        <Ionicons name="calendar" size={18} color={colors.accent} />
                        <View style={styles.pastBookingTextWrapper}>
                          <Text style={styles.pastBookingTitle}>{service?.name ?? "Serviço"}</Text>
                          <Text style={styles.pastBookingMeta}>
                            {humanDate(booking.date)} às {booking.start} • {barber?.name ?? "Profissional"} •
                            {" "}
                            {shop?.name ?? "Unidade"}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )
            ) : null}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    content: {
      padding: 24,
      gap: 24,
    },
    header: {
      gap: 8,
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.text,
    },
    subtitle: {
      fontSize: 16,
      color: colors.subtext,
    },
    stepper: {
      borderRadius: 16,
      backgroundColor: colors.surface,
      padding: 16,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    stepItem: {
      flexDirection: "row",
      gap: 16,
      alignItems: "flex-start",
    },
    stepBullet: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.bg,
    },
    stepBulletActive: {
      borderColor: colors.accent,
    },
    stepBulletCompleted: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    stepBulletText: {
      fontWeight: "600",
      color: colors.text,
    },
    stepBulletTextCompleted: {
      color: colors.bg,
    },
    stepLabelWrapper: {
      flex: 1,
    },
    stepLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.subtext,
    },
    stepLabelActive: {
      color: colors.text,
    },
    stepDescription: {
      fontSize: 14,
      color: colors.subtext,
      marginTop: 4,
    },
    card: {
      borderRadius: 16,
      padding: 24,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 20,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
    },
    sectionDescription: {
      fontSize: 15,
      color: colors.subtext,
      marginTop: 4,
    },
    optionsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 16,
      marginTop: 16,
    },
    optionCard: {
      flexGrow: 1,
      minWidth: 220,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bg,
      gap: 12,
    },
    optionCardSelected: {
      borderColor: colors.accent,
      backgroundColor: `${colors.accent}14`,
    },
    optionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    optionDescription: {
      fontSize: 14,
      color: colors.subtext,
    },
    optionFooter: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    optionFooterText: {
      fontSize: 13,
      color: colors.text,
    },
    emptyState: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bg,
      padding: 20,
      alignItems: "center",
      gap: 8,
      marginTop: 16,
    },
    emptyStateText: {
      color: colors.subtext,
      fontSize: 14,
      textAlign: "center",
    },
    dateChipRow: {
      gap: 8,
      paddingVertical: 16,
    },
    dateChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.bg,
    },
    dateChipSelected: {
      borderColor: colors.accent,
      backgroundColor: `${colors.accent}1A`,
    },
    dateChipText: {
      color: colors.text,
      fontWeight: "500",
    },
    dateChipTextSelected: {
      color: colors.accent,
    },
    slotGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    slotButton: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: colors.bg,
    },
    slotButtonSelected: {
      borderColor: colors.accent,
      backgroundColor: colors.accent,
    },
    slotButtonText: {
      fontWeight: "600",
      color: colors.text,
    },
    slotButtonTextSelected: {
      color: colors.bg,
    },
    summaryCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bg,
      padding: 16,
      gap: 8,
    },
    summaryTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    summaryLabel: {
      fontSize: 14,
      color: colors.subtext,
    },
    summaryValue: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    formGroup: {
      marginTop: 16,
    },
    formLabel: {
      fontSize: 14,
      color: colors.text,
      marginBottom: 8,
      fontWeight: "500",
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.bg,
    },
    helperText: {
      fontSize: 13,
      color: colors.subtext,
      marginTop: 8,
    },
    primaryButton: {
      marginTop: 20,
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
    },
    primaryButtonText: {
      color: colors.accentFgOn,
      fontWeight: "700",
      fontSize: 16,
    },
    confirmationBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 16,
      padding: 12,
      borderRadius: 12,
      backgroundColor: `${colors.accent}1A`,
    },
    confirmationText: {
      color: colors.text,
      fontSize: 14,
      flex: 1,
    },
    footerActions: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 16,
    },
    secondaryButton: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: colors.surface,
    },
    secondaryButtonText: {
      color: colors.text,
      fontWeight: "600",
      fontSize: 16,
    },
    secondaryButtonTextDisabled: {
      color: colors.subtext,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    pastBookingsCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 24,
      gap: 16,
      marginBottom: 32,
    },
    pastBookingsHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    toggleText: {
      color: colors.accent,
      fontWeight: "600",
    },
    lookupRow: {
      flexDirection: "row",
      gap: 12,
      marginTop: 16,
      marginBottom: 12,
    },
    lookupToggle: {
      flex: 1,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 10,
      alignItems: "center",
      backgroundColor: colors.bg,
    },
    lookupToggleActive: {
      borderColor: colors.accent,
      backgroundColor: `${colors.accent}1A`,
    },
    lookupToggleText: {
      color: colors.text,
      fontWeight: "600",
    },
    lookupToggleTextActive: {
      color: colors.accent,
    },
    errorText: {
      marginTop: 8,
      color: colors.danger,
      fontSize: 13,
    },
    pastBookingsList: {
      marginTop: 16,
      gap: 12,
    },
    pastBookingItem: {
      flexDirection: "row",
      gap: 12,
      alignItems: "center",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      backgroundColor: colors.bg,
    },
    pastBookingTextWrapper: {
      flex: 1,
    },
    pastBookingTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
    },
    pastBookingMeta: {
      fontSize: 13,
      color: colors.subtext,
      marginTop: 2,
    },
  });
}

export default ClientBookingScreen;
