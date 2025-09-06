import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import { supabase } from "./lib/supabase";

type Service = { id: "cut" | "cutshave"; name: string; minutes: number };
type DbBooking = {
  id: string;
  date: string;   // 'YYYY-MM-DD'
  start: string;  // 'HH:MM'
  end: string;    // 'HH:MM'
  service: "cut" | "cutshave";
};

const SERVICES: Service[] = [
  { id: "cut", name: "Cut", minutes: 30 },
  { id: "cutshave", name: "Cut & Shave", minutes: 60 },
];

const openingHour = 9;
const closingHour = 18;

function toDateKey(d: Date) {
  // local date to YYYY-MM-DD
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function pad(n: number) { return n.toString().padStart(2, "0"); }
function minutesToTime(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${pad(h)}:${pad(m)}`;
}
function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function addMinutes(t: string, minutes: number) {
  return minutesToTime(timeToMinutes(t) + minutes);
}
function overlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  const aS = timeToMinutes(aStart), aE = timeToMinutes(aEnd);
  const bS = timeToMinutes(bStart), bE = timeToMinutes(bEnd);
  return Math.max(aS, bS) < Math.min(aE, bE);
}

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

export default function App() {
  const [selectedService, setSelectedService] = useState<Service>(SERVICES[0]);
  const [day, setDay] = useState<Date>(new Date());
  const dateKey = toDateKey(day);

  const [bookings, setBookings] = useState<DbBooking[]>([]);
  const [loading, setLoading] = useState(false);

  // >>> Load on mount and whenever the day changes
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        const rows = await getBookings(dateKey);
        if (!ignore) setBookings(rows);
      } catch (err: any) {
        Alert.alert("Load failed", err.message ?? String(err));
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [dateKey]);

  const allSlots = useMemo(() => {
    const start = openingHour * 60;
    const end = closingHour * 60;
    const slots: string[] = [];
    for (let t = start; t <= end - 30; t += 30) slots.push(minutesToTime(t));
    return slots;
  }, []);

  // derive available slots from DB bookings
  const availableSlots = useMemo(() => {
    return allSlots.filter(start => {
      const end = addMinutes(start, selectedService.minutes);
      if (timeToMinutes(end) > closingHour * 60) return false;
      const conflict = bookings.some(b => overlap(start, end, b.start, b.end));
      return !conflict;
    });
  }, [allSlots, bookings, selectedService]);

  // >>> Create on free-slot click
  const book = async (start: string) => {
    const end = addMinutes(start, selectedService.minutes);
    try {
      setLoading(true);
      await createBooking(dateKey, start, end, selectedService.id);
      const rows = await getBookings(dateKey); // refresh
      setBookings(rows);
      Alert.alert("Booked!", `${selectedService.name} at ${start} on ${dateKey}`);
    } catch (err: any) {
      Alert.alert("Booking failed", err.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  // >>> Cancel by id
  const onCancel = async (id: string) => {
    try {
      setLoading(true);
      await cancelBooking(id);
      setBookings(prev => prev.filter(b => b.id !== id));
    } catch (err: any) {
      Alert.alert("Cancel failed", err.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  const changeDay = (delta: number) => {
    const d = new Date(day);
    d.setDate(d.getDate() + delta);
    setDay(d);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.h1}>Barber Scheduler</Text>

      <Text style={styles.label}>1) Choose service</Text>
      <View style={styles.row}>
        {SERVICES.map(s => (
          <Pressable
            key={s.id}
            onPress={() => setSelectedService(s)}
            style={[styles.pill, selectedService.id === s.id && styles.pillActive]}
          >
            <Text style={[styles.pillText, selectedService.id === s.id && styles.pillTextActive]}>
              {s.name} ({s.minutes} min)
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>2) Pick a day</Text>
      <View style={styles.row}>
        <Pressable style={styles.btn} onPress={() => changeDay(-1)}>
          <Text style={styles.btnText}>◀︎ Previous</Text>
        </Pressable>
        <View style={styles.dateBox}><Text style={styles.dateText}>{dateKey}</Text></View>
        <Pressable style={styles.btn} onPress={() => changeDay(1)}>
          <Text style={styles.btnText}>Next ▶︎</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>3) Available slots</Text>
      {loading && <ActivityIndicator />}
      <View style={styles.grid}>
        {availableSlots.length === 0 && !loading && (
          <Text style={styles.muted}>No free slots. Try another day/service.</Text>
        )}
        {availableSlots.map(t => (
          <Pressable key={t} style={styles.slot} onPress={() => book(t)}>
            <Text style={styles.slotText}>{t}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Bookings for {dateKey}</Text>
      {bookings.length === 0 ? (
        <Text style={styles.muted}>— none yet —</Text>
      ) : (
        bookings.map((b) => (
          <View key={b.id} style={styles.bookingRow}>
            <Text style={styles.bookingText}>
              {b.service === "cut" ? "Cut" : "Cut & Shave"} • {b.start}–{b.end}
            </Text>
            <Pressable onPress={() => onCancel(b.id)} style={styles.cancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        ))
      )}

      <Text style={styles.smallNote}>
        Bookings are persisted in Supabase. Make sure your `bookings` table and RLS policies are set as described earlier.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  h1: { fontSize: 28, fontWeight: "700", marginBottom: 8 },
  label: { fontSize: 16, fontWeight: "600", marginTop: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  pill: { borderWidth: 1, borderColor: "#bbb", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999 },
  pillActive: { backgroundColor: "#222" },
  pillText: { fontSize: 14, color: "#222" },
  pillTextActive: { color: "#fff" },
  btn: { borderWidth: 1, borderColor: "#bbb", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  btnText: { fontSize: 14 },
  dateBox: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "#f3f3f3" },
  dateText: { fontSize: 16, fontWeight: "600" },
  slot: { borderWidth: 1, borderColor: "#bbb", borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12 },
  slotText: { fontSize: 14, fontWeight: "600" },
  muted: { color: "#777", marginTop: 6 },
  bookingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderColor: "#eee" },
  bookingText: { fontSize: 15 },
  cancel: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: "#e11" },
  cancelText: { color: "#e11", fontWeight: "700" },
  smallNote: { color: "#666", fontSize: 12, marginTop: 8 }
});
