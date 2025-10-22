import React from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { DonutChart } from "../components/DonutChart";
import { formatPrice } from "../lib/domain";
import { applyAlpha, mixHexColor, tintHexColor } from "../utils/color";
import type {
  AuthenticatedAppStyles,
  AuthenticatedCopy,
  BarberBreakdownEntry,
  DayTotal,
  OverviewStatCard,
  ProductSalesSummary,
  ServiceBreakdownEntry,
  ThemeColors,
  WeekSummary,
} from "./AuthenticatedApp";

interface OverviewScreenProps {
  copy: AuthenticatedCopy;
  colors: ThemeColors;
  styles: AuthenticatedAppStyles;
  isCompactLayout: boolean;
  weekRangeLabel: string;
  statCards: OverviewStatCard[];
  weekLoading: boolean;
  onRefreshWeek: () => void | Promise<void>;
  serviceBreakdown: ServiceBreakdownEntry[];
  weekSummary: WeekSummary;
  productSalesBreakdown: ProductSalesSummary[];
  barberBreakdown: BarberBreakdownEntry[];
  dayTotals: DayTotal[];
  busiestDay: DayTotal | null;
  quietestDay: DayTotal | null;
}

export default function OverviewScreen({
  copy,
  colors,
  styles,
  isCompactLayout,
  weekRangeLabel,
  statCards,
  weekLoading,
  onRefreshWeek,
  serviceBreakdown,
  weekSummary,
  productSalesBreakdown,
  barberBreakdown,
  dayTotals,
  busiestDay,
  quietestDay,
}: OverviewScreenProps) {
  const topService = serviceBreakdown[0] ?? null;
  const totalCount = weekSummary.total;
  const additionalServices = serviceBreakdown.slice(1, 3);
  const shareFor = (count: number) => (totalCount ? Math.round((count / totalCount) * 100) : 0);
  const topShare = topService ? shareFor(topService.count) : 0;
  const accountedCount =
    (topService?.count ?? 0) + additionalServices.reduce((sum, svc) => sum + svc.count, 0);
  const otherCount = Math.max(0, totalCount - accountedCount);
  const donutSize = isCompactLayout ? 140 : 156;

  const legendItems = topService
    ? [
        {
          key: topService.id,
          label: topService.name,
          count: topService.count,
          share: topShare,
          color: colors.accent,
        },
        ...additionalServices.map((svc, index) => ({
          key: svc.id,
          label: svc.name,
          count: svc.count,
          share: shareFor(svc.count),
          color: tintHexColor(colors.accent, 0.35 + index * 0.18),
        })),
      ]
    : [];

  if (topService && otherCount > 0) {
    legendItems.push({
      key: "other",
      label: copy.charts.pizzaOther,
      count: otherCount,
      share: shareFor(otherCount),
      color: mixHexColor(colors.text, colors.bg, 0.55),
    });
  }

  const donutSegments = legendItems.map((item) => ({ value: item.count, color: item.color }));

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: isCompactLayout ? 16 : 20, gap: 16 }}
      refreshControl={<RefreshControl refreshing={weekLoading} onRefresh={onRefreshWeek} />}
    >
      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 12 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <MaterialCommunityIcons name="view-dashboard-outline" size={22} color={colors.accent} />
          <Text style={[styles.title, { color: colors.text }]}>{copy.weekTitle}</Text>
        </View>
        <Text style={{ color: colors.subtext, fontSize: 13, fontWeight: "600" }}>
          {copy.overviewSubtitle(weekRangeLabel)}
        </Text>
      </View>

      <View style={[styles.statsGrid, isCompactLayout && styles.statsGridCompact]}>
        {statCards.map((card) => {
          const progressWidth =
            typeof card.progress === "number"
              ? `${Math.max(8, Math.round(card.progress * 100))}%`
              : "0%";
          return (
            <View
              key={card.key}
              style={[
                styles.statCard,
                isCompactLayout && styles.statCardCompact,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            >
              <View style={styles.statCardHeader}>
                <View
                  style={[
                    styles.statIconBubble,
                    isCompactLayout && styles.statIconBubbleCompact,
                    { backgroundColor: applyAlpha(colors.accent, 0.14) },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={card.icon}
                    size={isCompactLayout ? 16 : 18}
                    color={colors.accent}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.statLabel,
                      isCompactLayout && styles.statLabelCompact,
                      { color: colors.subtext },
                    ]}
                  >
                    {card.label}
                  </Text>
                  <Text
                    style={[
                      styles.statDetail,
                      isCompactLayout && styles.statDetailCompact,
                      { color: colors.subtext },
                    ]}
                  >
                    {card.detail}
                  </Text>
                </View>
              </View>
              <Text
                style={[
                  styles.statValue,
                  isCompactLayout && styles.statValueCompact,
                  { color: colors.text },
                ]}
              >
                {card.value}
              </Text>
              {card.chip ? (
                <View
                  style={[
                    styles.statChip,
                    { backgroundColor: applyAlpha(colors.accent, 0.12) },
                  ]}
                >
                  <MaterialCommunityIcons name={card.chipIcon} size={14} color={colors.accent} />
                  <Text
                    style={{
                      color: colors.accent,
                      fontWeight: "700",
                      fontSize: isCompactLayout ? 11 : 12,
                    }}
                  >
                    {card.chip}
                  </Text>
                </View>
              ) : null}
              {typeof card.progress === "number" ? (
                <View
                  style={[
                    styles.statProgressTrack,
                    isCompactLayout && styles.statProgressTrackCompact,
                    { backgroundColor: applyAlpha(colors.accent, 0.12) },
                  ]}
                >
                  <View
                    style={[
                      styles.statProgressFill,
                      { width: progressWidth, backgroundColor: colors.accent },
                    ]}
                  />
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 16 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <MaterialCommunityIcons name="chart-box-outline" size={22} color={colors.accent} />
          <Text style={[styles.title, { color: colors.text }]}>{copy.bookingsByDayTitle}</Text>
        </View>

        {weekSummary.total === 0 ? (
          <Text style={[styles.empty, { marginLeft: 2 }]}>{copy.charts.barsEmpty}</Text>
        ) : (
          <>
            <View style={styles.insightsRow}>
              <View
                style={[
                  styles.insightSection,
                  { borderColor: colors.border, backgroundColor: colors.bg },
                ]}
              >
                <View style={styles.insightSectionHeader}>
                  <MaterialCommunityIcons name="chart-pie" size={20} color={colors.accent} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.insightSectionTitle, { color: colors.text }]}>
                      {copy.charts.pizzaTitle}
                    </Text>
                    <Text style={[styles.insightSectionSubtitle, { color: colors.subtext }]}>
                      {topService
                        ? copy.charts.pizzaSubtitle(topService.name)
                        : copy.charts.pizzaEmpty}
                    </Text>
                  </View>
                </View>
                {topService ? (
                  <View
                    style={[
                      styles.pieChartBlock,
                      isCompactLayout && styles.pieChartBlockCompact,
                    ]}
                  >
                    <View
                      style={[
                        styles.pieChartWrapper,
                        { width: donutSize, height: donutSize },
                      ]}
                    >
                      <DonutChart
                        segments={donutSegments}
                        size={donutSize}
                        strokeWidth={isCompactLayout ? 16 : 18}
                        trackColor={applyAlpha(colors.accent, 0.18)}
                        backgroundColor={colors.bg}
                      />
                      <View
                        style={[
                          styles.pieChartCenter,
                          {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                            borderWidth: 1,
                          },
                        ]}
                      >
                        <Text style={[styles.pieChartValue, { color: colors.text }]}>{`${topShare}%`}</Text>
                        <Text style={[styles.pieChartLabel, { color: colors.subtext }]}>
                          {copy.charts.serviceCount(topService.count)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.pieLegend}>
                      <Text style={[styles.pieLegendTitle, { color: colors.subtext }]}>
                        {copy.charts.pieLegendTitle}
                      </Text>
                      {legendItems.length ? (
                        legendItems.map((item) => (
                          <View key={item.key} style={styles.pieLegendItem}>
                            <View
                              style={[
                                styles.pieLegendSwatch,
                                { backgroundColor: item.color },
                              ]}
                            />
                            <View style={{ flex: 1 }}>
                              <Text
                                style={[styles.pieLegendLabel, { color: colors.text }]}
                                numberOfLines={1}
                              >
                                {item.label}
                              </Text>
                              <Text style={[styles.pieLegendMeta, { color: colors.subtext }]}>
                                {`${copy.charts.serviceCount(item.count)} • ${item.share}%`}
                              </Text>
                            </View>
                          </View>
                        ))
                      ) : (
                        <Text style={[styles.empty, { marginTop: 4 }]}>
                          {copy.charts.pieLegendEmpty}
                        </Text>
                      )}
                    </View>
                  </View>
                ) : (
                  <Text style={[styles.empty, { marginTop: 4 }]}>{copy.charts.pizzaEmpty}</Text>
                )}
              </View>

              <View
                style={[
                  styles.insightSection,
                  { borderColor: colors.border, backgroundColor: colors.bg },
                ]}
              >
                <View style={styles.insightSectionHeader}>
                  <MaterialCommunityIcons name="calendar-star" size={20} color={colors.accent} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.insightSectionTitle, { color: colors.text }]}>
                      {copy.charts.highlightsTitle}
                    </Text>
                    <Text style={[styles.insightSectionSubtitle, { color: colors.subtext }]}>
                      {copy.charts.highlightsSubtitle}
                    </Text>
                  </View>
                </View>
                <View style={styles.highlightGroup}>
                  <View style={[styles.highlightPill, { backgroundColor: colors.accent }]}>
                    <MaterialCommunityIcons name="trending-up" size={18} color={colors.accentFgOn} />
                    <Text style={{ color: colors.accentFgOn, fontWeight: "700" }}>
                      {busiestDay
                        ? copy.charts.busiestDay(busiestDay.label, busiestDay.count)
                        : copy.charts.barsEmpty}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.highlightPill,
                      { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
                    ]}
                  >
                    <MaterialCommunityIcons name="trending-down" size={18} color={colors.subtext} />
                    <Text style={{ color: colors.subtext, fontWeight: "700" }}>
                      {quietestDay
                        ? copy.charts.quietestDay(quietestDay.label, quietestDay.count)
                        : copy.charts.barsEmpty}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View
              style={[
                styles.chartCard,
                { borderColor: colors.border, backgroundColor: colors.bg },
              ]}
            >
              <View style={styles.insightSectionHeader}>
                <MaterialCommunityIcons name="chart-bar" size={20} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.insightSectionTitle, { color: colors.text }]}>
                    {copy.charts.barsTitle}
                  </Text>
                  <Text style={[styles.insightSectionSubtitle, { color: colors.subtext }]}>
                    {copy.charts.barsSubtitle}
                  </Text>
                </View>
              </View>
              <View style={styles.barChart}>
                {(() => {
                  const maxDayCount = dayTotals.reduce(
                    (max, day) => (day.count > max ? day.count : max),
                    0,
                  );
                  if (maxDayCount === 0) {
                    return <Text style={[styles.empty, { marginTop: 4 }]}>{copy.charts.barsEmpty}</Text>;
                  }
                  return dayTotals.map((day) => {
                    const height = Math.max(6, (day.count / maxDayCount) * 110);
                    return (
                      <View key={day.key} style={styles.barColumn}>
                        <Text style={[styles.barValue, { color: colors.text }]}>{day.count}</Text>
                        <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                height,
                                backgroundColor: colors.accent,
                              },
                            ]}
                          />
                        </View>
                        <Text style={[styles.barLabel, { color: colors.subtext }]}>{day.shortLabel}</Text>
                      </View>
                    );
                  });
                })()}
              </View>
            </View>

            <View
              style={[
                styles.chartCard,
                { borderColor: colors.border, backgroundColor: colors.bg },
              ]}
            >
              <View style={styles.insightSectionHeader}>
                <MaterialCommunityIcons name="account-tie" size={20} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.insightSectionTitle, { color: colors.text }]}>
                    {copy.charts.barberTitle}
                  </Text>
                  <Text style={[styles.insightSectionSubtitle, { color: colors.subtext }]}>
                    {copy.charts.barberSubtitle}
                  </Text>
                </View>
              </View>
              {barberBreakdown.length === 0 ? (
                <Text style={[styles.empty, { marginTop: 4 }]}>{copy.noBookings}</Text>
              ) : (
                <View style={styles.leaderboard}>
                  {(() => {
                    const maxCount = barberBreakdown[0]?.count ?? 0;
                    return barberBreakdown.slice(0, 5).map((entry) => {
                      const widthPercent = maxCount
                        ? Math.min(100, Math.max(8, (entry.count / maxCount) * 100))
                        : 0;
                      return (
                        <View key={entry.id} style={styles.leaderboardRow}>
                          <View style={styles.leaderboardInfo}>
                            <MaterialCommunityIcons
                              name="account-outline"
                              size={18}
                              color={colors.accent}
                            />
                            <Text style={{ color: colors.text, fontWeight: "700" }}>{entry.name}</Text>
                          </View>
                          <Text style={{ color: colors.subtext, fontWeight: "700" }}>
                            {copy.charts.serviceCount(entry.count)}
                          </Text>
                          <View style={[styles.leaderboardBarTrack, { backgroundColor: colors.border }]}>
                            <View
                              style={[
                                styles.leaderboardBarFill,
                                {
                                  width: `${widthPercent}%`,
                                  backgroundColor: colors.accent,
                                },
                              ]}
                            />
                          </View>
                        </View>
                      );
                    });
                  })()}
                </View>
              )}
            </View>

            <View
              style={[
                styles.chartCard,
                { borderColor: colors.border, backgroundColor: colors.bg },
              ]}
            >
              <View style={styles.insightSectionHeader}>
                <MaterialCommunityIcons name="basket-outline" size={20} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.insightSectionTitle, { color: colors.text }]}>
                    {copy.charts.productsTitle}
                  </Text>
                  <Text style={[styles.insightSectionSubtitle, { color: colors.subtext }]}>
                    {copy.charts.productsSubtitle}
                  </Text>
                </View>
              </View>
              {(() => {
                const entries = productSalesBreakdown.slice(0, 5);
                const hasSales = entries.some((entry) => entry.sold > 0);
                if (!hasSales) {
                  return <Text style={[styles.empty, { marginTop: 4 }]}>{copy.charts.productsEmpty}</Text>;
                }
                const maxSold = entries.reduce((max, entry) => (entry.sold > max ? entry.sold : max), 0);
                return (
                  <View style={styles.barChart}>
                    {entries.map((entry) => {
                      const height = maxSold ? Math.max(6, (entry.sold / maxSold) * 110) : 6;
                      return (
                        <View key={entry.id} style={styles.barColumn}>
                          <Text style={[styles.productBarUnits, { color: colors.text }]}>
                            {copy.charts.productUnits(entry.sold)}
                          </Text>
                          <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                            <View
                              style={[
                                styles.barFill,
                                {
                                  height,
                                  backgroundColor: colors.accent,
                                },
                              ]}
                            />
                          </View>
                          <Text style={[styles.productBarPrice, { color: colors.subtext }]}>
                            {copy.charts.productPriceLabel(formatPrice(entry.price_cents))}
                          </Text>
                          <Text style={[styles.productBarName, { color: colors.text }]} numberOfLines={2}>
                            {entry.name}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })()}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}
