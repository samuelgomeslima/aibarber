// src/components/RecurrenceModal.tsx
import React, { useEffect, useState } from "react";
import { Modal, View, Text, Pressable, TextInput, StyleSheet, Platform } from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (opts: {
    weekday: number;      // 0..6 (Sun..Sat)
    time: string;         // "HH:MM"
    count: number;        // 1..50
    startFrom: Date;      // chosen start date
  }) => void;
  initialDate?: Date;     // prefill start date (defaults to today)
  colors?: {
    text: string; subtext: string; surface: string; border: string; accent: string; bg: string;
  };
};

const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function pad(n: number) { return n.toString().padStart(2, "0"); }
function toDateKey(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }

export default function RecurrenceModal({
  visible, onClose, onSubmit, initialDate,
  colors = {
    text: "#e5e7eb", subtext: "#cbd5e1", surface: "rgba(255,255,255,0.06)",
    border: "rgba(255,255,255,0.12)", accent: "#60a5fa", bg: "#0b0d13"
  }
}: Props) {
  const [startDate, setStartDate] = useState<Date>(initialDate ?? new Date());
  const [weekday, setWeekday]   = useState<number>((initialDate ?? new Date()).getDay());
  const [time, setTime]         = useState("12:00");
  const [count, setCount]       = useState("10");

  useEffect(() => {
    if (initialDate) {
      setStartDate(initialDate);
      setWeekday(initialDate.getDay());
    }
  }, [initialDate, visible]);

  // ---- Time auto-format while typing: "HH:MM"
  const onTimeChange = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 4);
    if (digits.length <= 2) { setTime(digits); return; }
    setTime(`${digits.slice(0,2)}:${digits.slice(2)}`);
  };
  const onTimeBlur = () => {
    const digits = time.replace(/\D/g, "");
    const hh = clamp(parseInt(digits.slice(0,2) || "0", 10), 0, 23);
    const mm = clamp(parseInt(digits.slice(2,4) || "0", 10), 0, 59);
    setTime(`${pad(hh)}:${pad(mm)}`);
  };

  // ---- Count clamp 1..50
  const onCountChange = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 2); // 2 digits enough (50)
    setCount(digits);
  };
  const onCountBlur = () => {
    const n = clamp(parseInt(count || "1", 10), 1, 50);
    setCount(String(n));
  };

  // ---- Start date controls (±1 day; set to Today)
  const shiftStart = (days: number) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + days);
    setStartDate(d);
  };
  const setToday = () => {
    const d = new Date();
    d.setHours(0,0,0,0);
    setStartDate(d);
    setWeekday(d.getDay());
  };

  const submit = () => {
    const n = clamp(parseInt(count || "1", 10), 1, 50);
    // ensure time normalized
    const digits = time.replace(/\D/g, "");
    const hh = clamp(parseInt(digits.slice(0,2) || "0", 10), 0, 23);
    const mm = clamp(parseInt(digits.slice(2,4) || "0", 10), 0, 59);
    const t  = `${pad(hh)}:${pad(mm)}`;
    onSubmit({ weekday, time: t, count: n, startFrom: startDate });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Repeat booking</Text>

          {/* Start date row */}
          <Text style={[styles.label, { color: colors.subtext }]}>Start date</Text>
          <View style={styles.row}>
            <Pressable style={[styles.smallBtn, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={() => shiftStart(-1)}>
              <Text style={{ color: colors.subtext }}>◀︎</Text>
            </Pressable>
            <View style={[styles.dateBadge, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Text style={{ color: colors.text, fontWeight: "800" }}>
                {startDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
              </Text>
              <Text style={{ color: colors.subtext, fontWeight: "700" }}>{toDateKey(startDate)}</Text>
            </View>
            <Pressable style={[styles.smallBtn, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={() => shiftStart(1)}>
              <Text style={{ color: colors.subtext }}>▶︎</Text>
            </Pressable>
            <Pressable style={[styles.smallBtn, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={setToday}>
              <Text style={{ color: colors.subtext }}>Today</Text>
            </Pressable>
          </View>

          {/* Weekday (single select) */}
          <Text style={[styles.label, { color: colors.subtext }]}>Weekday</Text>
          <View style={styles.row}>
            {WEEKDAYS.map((d, i) => {
              const active = i === weekday;
              return (
                <Pressable
                  key={d}
                  onPress={() => setWeekday(i)} // single select
                  style={[
                    styles.weekPill,
                    { borderColor: colors.border, backgroundColor: colors.surface },
                    active && { backgroundColor: colors.accent, borderColor: colors.accent }
                  ]}
                >
                  <Text style={{ color: active ? "#071018" : colors.text, fontWeight: "800" }}>{d}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Time + Count */}
          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.subtext }]}>Time (HH:MM)</Text>
              <TextInput
                value={time}
                onChangeText={onTimeChange}
                onBlur={onTimeBlur}
                placeholder="12:00"
                placeholderTextColor={colors.subtext}
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                keyboardType={Platform.OS === "web" ? "default" : "numbers-and-punctuation"}
                maxLength={5}
              />
            </View>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.subtext }]}>Count (1–50)</Text>
              <TextInput
                value={count}
                onChangeText={onCountChange}
                onBlur={onCountBlur}
                placeholder="10"
                placeholderTextColor={colors.subtext}
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
          </View>

          {/* Actions */}
          <View style={[styles.row, { justifyContent: "flex-end", gap: 10 }]}>
            <Pressable style={[styles.btn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={{ color: colors.subtext, fontWeight: "700" }}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.btn, { backgroundColor: colors.accent, borderColor: colors.accent }]} onPress={submit}>
              <Text style={{ color: "#071018", fontWeight: "800" }}>Preview</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.45)", padding: 16 },
  sheet: { width: 720, maxWidth: "100%", borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  title: { fontSize: 18, fontWeight: "800" },
  label: { fontSize: 12, fontWeight: "700" },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  weekPill: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1 },
  field: { flex: 1, minWidth: 140, gap: 6 },
  input: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, fontWeight: "700", letterSpacing: 0.5 },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1 },
  smallBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
  dateBadge: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, gap: 2 },
});
