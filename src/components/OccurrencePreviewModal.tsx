// src/components/OccurrencePreviewModal.tsx
import React from "react";
import { Modal, View, Text, Pressable, StyleSheet, ScrollView } from "react-native";

export type PreviewItem = {
  date: string;   // YYYY-MM-DD
  start: string;  // HH:MM
  end: string;    // HH:MM
  ok: boolean;
  reason?: string; // "conflict" | "outside-hours" | custom
};

type Props = {
  visible: boolean;
  items: PreviewItem[];
  onClose: () => void;
  onConfirm: () => void;
  colors?: {
    text: string; subtext: string; surface: string; border: string; accent: string; bg: string; danger: string;
  };
};

export default function OccurrencePreviewModal({
  visible, items, onClose, onConfirm,
  colors = {
    text: "#e5e7eb",
    subtext: "#cbd5e1",
    surface: "rgba(255,255,255,0.06)",
    border: "rgba(255,255,255,0.12)",
    accent: "#60a5fa",
    bg: "#0b0d13",
    danger: "#ef4444",
  }
}: Props) {
  const okCount = items.filter(i => i.ok).length;
  const badCount = items.length - okCount;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Preview recurring bookings</Text>
          <Text style={{ color: colors.subtext, marginBottom: 8 }}>
            {okCount} will be created {badCount ? `• ${badCount} skipped` : ""}
          </Text>

          <View style={[styles.headerRow, { borderColor: colors.border }]}>
            <Text style={[styles.hCell, { color: colors.subtext }]}>Date</Text>
            <Text style={[styles.hCell, { color: colors.subtext }]}>Time</Text>
            <Text style={[styles.hCell, { color: colors.subtext }]}>Status</Text>
          </View>

          <ScrollView style={{ maxHeight: 360 }}>
            {items.map((it, idx) => {
              const status = it.ok ? "OK" : (it.reason === "conflict" ? "Conflict" : "Outside hours");
              const color = it.ok ? colors.text : colors.danger;
              return (
                <View key={idx} style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  <Text style={[styles.cell, { color: colors.text }]}>{it.date}</Text>
                  <Text style={[styles.cell, { color: colors.text }]}>{it.start}–{it.end}</Text>
                  <Text style={[styles.cell, { color }]}>{status}</Text>
                </View>
              );
            })}
          </ScrollView>

          <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
            <Pressable style={[styles.btn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={{ color: colors.subtext, fontWeight: "700" }}>Back</Text>
            </Pressable>
            <Pressable
              disabled={okCount === 0}
              style={[
                styles.btn,
                {
                  backgroundColor: okCount ? colors.accent : "transparent",
                  borderColor: okCount ? colors.accent : colors.border,
                  opacity: okCount ? 1 : 0.6
                }
              ]}
              onPress={onConfirm}
            >
              <Text style={{ color: okCount ? "#071018" : colors.subtext, fontWeight: "800" }}>
                Create {okCount}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.45)", padding: 16 },
  sheet: { width: 720, maxWidth: "100%", borderRadius: 16, borderWidth: 1, padding: 16 },
  title: { fontSize: 18, fontWeight: "800" },
  headerRow: { flexDirection: "row", borderBottomWidth: 1, paddingBottom: 6, marginBottom: 6 },
  hCell: { flex: 1, fontSize: 12, fontWeight: "800" },
  row: { flexDirection: "row", borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, marginBottom: 8 },
  cell: { flex: 1, fontSize: 14, fontWeight: "700" },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1 },
});
