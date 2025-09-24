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
} from "react-native";
import { supabase } from "./src/lib/supabase";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

/* Components (mantidos) */
import DateSelector from "./src/components/DateSelector";
import RecurrenceModal from "./src/components/RecurrenceModal"; // recebe fixedDate/fixedTime/fixedService/fixedBarber
import OccurrencePreviewModal, { PreviewItem } from "./src/components/OccurrencePreviewModal";
import BarberSelector, { Barber } from "./src/components/BarberSelector";
import AssistantChat from "./src/components/AssistantChat";

/* Novo: formulário de usuário (com date_of_birth e salvando no Supabase) */
import UserForm from "./src/components/UserForm";

/** ========== UI helpers / domain ========== */
type Service = { id: "cut" | "cutshave"; name: string; minutes: number; icon: keyof typeof MaterialCommunityIcons.glyphMap };
const SERVICES: Service[] = [
  { id: "cut", name: "Cut", minutes: 30, icon: "content-cut" },
  { id: "cutshave", name: "Cut & Shave", minutes: 60, icon: "razor-double-edge" },
];

const openingHour = 9, closingHour = 18;
const pad = (n: number) => n.toString().padStart(2, "0");
function toDateKey(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function minutesToTime(mins: number) { const h = Math.floor(mins / 60), m = mins % 60; return `${pad(h)}:${pad(m)}`; }
function timeToMinutes(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }
function addMinutes(t: string, minutes: number) { return minutesToTime(timeToMinutes(t) + minutes); }
function overlap(aS: string, aE: string, bS: string, bE: string) {
  const as = timeToMinutes(aS), ae = timeToMinutes(aE), bs = timeToMinutes(bS), be = timeToMinutes(bE);
  return Math.max(as, bs) < Math.min(ae, be);
}
function humanDate(dk: string) { const d = new Date(`${dk}T00:00:00`); return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }); }

/** ========== Barbeiros (para exibir nome/ícone) ========== */
const BARBERS: Barber[] = [
  { id: "joao", name: "João", icon: "account" },
  { id: "maria", name: "Maria", icon: "account-outline" },
  { id: "carlos", name: "Carlos", icon: "account-tie" },
];
const BARBER_MAP = Object.fromEntries(BARBERS.map(b => [b.id, b]));

/** ========== Tipos de dados ========== */
type DbBooking = {
  id: string;
  date: string;
  start: string;
  end: string;
  service: "cut" | "cutshave";
  barber: string;
  customer_id?: string | null;
};
type Customer = { id: string; first_name: string; last_name: string; phone?: string | null; email?: string | null; date_of_birth?: string | null };

/** ========== Data layer ========== */
async function getBookings(dateKey: string) {
  const { data, error, status } = await supabase
    .from("bookings")
    .select('id,date,start,"end",service,barber,customer_id')
    .eq("date", dateKey)
    .order("start");
  console.log("[getBookings]", { dateKey, status, data, error });
  if (error) throw error;

  const rows = (data ?? []) as DbBooking[];

  // opcional: carregar clientes para exibir na lista
  const ids = Array.from(new Set(rows.map(r => r.customer_id).filter(Boolean))) as string[];
  let customerMap = new Map<string, Customer>();
  if (ids.length) {
    const { data: people, error: e2 } = await supabase
      .from("customers")
      .select("id,first_name,last_name,phone,email,date_of_birth")
      .in("id", ids);
    if (e2) throw e2;
    customerMap = new Map((people ?? []).map(c => [c.id, c as Customer]));
  }

  // anexa o cliente (se houver)
  return rows.map(r => ({ ...r, _customer: r.customer_id ? customerMap.get(r.customer_id) : undefined })) as (DbBooking & { _customer?: Customer })[];
}

async function createBooking(payload: {
  date: string;
  start: string;
  end: string;
  service: "cut" | "cutshave";
  barber: string;
  customer_id?: string | null;
}) {
  const { error, status } = await supabase
    .from("bookings")
    .insert(payload)
    .select("id");
  console.log("[createBooking]", { payload, status, error });
  if (error) throw error;
}

async function cancelBooking(id: string) {
  const { data, error, status } = await supabase.from("bookings").delete().eq("id", id);
  console.log("[cancelBooking]", { id, status, data, error });
  if (error) throw error;
}

async function listCustomers(query: string) {
  const q = (query || "").trim();
  let req = supabase.from("customers").select("id,first_name,last_name,phone,email,date_of_birth").order("first_name").limit(20);
  if (q) {
    req = supabase
      .from("customers")
      .select("id,first_name,last_name,phone,email,date_of_birth")
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
      .limit(20);
  }
  const { data, error } = await req;
  if (error) throw error;
  return (data ?? []) as Customer[];
}

/** ========== App ========== */
export default function App() {
  const [selectedService, setSelectedService] = useState<Service>(SERVICES[0]);
  const [activeScreen, setActiveScreen] = useState<"home" | "booking" | "assistant">("home");

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

  const [bookings, setBookings] = useState<(DbBooking & { _customer?: Customer })[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [recurrenceOpen, setRecurrenceOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);

  // Horário selecionado (só cria ao clicar "Book service")
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

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

  useEffect(() => { load(); }, [load]);

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
      Alert.alert("Customers", e?.message ?? String(e));
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
    const safe = Array.isArray(bookings) ? bookings : [];
    return allSlots.filter((start) => {
      const end = addMinutes(start, selectedService.minutes);
      if (timeToMinutes(end) > closingHour * 60) return false;
      // conflito só conta para o MESMO barbeiro
      return !safe.some((b) => b.barber === selectedBarber.id && overlap(start, end, b.start, b.end));
    });
  }, [allSlots, bookings, selectedService, selectedBarber]);

  // Se o slot selecionado sair da lista (mudou dia/serviço/barbeiro ou ficou indisponível), limpa
  useEffect(() => {
    if (selectedSlot && !availableSlots.includes(selectedSlot)) {
      setSelectedSlot(null);
    }
  }, [availableSlots, selectedSlot, selectedService, selectedBarber, dateKey]);

  const book = async (start: string) => {
    if (!selectedCustomer) {
      Alert.alert("Select client", "You need to choose/create a client first.");
      return;
    }
    const end = addMinutes(start, selectedService.minutes);
    try {
      setLoading(true);
      await createBooking({
        date: dateKey,
        start,
        end,
        service: selectedService.id,
        barber: selectedBarber.id,
        customer_id: selectedCustomer.id, // salva o cliente
      });
      await load();
      const barberName = BARBER_MAP[selectedBarber.id]?.name ?? selectedBarber.id;
      Alert.alert("Booked!", `${selectedService.name} • ${selectedCustomer.first_name} • ${barberName} • ${start} • ${humanDate(dateKey)}`);
    } catch (e: any) {
      console.error(e);
      Alert.alert("Booking failed", e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const onCancel = async (id: string) => {
    try {
      setLoading(true);
      await cancelBooking(id);
      setBookings((prev) => prev.filter((b) => b.id !== id));
    } catch (e: any) {
      console.error(e);
      Alert.alert("Cancel failed", e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  /** Recorrência: usa data/horário/serviço/barbeiro já selecionados e o mesmo cliente */
  async function handleRecurrenceSubmit(opts: { time: string; count: number; startFrom: Date }) {
    if (!selectedCustomer) {
      Alert.alert("Select client", "Choose/create a client before repeating bookings.");
      return;
    }

    const minutes = selectedService.minutes;
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
      Alert.alert("Nothing to preview", "Check the start date/time/count.");
      return;
    }

    try {
      setLoading(true);
      const dates = Array.from(new Set(raw.map((r) => r.date)));
      const { data: existingAll, error } = await supabase
        .from("bookings")
        .select('id,date,start,"end",service,barber')
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
      Alert.alert("Preview failed", e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function confirmPreviewInsert() {
    if (!selectedCustomer) {
      setPreviewOpen(false);
      Alert.alert("Select client", "Choose/create a client before inserting repeated bookings.");
      return;
    }

    const toInsert = previewItems
      .filter((i) => i.ok)
      .map((i) => ({
        date: i.date,
        start: i.start,
        end: i.end,
        service: selectedService.id as "cut" | "cutshave",
        barber: selectedBarber.id,
        customer_id: selectedCustomer.id,
      }));

    if (toInsert.length === 0) {
      setPreviewOpen(false);
      Alert.alert("Nothing to create", "All occurrences were skipped.");
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.from("bookings").insert(toInsert);
      if (error) throw error;
      setPreviewOpen(false);
      await load();
      const skipped = previewItems.length - toInsert.length;
      const barberName = BARBER_MAP[selectedBarber.id]?.name ?? selectedBarber.id;
      Alert.alert("Created", `Added ${toInsert.length} with ${barberName}${skipped ? ` • Skipped ${skipped}` : ""}`);
    } catch (e: any) {
      console.error(e);
      Alert.alert("Create failed", e?.message ?? String(e));
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
    const serviceList = SERVICES.map((s) => `${s.name} (${s.minutes}m)`).join(", ");
    const barberList = BARBERS.map((b) => b.name).join(", ");
    const bookingLines = bookings.slice(0, 6).map((b) => {
      const serviceName = b.service === "cut" ? "Cut" : "Cut & Shave";
      const barberName = BARBER_MAP[b.barber]?.name ?? b.barber;
      const customerName = b._customer
        ? ` for ${b._customer.first_name}${b._customer.last_name ? ` ${b._customer.last_name}` : ""}`
        : "";
      return `${humanDate(b.date)} ${b.start}–${b.end} • ${serviceName} • ${barberName}${customerName}`;
    });

    let summary = `Hours: ${pad(openingHour)}:00–${pad(closingHour)}:00\nServices: ${serviceList}\nBarbers: ${barberList}`;
    if (bookingLines.length) {
      summary += `\nBookings:\n${bookingLines.join("\n")}`;
      if (bookings.length > bookingLines.length) {
        const remaining = bookings.length - bookingLines.length;
        summary += `\n…and ${remaining} more booking${remaining === 1 ? "" : "s"}.`;
      }
    } else {
      summary += "\nBookings: none scheduled yet.";
    }
    return summary;
  }, [bookings]);

  const assistantSystemPrompt = useMemo(() => {
    const serviceLines = SERVICES.map((s) => `• ${s.name} (${s.minutes} minutes)`).join("\n");
    const barberLines = BARBERS.map((b) => `• ${b.name}`).join("\n");
    const bookingLines = bookings
      .map((b) => {
        const serviceName = b.service === "cut" ? "Cut" : "Cut & Shave";
        const barberName = BARBER_MAP[b.barber]?.name ?? b.barber;
        const customerName = b._customer
          ? ` for ${b._customer.first_name}${b._customer.last_name ? ` ${b._customer.last_name}` : ""}`
          : "";
        return `${humanDate(b.date)} ${b.start}–${b.end} • ${serviceName} • ${barberName}${customerName}`;
      })
      .slice(0, 12)
      .join("\n");

    const existingBookings = bookingLines || "(No bookings are currently scheduled.)";

    return [
      "You are AIBarber, an assistant that helps manage a barbershop booking agenda.",
      `Opening hours: ${pad(openingHour)}:00 to ${pad(closingHour)}:00.`,
      "Services:",
      serviceLines,
      "Barbers:",
      barberLines,
      "Existing bookings:",
      existingBookings,
      "When the user asks to schedule, gather the service, barber, date, and preferred time before making suggestions.",
      "Recommend options that do not overlap with the listed bookings and explain any conflicts you find.",
      "Always remind the user that you cannot save bookings yourself and that they must confirm inside the app's Bookings screen.",
    ].join("\n");
  }, [bookings]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={styles.navBar}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <MaterialCommunityIcons name="content-cut" size={22} color="#fff" />
          <Text style={styles.navBrand}>AIBarber</Text>
        </View>
        <View style={styles.navActions}>
          <Pressable
            onPress={() => setActiveScreen("home")}
            style={[styles.navItem, activeScreen === "home" && styles.navItemActive]}
            accessibilityRole="button"
            accessibilityLabel="Go to overview"
          >
            <MaterialCommunityIcons
              name="view-dashboard-outline"
              size={18}
              color={activeScreen === "home" ? COLORS.accentFgOn : COLORS.subtext}
            />
            <Text style={[styles.navItemText, activeScreen === "home" && styles.navItemTextActive]}>Overview</Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveScreen("booking")}
            style={[styles.navItem, activeScreen === "booking" && styles.navItemActive]}
            accessibilityRole="button"
            accessibilityLabel="Go to bookings"
          >
            <MaterialCommunityIcons
              name="calendar-clock"
              size={18}
              color={activeScreen === "booking" ? COLORS.accentFgOn : COLORS.subtext}
            />
            <Text style={[styles.navItemText, activeScreen === "booking" && styles.navItemTextActive]}>Bookings</Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveScreen("assistant")}
            style={[styles.navItem, activeScreen === "assistant" && styles.navItemActive]}
            accessibilityRole="button"
            accessibilityLabel="Open the AI assistant"
          >
            <Ionicons
              name="sparkles-outline"
              size={18}
              color={activeScreen === "assistant" ? COLORS.accentFgOn : COLORS.subtext}
            />
            <Text style={[styles.navItemText, activeScreen === "assistant" && styles.navItemTextActive]}>Assistant</Text>
          </Pressable>
        </View>
      </View>

      {activeScreen === "booking" ? (
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

          {/* Service chips */}
          <View style={styles.chipsRow}>
            {SERVICES.map((s) => {
              const active = s.id === selectedService.id;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => setSelectedService(s)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <MaterialCommunityIcons name={s.icon} size={16} color={active ? COLORS.accentFgOn : COLORS.subtext} />
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {s.name} · {s.minutes}m
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Client picker (novo, antes do barbeiro) */}
          <View style={{ marginTop: 12, gap: 8 }}>
            <Text style={{ color: COLORS.subtext, fontWeight: "800", fontSize: 12 }}>Client</Text>
            <View style={[styles.cardRow, { borderColor: COLORS.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: COLORS.text, fontWeight: "800" }}>
                  {selectedCustomer ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}` : "No client selected"}
                </Text>
                {selectedCustomer?.phone ? (
                  <Text style={{ color: COLORS.subtext, fontSize: 12 }}>
                    {selectedCustomer.phone} · {selectedCustomer.email ?? ""}
                  </Text>
                ) : null}
              </View>
              <Pressable onPress={() => setClientModalOpen(true)} style={[styles.smallBtn, { borderColor: COLORS.accent, backgroundColor: COLORS.accent }]}>
                <Text style={{ color: COLORS.accentFgOn, fontWeight: "900" }}>{selectedCustomer ? "Change" : "Select"}</Text>
              </Pressable>
            </View>
          </View>

          {/* Barber selector (desabilita se não houver cliente) */}
          <View style={{ marginTop: 12, opacity: selectedCustomer ? 1 : 0.6 }}>
            <Text style={styles.sectionLabel}>Escolha o barbeiro</Text>
            <BarberSelector
              selected={selectedBarber}
              onChange={setSelectedBarber}
              disabled={!selectedCustomer}
            />
          </View>
        </View>

        {/* Content */}
        <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {/* Date selector */}
          <Text style={styles.sectionLabel}>Pick a day</Text>
          <DateSelector
            value={day}
            onChange={setDay}
            colors={{ text: COLORS.text, subtext: COLORS.subtext, surface: COLORS.surface, border: COLORS.border, accent: COLORS.accent }}
          />

          {/* Slots */}
          <Text style={styles.sectionLabel}>Available slots · {humanDate(dateKey)}</Text>
          <View style={styles.card}>
          <View style={styles.grid}>
    {allSlots.map((t) => {
      const isAvailable = availableSlots.includes(t);
      const isSelected = selectedSlot === t;

      if (!isAvailable) {
        const conflict = bookings.find(
          (b) =>
            b.barber === selectedBarber.id &&
            overlap(t, addMinutes(t, selectedService.minutes), b.start, b.end)
        );
        return (
          <Pressable
            key={t}
            onPress={() =>
              Alert.alert(
                "Já ocupado",
                conflict
                  ? `${conflict.service === "cut" ? "Cut" : "Cut & Shave"} com ${
                      BARBER_MAP[conflict.barber]?.name
                    } • ${conflict.start}–${conflict.end}`
                  : "Este horário não está disponível."
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


            {/* Resumo fixo */}
            {selectedSlot && (
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
                    Alert.alert("Select a time", "Choose an available slot first.");
                    return;
                  }
                  await book(selectedSlot);
                  setSelectedSlot(null);
                }}
                disabled={!selectedSlot || loading || !selectedCustomer}
                style={[styles.bookBtn, (!selectedSlot || loading || !selectedCustomer) && styles.bookBtnDisabled]}
                accessibilityRole="button"
                accessibilityLabel="Book service"
              >
                <Text style={styles.bookBtnText}>Book service</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  if (!selectedSlot) {
                    Alert.alert("Select a time", "Choose an available slot first.");
                    return;
                  }
                  if (!selectedCustomer) {
                    Alert.alert("Select client", "Choose/create a client first.");
                    return;
                  }
                  setRecurrenceOpen(true);
                }}
                style={[styles.bookBtn, (!selectedSlot || loading || !selectedCustomer) && styles.bookBtnDisabled, { flexDirection: "row", alignItems: "center" }]}
                accessibilityRole="button"
                accessibilityLabel="Open recurrence"
              >
                <Ionicons name="repeat" size={16} color={COLORS.accentFgOn} />
                <Text style={[styles.bookBtnText, { marginLeft: 6 }]}>Repeat…</Text>
              </Pressable>
            </View>
          </View>

          {/* Bookings */}
          <Text style={styles.sectionLabel}>Your bookings</Text>
          <View style={{ gap: 10 }}>
            {bookings.length === 0 ? (
              <View style={styles.card}><Text style={styles.empty}>— none yet —</Text></View>
            ) : (
              bookings.map((b) => {
                const svc = b.service === "cut" ? "Cut" : "Cut & Shave";
                const barber = BARBER_MAP[b.barber] ?? { name: b.barber, icon: "account" as const };
                return (
                  <View key={b.id} style={styles.bookingCard}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <MaterialCommunityIcons name={b.service === "cut" ? "content-cut" : "razor-double-edge"} size={20} color="#93c5fd" />
                      <MaterialCommunityIcons name={barber.icon} size={18} color="#cbd5e1" />
                      <Text style={styles.bookingText}>
                        {svc} • {b.start}–{b.end} • {barber.name}
                        {b._customer ? ` • ${b._customer.first_name}` : ""}
                      </Text>
                    </View>
                    <Pressable onPress={() => onCancel(b.id)} style={styles.cancelBtn}>
                      <Ionicons name="trash-outline" size={16} color="#fecaca" />
                      <Text style={styles.cancelText}>Cancel</Text>
                    </Pressable>
                  </View>
                );
              })
            )}
          </View>

          <Text style={styles.note}>Tip: selecione/crie o cliente antes do barbeiro; conflitos são por barbeiro.</Text>
        </ScrollView>

        {/* Modals: Recorrência e Preview (mantidos) */}
        <RecurrenceModal
          visible={recurrenceOpen}
          onClose={() => setRecurrenceOpen(false)}
          onSubmit={handleRecurrenceSubmit}
          fixedDate={day}
          fixedTime={selectedSlot || "00:00"}
          fixedService={selectedService.name}
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
        />

          {loading && (
            <View style={styles.loadingOverlay} pointerEvents="none">
              <ActivityIndicator size="large" />
            </View>
          )}
      </>
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
      />
    ) : (
      <View style={styles.defaultScreen}>
        <MaterialCommunityIcons name="calendar-month-outline" size={48} color={COLORS.accent} />
        <Text style={styles.defaultTitle}>Welcome to AIBarber</Text>
        <Text style={styles.defaultSubtitle}>
          Keep track of your barbershop schedule and manage recurring bookings with ease.
        </Text>
        <Pressable
          onPress={() => setActiveScreen("booking")}
          style={styles.defaultCta}
          accessibilityRole="button"
          accessibilityLabel="Open the booking screen"
        >
          <Text style={styles.defaultCtaText}>Start booking</Text>
        </Pressable>
      </View>
    )}
  </View>
);
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
}: {
  visible: boolean;
  onClose: () => void;
  customers: Customer[];
  loading: boolean;
  onRefreshQuery: (q: string) => void;
  onPick: (c: Customer) => void;
  onSaved: (c: Customer) => void;
}) {
  const [tab, setTab] = useState<"list" | "create">("list");
  const [query, setQuery] = useState("");

  useEffect(() => { if (visible) { setTab("list"); setQuery(""); } }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: "#0c1017", borderColor: COLORS.border }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: COLORS.text, fontWeight: "900", fontSize: 16 }}>Select client</Text>
            <Pressable onPress={onClose}><Ionicons name="close" size={22} color={COLORS.subtext} /></Pressable>
          </View>

          {/* Tabs */}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable onPress={() => setTab("list")}
              style={[styles.tab, tab === "list" && { backgroundColor: COLORS.accent, borderColor: COLORS.accent }]}>
              <Text style={[styles.tabText, tab === "list" && { color: COLORS.accentFgOn }]}>Existing</Text>
            </Pressable>
            <Pressable onPress={() => setTab("create")}
              style={[styles.tab, tab === "create" && { backgroundColor: COLORS.accent, borderColor: COLORS.accent }]}>
              <Text style={[styles.tabText, tab === "create" && { color: COLORS.accentFgOn }]}>Create</Text>
            </Pressable>
          </View>

          {tab === "list" ? (
            <View style={{ gap: 10 }}>
              {Platform.OS === "web" && (
                <input
                  placeholder="Search name / email / phone"
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
                <Text style={{ color: COLORS.subtext, fontWeight: "800" }}>Search</Text>
              </Pressable>

              <View style={[styles.card, { gap: 6 }]}>
                {loading ? <ActivityIndicator /> : customers.length === 0 ? (
                  <Text style={{ color: COLORS.subtext }}>No results.</Text>
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
  navBar: {
    paddingTop: Platform.select({ ios: 52, android: 40, default: 24 }),
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: "#11151c",
    backgroundColor: "#0c1017",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  navBrand: { color: "#fff", fontSize: 18, fontWeight: "800", letterSpacing: 0.3 },
  navActions: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ffffff12",
    backgroundColor: "rgba(255,255,255,0.045)",
  },
  navItemActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  navItemText: { color: COLORS.subtext, fontWeight: "700" },
  navItemTextActive: { color: COLORS.accentFgOn },

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
  chip: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: "#ffffff12", backgroundColor: "rgba(255,255,255,0.045)", ...(SHADOW as object) },
  chipActive: { backgroundColor: "#60a5fa", borderColor: "#60a5fa" },
  chipText: { color: "#cbd5e1", fontWeight: "700" },
  chipTextActive: { color: "#091016", fontWeight: "800" },

  container: { padding: 16, gap: 14 },
  sectionLabel: { color: "#e5e7eb", fontSize: 14, fontWeight: "700", letterSpacing: 0.3, marginTop: 8 },

  card: { backgroundColor: "rgba(255,255,255,0.045)", borderRadius: 18, borderWidth: 1, borderColor: "#ffffff12", padding: 12, ...(SHADOW as object) },
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
});
