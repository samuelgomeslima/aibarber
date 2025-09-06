import React, { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from "react-native";

type Service = { id: "cut" | "cutshave"; name: string; minutes: number };
type Booking = { date: string; start: string; end: string; serviceId: Service["id"] };

const SERVICES: Service[] = [
  { id: "cut", name: "Cut", minutes: 30 },
  { id: "cutshave", name: "Cut & Shave", minutes: 60 },
];

const openingHour = 9;  // 09:00
const closingHour = 18; // 18:00

function toDateKey(d: Date) {
  // YYYY-MM-DD
  return d.toISOString().slice(0, 10);
}
function pad(n: number) {
  return n.toString().padStart(2, "0");
}
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
  return Math.max(aS, bS) < Math.min(aE, bE); // true if intervals intersect
}

export default function App() {
  const [selectedService, setSelectedService] = useState<Service>(SERVICES[0]);
  const [day, setDay] = useState<Date>(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);

  const dateKey = toDateKey(day);
  const todaysBookings = useMemo(
    () => bookings.filter(b => b.date === dateKey),
    [bookings, dateKey]
  );

  const allSlots = useMemo(() => {
    // slots every 30 minutes from opening to closing
    const start = openingHour * 60;
    const end = closingHour * 60;
    const slots: string[] = [];
    for (let t = start; t <= end - 30; t += 30) {
      slots.push(minutesToTime(t));
    }
    return slots;
  }, []);

  const availableSlots = useMemo(() => {
    // Filter out slots that would overlap with existing bookings for the day
    return allSlots.filter(start => {
      const end = addMinutes(start, selectedService.minutes);

      // must finish by closing time
      if (timeToMinutes(end) > closingHour * 60) return false;

      // avoid overlaps
      const conflict = todaysBookings.some(b => overlap(start, end, b.start, b.end));
      return !conflict;
    });
  }, [allSlots, todaysBookings, selectedService]);

  const book = (start: string) => {
    const end = addMinutes(start, selectedService.minutes);
    setBookings(prev => [...prev, { date: dateKey, start, end, serviceId: selectedService.id }]);
    Alert.alert("Booked!", `${selectedService.name} at ${start} on ${dateKey}`);
  };

  const cancelBooking = (i: number) => {
    setBookings(prev => prev.filter((_, idx) => idx !== i));
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
            style={[
              styles.pill,
              selectedService.id === s.id && styles.pillActive
            ]}
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
        <View style={styles.dateBox}>
          <Text style={styles.dateText}>{dateKey}</Text>
        </View>
        <Pressable style={styles.btn} onPress={() => changeDay(1)}>
          <Text style={styles.btnText}>Next ▶︎</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>3) Available slots</Text>
      <View style={styles.grid}>
        {availableSlots.length === 0 && (
          <Text style={styles.muted}>No free slots. Try another day/service.</Text>
        )}
        {availableSlots.map(t => (
          <Pressable key={t} style={styles.slot} onPress={() => book(t)}>
            <Text style={styles.slotText}>{t}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Your bookings for {dateKey}</Text>
      {todaysBookings.length === 0 ? (
        <Text style={styles.muted}>— none yet —</Text>
      ) : (
        todaysBookings.map((b, i) => (
          <View key={`${b.start}-${i}`} style={styles.bookingRow}>
            <Text style={styles.bookingText}>
              {SERVICES.find(s => s.id === b.serviceId)?.name} • {b.start}–{b.end}
            </Text>
            <Pressable onPress={() => cancelBooking(i)} style={styles.cancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        ))
      )}
      <Text style={styles.smallNote}>
        Demo note: bookings are in-memory. For production, add an API + DB (Azure Functions + Cosmos DB) and persist them.
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
