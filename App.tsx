import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator, RefreshControl, Platform } from "react-native";
import { supabase } from "./src/lib/supabase";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

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

/** ========== Data layer (adjust if you already have data.ts) ========== */
type DbBooking = { id: string; date: string; start: string; end: string; service: "cut" | "cutshave" };

/** ---- Supabase data helpers ---- */
async function getBookings(dateKey: string) {
  const { data, error, status } = await supabase
    .from('bookings')
    .select('id,date,start,"end",service')
    .eq('date', dateKey)
    .order('start');
  console.log('[getBookings]', { dateKey, status, data, error });
  if (error) throw error;
  return data ?? [];
}

async function createBooking(dateKey: string, start: string, end: string, service: 'cut'|'cutshave') {
  const payload = { date: dateKey, start, end, service };
  const { data, error, status } = await supabase
    .from('bookings')
    .insert(payload)
    .select('id');
  console.log('[createBooking]', { payload, status, data, error });
  if (error) throw error;
}

async function cancelBooking(id: string) {
  const { data, error, status } = await supabase
    .from('bookings')
    .delete()
    .eq('id', id);
  console.log('[cancelBooking]', { id, status, data, error });
  if (error) throw error;
}
/** -------------------------------- */

/** ========== App (modern styling) ========== */
export default function App() {
  const [selectedService, setSelectedService] = useState<Service>(SERVICES[0]);
  const [day, setDay] = useState<Date>(new Date());
  const dateKey = toDateKey(day);

  const [bookings, setBookings] = useState<DbBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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

  const allSlots = useMemo(() => {
    const start = openingHour * 60, end = closingHour * 60;
    const slots: string[] = [];
    for (let t = start; t <= end - 30; t += 30) slots.push(minutesToTime(t));
    return slots;
  }, []);

  const availableSlots = useMemo(() => {
    const safe = Array.isArray(bookings) ? bookings : [];
    return allSlots.filter(start => {
      const end = addMinutes(start, selectedService.minutes);
      if (timeToMinutes(end) > closingHour * 60) return false;
      return !safe.some(b => overlap(start, end, b.start, b.end));
    });
  }, [allSlots, bookings, selectedService]);

  const book = async (start: string) => {
    const end = addMinutes(start, selectedService.minutes);
    try {
      setLoading(true);
      await createBooking(dateKey, start, end, selectedService.id);
      await load();
      Alert.alert("Booked!", `${selectedService.name} at ${start} • ${humanDate(dateKey)}`);
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
      setBookings(prev => prev.filter(b => b.id !== id));
    } catch (e: any) {
      console.error(e);
      Alert.alert("Cancel failed", e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  /** Build a 10-day strip centered around current selection */
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
          {SERVICES.map(s => {
            const active = s.id === selectedService.id;
            return (
              <Pressable
                key={s.id}
                onPress={() => setSelectedService(s)}
                style={[styles.chip, active && styles.chipActive]}
                accessibilityRole="button"
                accessibilityLabel={`Service ${s.name}`}
              >
                <MaterialCommunityIcons
                  name={s.icon}
                  size={16}
                  color={active ? COLORS.accentFgOn : COLORS.subtext}
                />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {s.name} · {s.minutes}m
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Date strip */}
        <Text style={styles.sectionLabel}>Pick a day</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayStrip}>
          {days.map(({ d, key }) => {
            const active = key === dateKey;
            return (
              <Pressable
                key={key}
                onPress={() => setDay(d)}
                style={[styles.dayPill, active && styles.dayPillActive]}
                accessibilityRole="button"
                accessibilityLabel={`Select ${d.toDateString()}`}
              >
                <Text style={[styles.dayDow, active && styles.dayPillActiveText]}>
                  {d.toLocaleDateString(undefined, { weekday: "short" })}
                </Text>
                <Text style={[styles.dayNum, active && styles.dayPillActiveText]}>{d.getDate()}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Slots */}
        <Text style={styles.sectionLabel}>Available slots · {humanDate(dateKey)}</Text>
        <View style={styles.card}>
          <View style={styles.grid}>
            {availableSlots.length === 0 && !loading && (
              <Text style={styles.empty}>No free slots. Try another day/service.</Text>
            )}
            {availableSlots.map(t => (
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
            bookings.map(b => (
              <View key={b.id} style={styles.bookingCard}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <MaterialCommunityIcons
                    name={b.service === "cut" ? "content-cut" : "razor-double-edge"}
                    size={20}
                    color="#93c5fd"
                  />
                  <Text style={styles.bookingText}>
                    {b.service === "cut" ? "Cut" : "Cut & Shave"} • {b.start}–{b.end}
                  </Text>
                </View>
                <Pressable onPress={() => onCancel(b.id)} style={styles.cancelBtn} accessibilityLabel="Cancel booking">
                  <Ionicons name="trash-outline" size={16} color="#fecaca" />
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>

        <Text style={styles.note}>Tip: keep backend secrets server-side; the app calls /api.</Text>
      </ScrollView>

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
  badgeText: { color: COLORS.subtext, fontSize: 12, fontWeight: "600" },

  chipsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  chip: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, ...(SHADOW as object) },
  chipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  chipText: { color: COLORS.subtext, fontWeight: "700" },
  chipTextActive: { color: COLORS.accentFgOn, fontWeight: "800" },

  container: { padding: 16, gap: 14 },
  sectionLabel: { color: COLORS.text, fontSize: 14, fontWeight: "700", letterSpacing: 0.3, marginTop: 8 },

  dayStrip: { gap: 10, paddingVertical: 10 },
  dayPill: { width: 72, paddingVertical: 10, borderRadius: 14, alignItems: "center", borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  dayPillActive: { backgroundColor: "#111827", borderColor: COLORS.accent },
  dayDow: { color: COLORS.subtext, fontSize: 12, fontWeight: "700" },
  dayNum: { color: COLORS.text, fontSize: 18, fontWeight: "800" },
  dayPillActiveText: { color: COLORS.text },

  card: { backgroundColor: COLORS.surface, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, padding: 12, ...(SHADOW as object) },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  slot: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.03)" },
  slotPressed: { opacity: 0.7 },
  slotText: { color: COLORS.text, fontWeight: "700" },
  empty: { color: COLORS.subtext, padding: 6 },

  bookingCard: { borderRadius: 16, padding: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: "rgba(255,255,255,0.035)", flexDirection: "row", alignItems: "center", justifyContent: "space-between", ...(SHADOW as object) },
  bookingText: { color: COLORS.text, fontSize: 15, fontWeight: "700" },
  cancelBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: "rgba(239,68,68,0.35)", backgroundColor: "rgba(239,68,68,0.1)" },
  cancelText: { color: "#fecaca", fontWeight: "800" },

  note: { color: "#94a3b8", fontSize: 12, marginTop: 8 },

  loadingOverlay: { position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.15)" },
});