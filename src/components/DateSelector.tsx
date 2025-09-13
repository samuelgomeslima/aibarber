// src/components/DateSelector.tsx
import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";

type Props = {
  value: Date;
  onChange: (d: Date) => void;
  daysBefore?: number;   // how many days before current value to show
  daysAfter?: number;    // how many days after current value to show
  colors?: {
    text: string; subtext: string; surface: string; border: string; accent: string;
  };
};

const pad = (n: number) => n.toString().padStart(2, "0");
const toDateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

export default function DateSelector({
  value,
  onChange,
  daysBefore = 4,
  daysAfter = 10,
  colors = { text: "#e5e7eb", subtext: "#cbd5e1", surface: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.08)", accent: "#60a5fa" },
}: Props) {
  const dateKey = toDateKey(value);

  const days = useMemo(() => {
    const out: { key: string; d: Date }[] = [];
    const start = new Date(value); start.setDate(start.getDate() - daysBefore);
    const span = daysBefore + daysAfter + 1;
    for (let i = 0; i < span; i++) {
      const n = new Date(start);
      n.setDate(start.getDate() + i);
      out.push({ d: n, key: toDateKey(n) });
    }
    return out;
  }, [value, daysBefore, daysAfter]);

  const jumpMonth = (delta: number) => {
    const n = new Date(value);
    n.setMonth(n.getMonth() + delta);
    onChange(n);
  };

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.headerRow}>
        <Pressable style={[styles.jumpBtn, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={() => jumpMonth(-1)}>
          <Text style={{ color: colors.subtext }}>◀︎ Month</Text>
        </Pressable>
        <Text style={{ color: colors.text, fontWeight: "800" }}>
          {value.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </Text>
        <Pressable style={[styles.jumpBtn, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={() => jumpMonth(1)}>
          <Text style={{ color: colors.subtext }}>Month ▶︎</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 8 }}>
        {days.map(({ d, key }) => {
          const active = key === dateKey;
          return (
            <Pressable
              key={key}
              onPress={() => onChange(d)}
              style={[
                styles.pill,
                { borderColor: colors.border, backgroundColor: colors.surface },
                active && { backgroundColor: "#111827", borderColor: colors.accent }
              ]}
            >
              <Text style={[styles.dow, { color: colors.subtext }, active && { color: colors.text }]}>
                {d.toLocaleDateString(undefined, { weekday: "short" })}
              </Text>
              <Text style={[styles.num, { color: colors.text }]}>{d.getDate()}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  jumpBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
  pill: { width: 72, paddingVertical: 10, borderRadius: 14, alignItems: "center", borderWidth: 1 },
  dow: { fontSize: 12, fontWeight: "700" },
  num: { fontSize: 18, fontWeight: "800" },
});
