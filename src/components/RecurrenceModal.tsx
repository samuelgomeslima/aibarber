// src/components/RecurrenceModal.tsx
import React, { useState } from "react";
import { Modal, View, Text, Pressable, TextInput, StyleSheet } from "react-native";

import { defaultComponentCopy } from "../locales/componentCopy";
import type { RecurrenceModalCopy } from "../locales/types";
import { modalColors, type ModalColors } from "../theme/colors";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (opts: {
    startFrom: Date;   // Data fixa vinda do App (dia selecionado)
    time: string;      // "HH:MM" fixo vindo do App (slot selecionado)
    count: number;     // 1..10
  }) => void;
  fixedDate: Date;     // data selecionada na tela principal
  fixedTime: string;   // horário selecionado na tela principal (HH:MM)
  fixedService: string; // serviço atual (ex.: "Cut")
  fixedBarber: string;  // barbeiro atual (ex.: "João")
  colors?: ModalColors;
  copy?: RecurrenceModalCopy;
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export default function RecurrenceModal({
  visible,
  onClose,
  onSubmit,
  fixedDate,
  fixedTime,
  fixedService,
  fixedBarber,
  colors = modalColors,
  copy = defaultComponentCopy.recurrenceModal,
}: Props) {
  const [count, setCount] = useState("10"); // default continua 10

  const onCountChange = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 2); // até 2 dígitos
    setCount(digits);
  };
  const onCountBlur = () => {
    const n = clamp(parseInt(count || "1", 10), 1, 10); // <-- máximo 10
    setCount(String(n));
  };

  const submit = () => {
    const n = clamp(parseInt(count || "1", 10), 1, 10); // <-- máximo 10
    onSubmit({ startFrom: fixedDate, time: fixedTime, count: n });
    onClose();
  };

  const humanDate = (d: Date) =>
    d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>{copy.title}</Text>

          {/* Info fixas */}
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.subtext }]}>{copy.labels.service}</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{fixedService}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.subtext }]}>{copy.labels.barber}</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{fixedBarber}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.subtext }]}>{copy.labels.startDate}</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{humanDate(fixedDate)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.subtext }]}>{copy.labels.time}</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{fixedTime}</Text>
          </View>

          {/* Count */}
          <View style={{ marginTop: 8 }}>
            <Text style={[styles.label, { color: colors.subtext }]}>{copy.labels.count}</Text>
            <TextInput
              value={count}
              onChangeText={onCountChange}
              onBlur={onCountBlur}
              placeholder={copy.placeholders.count}
              placeholderTextColor={colors.subtext}
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
              keyboardType="numeric"
              maxLength={2}
            />
          </View>

          {/* Actions */}
          <View style={[styles.actions, { borderTopColor: colors.border }]}>
            <Pressable style={[styles.btn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={{ color: colors.subtext, fontWeight: "700" }}>{copy.actions.cancel}</Text>
            </Pressable>
            <Pressable style={[styles.btn, { backgroundColor: colors.accent, borderColor: colors.accent }]} onPress={submit}>
              <Text style={{ color: "#071018", fontWeight: "800" }}>{copy.actions.preview}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.45)", padding: 16 },
  sheet: { width: 560, maxWidth: "100%", borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  title: { fontSize: 18, fontWeight: "800" },
  label: { fontSize: 12, fontWeight: "700", marginBottom: 6 },
  input: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    fontWeight: "700",
    letterSpacing: 0.5,
    fontSize: 16,
  },

  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  infoLabel: { fontSize: 12, fontWeight: "700" },
  infoValue: { fontSize: 14, fontWeight: "800" },

  actions: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1 },
});
