import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator, RefreshControl, Platform } from "react-native";
import { supabase } from "./src/lib/supabase";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

/* Components */
import DateSelector from "./src/components/DateSelector";
import RecurrenceModal from "./src/components/RecurrenceModal";
import OccurrencePreviewModal, { PreviewItem } from "./src/components/OccurrencePreviewModal";
import BarberSelector, { Barber } from "./src/components/BarberSelector";

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

/** ========== Barbers (mesma lista do componente, para exibir nome/ícone na lista) ========== */
const BARBERS: Barber[] = [
  { id: "joao", name: "João", icon: "account" },
  { id: "maria", name: "Maria", icon: "account-outline" },
  { id: "carlos", name: "Carlos", icon: "account-tie" },
];
const BARBER_MAP = Object.fromEntries(BARBERS.map(b => [b.id, b]));

/** ========== Data layer ========== */
type DbBooking = { id: string; date: string; start: string; end: string; service: "cut" | "cutshave"; barber: string };

async function getBookings(dateKey: string) {
  const { data, error, status } = await supabase
    .from("bookings")
    .select('id,date,start,"end",service,barber')
    .eq("date", dateKey)
    .order("start");
  console.log("[getBookings]", { dateKey, status, data, error });
  if (error) throw error;
  return data ?? [];
}

async function createBooking(dateKey: string, start: string, end: string, service: "cut" | "cutshave", barber: string) {
  const payload = { date: dateKey, start, end, service, barber };
  const { data, error, status } = await supabase
    .from("bookings")
    .insert(payload)
    .select("id");
  console.log("[createBooking]", { payload, status, data, error });
  if (error) throw error;
}

async function cancelBooking(id: string) {
  const { data, error, status } = await supabase.from("bookings").delete().eq("id", id);
  console.log("[cancelBooking]", { id, status, data, error });
  if (error) throw error;
}

/** Weekly recurrence generator (single weekday, weekly interval = 1) */
function generateWeeklyOccurrences(opts: {
  startFrom: Date;
  weekday: number;
  time: string;
  count: number;
}) {
  const { startFrom, weekday, time, count } = opts;
  const [hh, mm] = time.split(":").map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return [];

  const first = new Date(startFrom);
  first.setHours(0, 0, 0, 0);
  const delta = (weekday - first.getDay() + 7) % 7;
  first.setDate(first.getDate() + delta);
  first.setHours(hh, mm, 0, 0);

  const out: { date: string; start: string }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(first);
    d.setDate(first.getDate() + i * 7);
    out.push({ date: toDateKey(d), start: `${pad(hh)}:${pad(mm)}` });
  }
  return out;
}

/** ========== App ========== */
export default function App() {
  const [selectedService, setSelectedService] = useState<Service>(SERVICES[0]);
  const [selectedBarber, setSelectedBarber] = useState<Barber>(BARBERS[0]);

  const [day, setDay] = useState<Date>(new Date());
  const dateKey = toDateKey(day);

  const [bookings, setBookings] = useState<DbBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [recurrenceOpen, setRecurrenceOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);

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

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const allSlots = useMemo(() => {
    const start = openingHour * 60,
      end = closingHour * 60;
    const slots: string[] = [];
    for (let t = start; t <= end - 30; t += 30) slots.push(minutesToTime(t));
    return slots;
  }, []);

  const availableSlots = useMemo(() => {
    const safe = Array.isArray(bookings) ? bookings : [];
    return allSlots.filter((start) => {
      const end = addMinutes(start, selectedService.minutes);
      if (timeToMinutes(end) > closingHour * 60) return false;
      // Bloqueia se houver conflito com QUALQUER barbeiro? Não.
      // Aqui o conflito deve considerar o mesmo barbeiro selecionado:
      return !safe.some((b) => b.barber === selectedBarber.id && overlap(start, end, b.start, b.end));
    });
  }, [allSlots, bookings, selectedService, selectedBarber]);

  const book = async (start: string) => {
    const end = addMinutes(start, selectedService.minutes);
    try {
      setLoading(true);
      await createBooking(dateKey, start, end, selectedService.id, selectedBarber.id);
      await load();
      const barberName = BARBER_MAP[selectedBarber.id]?.name ?? selectedBarber.id;
      Alert.alert("Booked!", `${selectedService.name} with ${barberName} at ${start} • ${humanDate(dateKey)}`);
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

  async function handleRecurrenceSubmit(opts: { weekday: number; time: string; count: number; startFrom: Date }) {
    const minutes = selectedService.minutes;
    const raw = generateWeeklyOccurrences({
      startFrom: opts.startFrom,
      weekday: opts.weekday,
      time: opts.time,
      count: opts.count,
    }).map((o) => ({ date: o.date, start: o.start, end: addMinutes(o.start, minutes) }));

    if (raw.length === 0) {
      Alert.alert("Nothing to preview", "Check the weekday/time/start date.");
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
        if (timeToMinutes(r.end) > closingHour * 60) {
          return { ...r, ok: false, reason: "outside-hours" };
        }
        const dayRows = byDate.get(r.date) ?? [];
        // Conflito deve considerar o MESMO barbeiro
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
    const toInsert = previewItems
      .filter((i) => i.ok)
      .map((i) => ({ date: i.date, start: i.start, end: i.end, service: selectedService.id as "cut" | "cutshave", barber: selectedBarber.id }));

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

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
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

        {/* Repeat button */}
        <View style={{ flexDirection: "row", justifyContent: "flex-start", marginTop: 12 }}>
          <Pressable
            onPress={() => setRecurrenceOpen(true)}
            style={[styles.chip, { borderColor: COLORS.border, backgroundColor: COLORS.surface }]}
          >
            <Ionicons name="repeat" size={16} color={COLORS.subtext} />
            <Text style={styles.chipText}>Repeat…</Text>
          </Pressable>
        </View>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Barber selector */}
        <Text style={styles.sectionLabel}>Escolha o barbeiro</Text>
        <BarberSelector selected={selectedBarber} onChange={setSelectedBarber} />

        {/* Date selector */}
        <Text style={styles.sectionLabel}>Pick a day</Text>
        <DateSelector value={day} onChange={setDay} colors={{ text: COLORS.text, subtext: COLORS.subtext, surface: COLORS.surface, border: COLORS.border, accent: COLORS.accent }} />

        {/* Slots */}
        <Text style={styles.sectionLabel}>Available slots · {humanDate(dateKey)}</Text>
        <View style={styles.card}>
          <View style={styles.grid}>
            {availableSlots.length === 0 && !loading && <Text style={styles.empty}>No free slots. Try another day/service.</Text>}
            {availableSlots.map((t) => (
              <Pressable key={t} style={({ pressed }) => [styles.slot, pressed && styles.slotPressed]} onPress={() => book(t)}>
                <Ionicons name="time-outline" size={16} color={COLORS.subtext} />
                <Text style={styles.slotText}>{t}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Bookings */}
        <Text style={styles.sectionLabel}>Your bookings</Text>
        <View style={{ gap: 10 }}>
          {bookings.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.empty}>— none yet —</Text>
            </View>
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

        <Text style={styles.note}>Tip: cada barbeiro tem agenda independente; conflitos são verificados por barbeiro.</Text>
      </ScrollView>

      {/* Modals */}
      <RecurrenceModal
        visible={recurrenceOpen}
        onClose={() => setRecurrenceOpen(false)}
        onSubmit={handleRecurrenceSubmit}
        initialDate={day}
        colors={{ text: COLORS.text, subtext: COLORS.subtext, surface: COLORS.surface, border: COLORS.border, accent: COLORS.accent, bg: "#0c1017" }}
      />
      <OccurrencePreviewModal
        visible={previewOpen}
        items={previewItems}
        onClose={() => setPreviewOpen(false)}
        onConfirm={confirmPreviewInsert}
        colors={{ text: COLORS.text, subtext: COLORS.subtext, surface: COLORS.surface, border: COLORS.border, accent: COLORS.accent, bg: "#0b0d13", danger: COLORS.danger }}
      />

      {loading && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" />
        </View>
      )}
    </View>
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
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: "#11151c", backgroundColor: "#0c1017" },
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
  empty: { color: "#cbd5e1", padding: 6 },

  bookingCard: { borderRadius: 16, padding: 12, borderWidth: 1, borderColor: "#ffffff12", backgroundColor: "rgba(255,255,255,0.035)", flexDirection: "row", alignItems: "center", justifyContent: "space-between", ...(SHADOW as object) },
  bookingText: { color: "#e5e7eb", fontSize: 15, fontWeight: "700" },
  cancelBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: "rgba(239,68,68,0.35)", backgroundColor: "rgba(239,68,68,0.1)" },
  cancelText: { color: "#fecaca", fontWeight: "800" },

  note: { color: "#94a3b8", fontSize: 12, marginTop: 8 },

  loadingOverlay: { position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.15)" },
});
