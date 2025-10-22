// src/components/DateSelector.tsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Modal, Platform } from "react-native";

import {
  DEFAULT_TIMEZONE,
  addDaysToDateKey,
  differenceInDays,
  formatDateKey,
  formatDateLabel,
  getDateFromKey,
  getWeekDateKeys,
  getWeekStartDateKey,
} from "../lib/timezone";

type Props = {
  value: string;
  onChange: (dateKey: string) => void;
  timeZone?: string;
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

const DAY_PILL_WIDTH = 72;
const DAY_GAP = 10;

export default function DateSelector({
  value,
  onChange,
  timeZone = DEFAULT_TIMEZONE,
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
  const resolvedTimeZone = timeZone || DEFAULT_TIMEZONE;
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [weekStartKey, setWeekStartKey] = useState<string>(() =>
    getWeekStartDateKey(value, resolvedTimeZone),
  );
  const [stripWidth, setStripWidth] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setWeekStartKey((prev) => {
      const aligned = getWeekStartDateKey(value, resolvedTimeZone);
      return prev === aligned ? prev : aligned;
    });
  }, [value, resolvedTimeZone]);

  useEffect(() => {
    setWeekStartKey((prev) => getWeekStartDateKey(prev, resolvedTimeZone));
  }, [resolvedTimeZone]);

  const days = useMemo(() => {
    const keys = getWeekDateKeys(weekStartKey, resolvedTimeZone);
    return keys.map((key) => ({ key, date: getDateFromKey(key, resolvedTimeZone) }));
  }, [weekStartKey, resolvedTimeZone]);

  const dayCount = days.length;
  const contentWidth = useMemo(() => {
    if (!dayCount) return 0;
    return dayCount * (DAY_PILL_WIDTH + DAY_GAP) - DAY_GAP;
  }, [dayCount]);

  useEffect(() => {
    if (!scrollRef.current || !stripWidth) return;
    const activeIndex = days.findIndex(({ key }) => key === value);
    if (activeIndex === -1) return;

    const baseOffset = activeIndex * (DAY_PILL_WIDTH + DAY_GAP);
    const centeredOffset = baseOffset - stripWidth / 2 + DAY_PILL_WIDTH / 2;
    const maxOffset = Math.max(0, contentWidth - stripWidth);
    const clampedOffset = Math.max(0, Math.min(maxOffset, centeredOffset));

    scrollRef.current.scrollTo({ x: clampedOffset, animated: true });
  }, [contentWidth, days, stripWidth, value]);

  const shiftWeek = (direction: 1 | -1) => {
    setWeekStartKey((prev) => {
      const next = addDaysToDateKey(prev, direction * 7);
      const relativeIndex = differenceInDays(prev, value);
      const clampedIndex = Math.min(6, Math.max(0, relativeIndex));
      const nextKeys = getWeekDateKeys(next, resolvedTimeZone);
      const nextSelected = nextKeys[Math.min(nextKeys.length - 1, Math.max(0, clampedIndex))];
      if (nextSelected) {
        onChange(nextSelected);
      }
      return next;
    });
  };

  const currentLabel = formatDateLabel(
    value,
    { weekday: "short", month: "short", day: "numeric" },
    locale,
    resolvedTimeZone,
  );

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
          {days.map(({ date, key }) => {
            const active = key === value;
            const dayLabel = formatDateLabel(key, { weekday: "short" }, locale, resolvedTimeZone);
            const dayNumber = date.getUTCDate();
            const accessibility = formatDateLabel(
              key,
              { weekday: "long", month: "long", day: "numeric" },
              locale,
              resolvedTimeZone,
            );
            return (
              <Pressable
                key={key}
                onPress={() => onChange(key)}
                style={[
                  styles.dayPill,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                  active && { backgroundColor: colors.accent, borderColor: colors.accent },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Select ${accessibility}`}
              >
                <Text
                  style={[
                    styles.dayDow,
                    { color: colors.subtext },
                    active && { color: colors.accentFgOn ?? colors.text },
                  ]}
                >
                  {dayLabel}
                </Text>
                <Text
                  style={[
                    styles.dayNum,
                    { color: colors.text },
                    active && { color: colors.accentFgOn ?? colors.text },
                  ]}
                >
                  {dayNumber}
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

      <CalendarModal
        visible={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        value={value}
        onConfirm={(nextKey) => {
          onChange(nextKey);
          setCalendarOpen(false);
        }}
        timeZone={resolvedTimeZone}
        colors={colors}
      />

      <Pressable onPress={() => setCalendarOpen(true)} accessibilityLabel="Open calendar">
        <Text style={[styles.currentLabel, { color: colors.subtext }]}>{currentLabel}</Text>
      </Pressable>
    </View>
  );
}

type CalendarModalProps = {
  visible: boolean;
  onClose: () => void;
  value: string;
  onConfirm: (dateKey: string) => void;
  colors: NonNullable<Props["colors"]>;
  timeZone: string;
};

function CalendarModal({ visible, onClose, value, onConfirm, colors, timeZone }: CalendarModalProps) {
  const [temp, setTemp] = useState<Date>(() => getDateFromKey(value, timeZone));

  useEffect(() => {
    if (visible) {
      setTemp(getDateFromKey(value, timeZone));
    }
  }, [visible, value, timeZone]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: "#0c1017", borderColor: colors.border }]}>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Select a date</Text>

          {Platform.OS === "web" ? (
            <WebDatePicker value={temp} onChange={setTemp} colors={colors} timeZone={timeZone} />
          ) : (
            <NativeDatePicker value={temp} onChange={setTemp} colors={colors} timeZone={timeZone} />
          )}

          <View style={styles.sheetActions}>
            <Pressable onPress={onClose} style={[styles.sheetBtn, { borderColor: colors.border }]}>
              <Text style={{ color: colors.subtext, fontWeight: "700" }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => onConfirm(formatDateKey(temp, timeZone))}
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

type DatePickerProps = {
  value: Date;
  onChange: (d: Date) => void;
  colors: NonNullable<Props["colors"]>;
  timeZone: string;
};

function WebDatePicker({ value, onChange, colors, timeZone }: DatePickerProps) {
  const toInputValue = (d: Date) => formatDateKey(d, timeZone);
  const fromInputValue = (s: string) => {
    if (!s) return null;
    try {
      return getDateFromKey(s, timeZone);
    } catch (error) {
      return null;
    }
  };

  return (
    <View style={{ marginTop: 8 }}>
      <input
        type="date"
        value={toInputValue(value)}
        onChange={(e: any) => {
          const next = fromInputValue(e.target.value);
          if (next) onChange(next);
        }}
        style={{
          padding: 10,
          borderRadius: 10,
          border: `1px solid ${colors.border}`,
          background: "rgba(255,255,255,0.06)",
          color: colors.text,
          outline: "none",
          fontWeight: 700,
          fontSize: 16,
        }}
      />
    </View>
  );
}

function NativeDatePicker({ value, onChange, colors, timeZone }: DatePickerProps) {
  const RNDateTimePicker = require("@react-native-community/datetimepicker").default;

  return (
    <View style={{ marginTop: 8 }}>
      <RNDateTimePicker
        mode="date"
        value={value}
        display={Platform.OS === "ios" ? "inline" : "calendar"}
        onChange={(_evt: unknown, d?: Date) => {
          if (d) {
            const normalized = getDateFromKey(formatDateKey(d, timeZone), timeZone);
            onChange(normalized);
          }
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
    width: DAY_PILL_WIDTH,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  dayDow: { fontSize: 12, fontWeight: "700" },
  dayNum: { fontSize: 18, fontWeight: "800" },

  currentLabel: { marginTop: 6, fontSize: 12, fontWeight: "700" },

  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.45)", padding: 16 },
  sheet: { width: 420, maxWidth: "100%", borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  sheetTitle: { fontSize: 16, fontWeight: "800" },
  sheetActions: { marginTop: 12, flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  sheetBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1 },
});
