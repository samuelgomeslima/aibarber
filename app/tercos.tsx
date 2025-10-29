import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useThemeContext } from "../src/contexts/ThemeContext";
import {
  ROSARY_SETS,
  formatWeekdaysPt,
  getRosaryForDate,
  type RosarySet,
  WEEKDAY_LABELS_PT,
  type Weekday,
} from "../src/lib/rosary";

const AVE_MARIAS_PER_MYSTERY = 10;

function getInitialSelectedRosary(): RosarySet | undefined {
  return getRosaryForDate();
}

type CounterState = Record<RosarySet["id"], number>;

type MysteryStatus = "upcoming" | "active" | "completed";

function getMysteryStatus(
  count: number,
  mysteryIndex: number,
  totalMysteries: number,
): MysteryStatus {
  const maxCount = totalMysteries * AVE_MARIAS_PER_MYSTERY;
  const cappedCount = Math.max(0, Math.min(count, maxCount));
  const completedThreshold = (mysteryIndex + 1) * AVE_MARIAS_PER_MYSTERY;
  const startThreshold = mysteryIndex * AVE_MARIAS_PER_MYSTERY;

  if (cappedCount >= completedThreshold) {
    return "completed";
  }

  if (cappedCount >= startThreshold) {
    return "active";
  }

  return "upcoming";
}

function MysteryStatusLabel({
  status,
  colors,
}: {
  status: MysteryStatus;
  colors: ReturnType<typeof useThemeContext>["colors"];
}): React.ReactElement {
  const labels: Record<MysteryStatus, string> = {
    upcoming: "Próximo mistério",
    active: "Em andamento",
    completed: "Concluído",
  };

  const backgroundColors: Record<MysteryStatus, string> = {
    upcoming: colors.surface,
    active: colors.accent,
    completed: "rgba(34,197,94,0.15)",
  };

  const textColors: Record<MysteryStatus, string> = {
    upcoming: colors.subtext,
    active: colors.accentFgOn,
    completed: "#16a34a",
  };

  return (
    <View
      style={{
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: backgroundColors[status],
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ color: textColors[status], fontWeight: "700", fontSize: 11 }}>
        {labels[status]}
      </Text>
    </View>
  );
}

export default function Tercos(): React.ReactElement {
  const { colors } = useThemeContext();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const todayRosary = React.useMemo(() => getInitialSelectedRosary(), []);
  const [selectedRosaryId, setSelectedRosaryId] = React.useState<RosarySet["id"]>(
    todayRosary?.id ?? ROSARY_SETS[0]?.id ?? "joyful",
  );
  const [counters, setCounters] = React.useState<CounterState>(() => {
    const initialState = {} as CounterState;
    ROSARY_SETS.forEach((set) => {
      initialState[set.id] = 0;
    });
    return initialState;
  });

  const selectedRosary = React.useMemo(
    () => ROSARY_SETS.find((set) => set.id === selectedRosaryId) ?? ROSARY_SETS[0],
    [selectedRosaryId],
  );

  const handleSelectRosary = React.useCallback((rosary: RosarySet) => {
    setSelectedRosaryId(rosary.id);
  }, []);

  const handleIncrement = React.useCallback(() => {
    setCounters((prev) => {
      const current = prev[selectedRosary.id] ?? 0;
      const total = selectedRosary.mysteries.length * AVE_MARIAS_PER_MYSTERY;
      const nextValue = Math.min(total, current + 1);
      return { ...prev, [selectedRosary.id]: nextValue };
    });
  }, [selectedRosary]);

  const handleDecrement = React.useCallback(() => {
    setCounters((prev) => {
      const current = prev[selectedRosary.id] ?? 0;
      const nextValue = Math.max(0, current - 1);
      return { ...prev, [selectedRosary.id]: nextValue };
    });
  }, [selectedRosary]);

  const handleReset = React.useCallback(() => {
    setCounters((prev) => ({ ...prev, [selectedRosary.id]: 0 }));
  }, [selectedRosary.id]);

  const totalAveMarias = selectedRosary.mysteries.length * AVE_MARIAS_PER_MYSTERY;
  const currentCount = counters[selectedRosary.id] ?? 0;
  const completionPercentage = totalAveMarias === 0 ? 0 : currentCount / totalAveMarias;

  const renderDayChips = React.useCallback(
    (weekdays: Weekday[]) => (
      <View style={styles.dayRow}>
        {weekdays.map((weekday) => (
          <View key={weekday} style={styles.dayChip}>
            <Text style={styles.dayChipText}>{WEEKDAY_LABELS_PT[weekday]}</Text>
          </View>
        ))}
      </View>
    ),
    [styles.dayChip, styles.dayChipText, styles.dayRow],
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>Guia de oração</Text>
        <Text style={styles.heroTitle}>Terços</Text>
        <Text style={styles.heroSubtitle}>
          Escolha o terço que deseja rezar hoje e acompanhe o progresso de cada mistério com um contador dedicado.
        </Text>
        {todayRosary ? (
          <View style={styles.todayHighlight}>
            <Text style={styles.todayLabel}>Mistério do dia</Text>
            <Text style={styles.todayTitle}>{todayRosary.title}</Text>
            <Text style={styles.todaySubtitle}>{formatWeekdaysPt(todayRosary.weekdays)}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.list}>
        {ROSARY_SETS.map((rosary) => {
          const isSelected = rosary.id === selectedRosaryId;
          const isToday = rosary.id === todayRosary?.id;
          const counterValue = counters[rosary.id] ?? 0;
          const rosaryTotal = rosary.mysteries.length * AVE_MARIAS_PER_MYSTERY;

          return (
            <View
              key={rosary.id}
              style={[
                styles.rosaryCard,
                isSelected && styles.rosaryCardSelected,
                isToday && styles.rosaryCardToday,
              ]}
            >
              <Pressable
                onPress={() => handleSelectRosary(rosary)}
                style={styles.rosaryHeader}
                accessibilityRole="button"
                accessibilityLabel={`Abrir ${rosary.title}`}
              >
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={styles.rosaryHeaderRow}>
                    <Text style={styles.rosaryTitle}>{rosary.title}</Text>
                    {isToday ? (
                      <View style={styles.todayBadge}>
                        <Text style={styles.todayBadgeText}>Hoje</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.rosarySubtitle}>{rosary.subtitle}</Text>
                  {renderDayChips(rosary.weekdays)}
                  {!isSelected ? (
                    <Text style={styles.inlineProgress}>
                      Progresso: {counterValue} / {rosaryTotal} Ave-Marias
                    </Text>
                  ) : null}
                </View>
                <Ionicons
                  name={isSelected ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={colors.subtext}
                />
              </Pressable>

              {isSelected ? (
                <View style={styles.expandedContent}>
                  <View style={styles.counterCard}>
                    <View style={{ gap: 4 }}>
                      <Text style={styles.counterTitle}>Contador do terço</Text>
                      <Text style={styles.counterSubtitle}>
                        {currentCount} de {totalAveMarias} Ave-Marias
                      </Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${Math.round(completionPercentage * 100)}%` },
                        ]}
                      />
                    </View>
                    <View style={styles.counterActions}>
                      <Pressable
                        onPress={handleDecrement}
                        style={[styles.counterButton, styles.counterButtonSecondary]}
                        accessibilityRole="button"
                        accessibilityLabel="Diminuir contador"
                      >
                        <Ionicons name="remove" size={18} color={colors.subtext} />
                      </Pressable>
                      <Pressable
                        onPress={handleReset}
                        style={[styles.counterButton, styles.counterButtonSecondary]}
                        accessibilityRole="button"
                        accessibilityLabel="Zerar contador"
                      >
                        <Ionicons name="refresh" size={18} color={colors.subtext} />
                      </Pressable>
                      <Pressable
                        onPress={handleIncrement}
                        style={[styles.counterButton, styles.counterButtonPrimary]}
                        accessibilityRole="button"
                        accessibilityLabel="Adicionar uma Ave-Maria"
                      >
                        <Ionicons name="add" size={18} color={colors.accentFgOn} />
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.mysteryList}>
                    {rosary.mysteries.map((mystery, index) => {
                      const status = getMysteryStatus(
                        currentCount,
                        index,
                        rosary.mysteries.length,
                      );

                      return (
                        <View key={mystery.id} style={styles.mysteryCard}>
                          <View style={styles.mysteryHeader}>
                            <View style={styles.mysteryBadge}>
                              <Text style={styles.mysteryBadgeText}>{index + 1}</Text>
                            </View>
                            <View style={{ flex: 1, gap: 4 }}>
                              <Text style={styles.mysteryTitle}>{mystery.title}</Text>
                              <Text style={styles.mysteryMeditation}>{mystery.meditation}</Text>
                            </View>
                          </View>
                          <MysteryStatusLabel status={status} colors={colors} />
                        </View>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeContext>["colors"]) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      padding: 32,
      gap: 24,
      backgroundColor: colors.bg,
    },
    hero: {
      gap: 12,
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    heroEyebrow: {
      color: colors.accent,
      fontWeight: "700",
      letterSpacing: 1.2,
      textTransform: "uppercase",
      fontSize: 12,
    },
    heroTitle: {
      fontSize: 28,
      fontWeight: "800",
      color: colors.text,
    },
    heroSubtitle: {
      color: colors.subtext,
      fontSize: 14,
      lineHeight: 20,
    },
    todayHighlight: {
      marginTop: 12,
      borderRadius: 16,
      padding: 16,
      backgroundColor: "rgba(56,189,248,0.15)",
      borderWidth: 1,
      borderColor: "rgba(56,189,248,0.4)",
      gap: 6,
    },
    todayLabel: {
      color: "#0ea5e9",
      fontWeight: "800",
      fontSize: 12,
      textTransform: "uppercase",
    },
    todayTitle: {
      color: colors.text,
      fontWeight: "800",
      fontSize: 18,
    },
    todaySubtitle: {
      color: colors.subtext,
      fontSize: 13,
    },
    list: {
      gap: 20,
    },
    rosaryCard: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 20,
      gap: 16,
    },
    rosaryCardSelected: {
      borderColor: colors.accent,
      shadowColor: colors.accent,
      shadowOpacity: 0.2,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    rosaryCardToday: {
      borderColor: "rgba(56,189,248,0.6)",
    },
    rosaryHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 16,
    },
    rosaryHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap",
    },
    rosaryTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "800",
    },
    todayBadge: {
      backgroundColor: "rgba(56,189,248,0.2)",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    todayBadgeText: {
      color: "#0284c7",
      fontWeight: "700",
      fontSize: 11,
    },
    rosarySubtitle: {
      color: colors.subtext,
      fontSize: 14,
      lineHeight: 20,
    },
    inlineProgress: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: "600",
      marginTop: 8,
    },
    dayRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 8,
    },
    dayChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 4,
      paddingHorizontal: 10,
      backgroundColor: colors.bg,
    },
    dayChipText: {
      color: colors.subtext,
      fontWeight: "700",
      fontSize: 11,
    },
    expandedContent: {
      gap: 16,
    },
    counterCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bg,
      padding: 16,
      gap: 12,
    },
    counterTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "800",
    },
    counterSubtitle: {
      color: colors.subtext,
      fontSize: 13,
      fontWeight: "600",
    },
    progressBar: {
      height: 10,
      borderRadius: 999,
      backgroundColor: colors.border,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      backgroundColor: colors.accent,
    },
    counterActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 12,
    },
    counterButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
    },
    counterButtonSecondary: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    counterButtonPrimary: {
      backgroundColor: colors.accent,
    },
    mysteryList: {
      gap: 12,
    },
    mysteryCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bg,
      padding: 14,
      gap: 10,
    },
    mysteryHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
    },
    mysteryBadge: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    mysteryBadgeText: {
      color: colors.text,
      fontWeight: "800",
    },
    mysteryTitle: {
      color: colors.text,
      fontWeight: "700",
      fontSize: 15,
    },
    mysteryMeditation: {
      color: colors.subtext,
      fontSize: 13,
      lineHeight: 19,
    },
  });
