// src/components/DateSelector.tsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Modal, Platform } from "react-native";

type Props = {
  value: Date;
  onChange: (d: Date) => void;
  colors?: {
    text: string;
    subtext: string;
    surface: string;
    border: string;
    accent: string;
    accentFgOn?: string;
  };
  locale?: string;
};

const pad = (n: number) => n.toString().padStart(2, "0");
const toDateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const humanDow = (d: Date, locale?: string) => d.toLocaleDateString(locale ?? undefined, { weekday: "short" });
const humanDateKey = (dk: string, locale?: string) => {
  const d = new Date(`${dk}T00:00:00`);
  return d.toLocaleDateString(locale ?? undefined, { weekday: "short", month: "short", day: "numeric" });
};
const DAY_MS = 24 * 60 * 60 * 1000;
const DAY_PILL_WIDTH = 72;
const DAY_GAP = 10;

const startOfWeek = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const weekday = copy.getDay();
  const diff = (weekday + 6) % 7; // Monday as the first day of the week
  copy.setDate(copy.getDate() - diff);
  return copy;
};
const addDays = (date: Date, amount: number) => {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
};

export default function DateSelector({
  value,
  onChange,
  colors = {
    text: "#e5e7eb",
    subtext: "#cbd5e1",
    surface: "rgba(255,255,255,0.045)",
    border: "rgba(255,255,255,0.07)",
    accent: "#60a5fa",
    accentFgOn: "#0b1220",
  },
  locale,
}: Props) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(value));
  const [stripWidth, setStripWidth] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const dateKey = toDateKey(value);

  useEffect(() => {
    const aligned = startOfWeek(value);
    setWeekStart((prev) => {
      if (prev.getTime() === aligned.getTime()) return prev;
      return aligned;
    });
  }, [value]);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(weekStart, i);
      return { d, key: toDateKey(d) };
    });
  }, [weekStart]);

  const dayCount = days.length;
  const contentWidth = useMemo(() => {
    if (!dayCount) return 0;
    return dayCount * (DAY_PILL_WIDTH + DAY_GAP) - DAY_GAP;
  }, [dayCount]);

  useEffect(() => {
    if (!scrollRef.current || !stripWidth) return;
    const activeIndex = days.findIndex(({ key }) => key === dateKey);
    if (activeIndex === -1) return;

    const baseOffset = activeIndex * (DAY_PILL_WIDTH + DAY_GAP);
    const centeredOffset = baseOffset - stripWidth / 2 + DAY_PILL_WIDTH / 2;
    const maxOffset = Math.max(0, contentWidth - stripWidth);
    const clampedOffset = Math.max(0, Math.min(maxOffset, centeredOffset));

    scrollRef.current.scrollTo({ x: clampedOffset, animated: true });
  }, [dateKey, days, stripWidth, contentWidth]);

  const shiftWeek = (direction: 1 | -1) => {
    setWeekStart((prev) => {
      const next = addDays(prev, direction * 7);
      const normalizedValue = new Date(value);
      normalizedValue.setHours(0, 0, 0, 0);
      const relativeIndex = Math.round((normalizedValue.getTime() - prev.getTime()) / DAY_MS);
      const clampedIndex = Math.min(6, Math.max(0, relativeIndex));
      const nextSelected = addDays(next, clampedIndex);
      nextSelected.setHours(0, 0, 0, 0);
      onChange(nextSelected);
      return next;
    });
  };

  return (
    <View>
      <View style={styles.dayStripContainer}>
        <Pressable
          onPress={() => shiftWeek(-1)}
          style={[styles.arrowButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
          accessibilityLabel="Show previous week"
        >
          <Text style={[styles.arrowIcon, { color: colors.text }]}>←</Text>
        </Pressable>

        {/* Tira horizontal de dias */}
        <ScrollView
          ref={scrollRef}
          horizontal
          style={styles.dayStripScroll}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.dayStrip,
            {
              gap: DAY_GAP,
              paddingVertical: 10,
              paddingRight: 0,
              paddingHorizontal: Math.max(0, stripWidth / 2 - DAY_PILL_WIDTH / 2),
            },
          ]}
          onLayout={(event) => {
            const nextWidth = event.nativeEvent.layout.width;
            setStripWidth((prev) => (prev === nextWidth ? prev : nextWidth));
          }}
        >
          {days.map(({ d, key }) => {
            const active = key === dateKey;
            return (
              <Pressable
                key={key}
                onPress={() => onChange(new Date(d))}
                style={[
                  styles.dayPill,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                  active && { backgroundColor: colors.accent, borderColor: colors.accent },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Select ${d.toDateString()}`}
              >
                <Text
                  style={[
                    styles.dayDow,
                    { color: colors.subtext },
                    active && { color: colors.accentFgOn ?? colors.text },
                  ]}
                >
                  {humanDow(d, locale)}
                </Text>
                <Text
                  style={[
                    styles.dayNum,
                    { color: colors.text },
                    active && { color: colors.accentFgOn ?? colors.text },
                  ]}
                >
                  {d.getDate()}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          onPress={() => shiftWeek(1)}
          style={[styles.arrowButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
          accessibilityLabel="Show next week"
        >
          <Text style={[styles.arrowIcon, { color: colors.text }]}>→</Text>
        </Pressable>
      </View>

      {/* Modal do calendário (com buffer + Apply) */}
      <CalendarModal
        visible={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        value={value}
        onConfirm={(d) => {
          onChange(d);
          setCalendarOpen(false);
        }}
        colors={colors}
      />

      {/* Rótulo com resumo da data atual */}
      <Pressable onPress={() => setCalendarOpen(true)} accessibilityLabel="Open calendar">
        <Text style={[styles.currentLabel, { color: colors.subtext }]}>{humanDateKey(dateKey, locale)}</Text>
      </Pressable>
    </View>
  );
}

function CalendarModal({
  visible,
  onClose,
  value,
  onConfirm,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  value: Date;
  onConfirm: (d: Date) => void;
  colors: NonNullable<Props["colors"]>;
}) {
  const [temp, setTemp] = useState<Date>(value);

  // Sempre que abrir, sincroniza a data temporária com a atual
  useEffect(() => {
    if (visible) setTemp(new Date(value));
  }, [visible, value]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: "#0c1017", borderColor: colors.border }]}>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Select a date</Text>

          {Platform.OS === "web" ? (
            <WebDatePicker value={temp} onChange={setTemp} colors={colors} />
          ) : (
            <NativeDatePicker value={temp} onChange={setTemp} colors={colors} />
          )}

          <View style={styles.sheetActions}>
            <Pressable onPress={onClose} style={[styles.sheetBtn, { borderColor: colors.border }]}>
              <Text style={{ color: colors.subtext, fontWeight: "700" }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => onConfirm(temp)}
              style={[styles.sheetBtn, { borderColor: colors.accent, backgroundColor: colors.accent }]}
            >
              <Text style={{ color: "#071018", fontWeight: "800" }}>Apply</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** ---- Web: <input type="date"> (controlado; ignora clear) ---- */
function WebDatePicker({
  value,
  onChange,
  colors,
}: {
  value: Date;
  onChange: (d: Date) => void;
  colors: NonNullable<Props["colors"]>;
}) {
  const toInputValue = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromInputValue = (s: string) => {
    if (!s) return null; // ignora "Clear" (não propaga)
    const [y, m, day] = s.split("-").map(Number);
    const d = new Date();
    d.setFullYear(y, m - 1, day);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  return (
    <View style={{ marginTop: 8 }}>
      {}
      <input
        type="date"
        value={toInputValue(value)} // CONTROLADO -> o "Clear" não apaga o valor
        onChange={(e: any) => {
          const next = fromInputValue(e.target.value);
          if (next) onChange(next); // só atualiza se houver data válida
        }}
        style={{
          padding: 10,
          borderRadius: 10,
          border: `1px solid ${colors.border}`,
          background: "rgba(255,255,255,0.06)",
          color: colors.text,
          outline: "none",
          fontWeight: 700,
        }}
      />
    </View>
  );
}

/** ---- Native: @react-native-community/datetimepicker (buffer; não fecha) ---- */
function NativeDatePicker({
  value,
  onChange,
  colors,
}: {
  value: Date;
  onChange: (d: Date) => void;
  colors: NonNullable<Props["colors"]>;
}) {
  // Lazy require para não quebrar o bundle web se não estiver instalado
  const RNDateTimePicker = require("@react-native-community/datetimepicker").default;

  return (
    <View style={{ marginTop: 8 }}>
      <RNDateTimePicker
        mode="date"
        value={value}
        display={Platform.OS === "ios" ? "inline" : "calendar"}
        onChange={(_evt: unknown, d?: Date) => {
          // Tipagem explícita para evitar implicit any; bufferiza seleção
          if (d) onChange(d);
        }}
        themeVariant="dark"
        // @ts-ignore platform-specific prop (iOS)
        textColor={colors.text}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dayStripContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  arrowButton: {
    width: 48,
    height: 64,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowIcon: { fontSize: 20, fontWeight: "800" },

  dayStripScroll: {
    flexGrow: 0,
  },
  dayStrip: {
    flexDirection: "row",
    alignItems: "center",
  },
  dayPill: {
    width: 72,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  dayDow: { fontSize: 12, fontWeight: "700" },
  dayNum: { fontSize: 18, fontWeight: "800" },

  currentLabel: { marginTop: 6, fontSize: 12, fontWeight: "700" },

  // Modal
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.45)", padding: 16 },
  sheet: { width: 420, maxWidth: "100%", borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  sheetTitle: { fontSize: 16, fontWeight: "800" },
  sheetActions: { marginTop: 12, flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  sheetBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1 },
});
