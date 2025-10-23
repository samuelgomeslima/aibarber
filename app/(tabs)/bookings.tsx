import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import AuthenticatedApp, {
  type BookingsScreenProps,
  type BookingsScreenRenderer,
} from "../../src/app/AuthenticatedApp";
import { BARBERS, BARBER_MAP, humanDate } from "../../src/lib/domain";
import { applyAlpha } from "../../src/utils/color";
import FilterToggle from "../../src/components/FilterToggle";
import DateTimeInput from "../../src/components/DateTimeInput";
import { cashRegisterRenderer } from "./cash-register";
import { productsRenderer } from "../products";
import { servicesRenderer } from "../services";

const WHATSAPP_BRAND_COLOR = "#25D366";

export function BookingsScreen({
  isCompactLayout,
  isUltraCompactLayout,
  colors,
  styles,
  bookingsCopy,
  allBookingsLoading,
  loadAllBookings,
  onCreateBooking,
  bookingFilterBarber,
  setBookingFilterBarber,
  bookingFilterService,
  setBookingFilterService,
  bookingSortOrder,
  setBookingSortOrder,
  bookingLimitOptions,
  bookingResultLimit,
  setBookingResultLimit,
  bookingFilterClient,
  setBookingFilterClient,
  bookingFilterStartDate,
  setBookingFilterStartDate,
  bookingFilterStartTime,
  setBookingFilterStartTime,
  bookingFilterEndDate,
  setBookingFilterEndDate,
  bookingFilterEndTime,
  setBookingFilterEndTime,
  clearBookingFilters,
  services,
  localizedServiceMap,
  serviceMap,
  filteredBookingsList,
  groupedBookings,
  allBookings,
  locale,
  requestBookingConfirmation,
  confirmingBookingId,
}: BookingsScreenProps): React.ReactElement {
  const handleRefresh = useCallback(() => {
    void loadAllBookings();
  }, [loadAllBookings]);

  const renderedBookingGroups = groupedBookings.map((group, groupIndex) => {
    const dateLabel = humanDate(group.date, locale);
    const countLabel = bookingsCopy.results.sectionCount(group.bookings.length);

    const bookingItems = group.bookings.map((booking) => {
      const rawService = serviceMap.get(booking.service_id);
      const displayService = localizedServiceMap.get(booking.service_id) ?? rawService;
      const barber = BARBER_MAP[booking.barber];
      const customerName = booking._customer
        ? `${booking._customer.first_name}${booking._customer.last_name ? ` ${booking._customer.last_name}` : ""}`
        : bookingsCopy.results.walkIn;
      const reminderName = booking._customer?.first_name?.trim()
        ? booking._customer.first_name.trim()
        : customerName;
      const reminderTime = booking.start;
      const reminderMessage = bookingsCopy.results.whatsappMessage({
        clientName: reminderName,
        serviceName: displayService?.name ?? booking.service_id,
        date: dateLabel,
        time: reminderTime,
      });
      const phoneDigits = booking._customer?.phone?.replace(/\D/g, "");
      const hasPhone = Boolean(phoneDigits);
      const performedDate = booking.performed_at ? new Date(booking.performed_at) : null;
      const performedLabel =
        performedDate && !Number.isNaN(performedDate.getTime())
          ? bookingsCopy.results.confirmedAt(
              performedDate.toLocaleString(locale, {
                dateStyle: "short",
                timeStyle: "short",
              }),
            )
          : bookingsCopy.results.confirmedBadge;
      const isConfirming = confirmingBookingId === booking.id;
      const openWhatsAppReminder = () => {
        if (!phoneDigits) return;
        const url = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(reminderMessage)}`;
        Linking.openURL(url).catch((error) => {
          console.error(error);
          Alert.alert(
            bookingsCopy.results.whatsappErrorTitle,
            bookingsCopy.results.whatsappErrorMessage,
          );
        });
      };

      return (
        <View
          key={booking.id}
          style={[
            styles.bookingListRow,
            isUltraCompactLayout && styles.bookingListRowCompact,
          ]}
        >
          <View
            style={[
              styles.bookingListTime,
              isUltraCompactLayout && styles.bookingListTimeCompact,
            ]}
          >
            <Text style={styles.bookingListClock}>
              {booking.start} – {booking.end}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bookingListTitle}>{displayService?.name ?? booking.service_id}</Text>
            <Text style={styles.bookingListMeta}>
              {(barber?.name ?? booking.barber) + (customerName ? ` • ${customerName}` : "")}
            </Text>
            {booking.performed_at ? (
              <View style={styles.bookingStatusRow}>
                <MaterialCommunityIcons name="check-circle" size={14} color={colors.accent} />
                <Text style={[styles.bookingStatusText, { color: colors.accent }]}>{performedLabel}</Text>
              </View>
            ) : null}
          </View>
          <View
            style={[
              styles.bookingListActions,
              isUltraCompactLayout && styles.bookingListActionsCompact,
            ]}
          >
            {!booking.performed_at && (
              <Pressable
                onPress={() => requestBookingConfirmation(booking)}
                disabled={isConfirming}
                style={[
                  styles.smallBtn,
                  styles.confirmBtn,
                  {
                    borderColor: colors.accent,
                    backgroundColor: applyAlpha(colors.accent, 0.12),
                  },
                  isUltraCompactLayout && styles.fullWidthButton,
                  isConfirming && styles.smallBtnDisabled,
                ]}
                accessibilityRole="button"
                accessibilityState={{ disabled: isConfirming }}
                accessibilityLabel={bookingsCopy.results.confirmAccessibility({
                  serviceName: displayService?.name ?? booking.service_id,
                  time: booking.start,
                })}
              >
                {isConfirming ? (
                  <>
                    <ActivityIndicator size="small" color={colors.accent} />
                    <Text style={{ color: colors.accent, fontWeight: "800" }}>
                      {bookingsCopy.results.confirming}
                    </Text>
                  </>
                ) : (
                  <>
                    <MaterialCommunityIcons name="check" size={16} color={colors.accent} />
                    <Text style={{ color: colors.accent, fontWeight: "800" }}>
                      {bookingsCopy.results.confirmCta}
                    </Text>
                  </>
                )}
              </Pressable>
            )}
            <Pressable
              onPress={openWhatsAppReminder}
              disabled={!hasPhone}
              style={[
                styles.smallBtn,
                styles.whatsappBtn,
                {
                  borderColor: hasPhone ? WHATSAPP_BRAND_COLOR : colors.border,
                  backgroundColor: hasPhone
                    ? applyAlpha(WHATSAPP_BRAND_COLOR, 0.12)
                    : colors.surface,
                },
                isUltraCompactLayout && styles.fullWidthButton,
                !hasPhone && styles.smallBtnDisabled,
              ]}
              accessibilityRole="button"
              accessibilityState={{ disabled: !hasPhone }}
              accessibilityLabel={bookingsCopy.results.whatsappAccessibility(customerName)}
            >
              <MaterialCommunityIcons
                name="whatsapp"
                size={16}
                color={hasPhone ? WHATSAPP_BRAND_COLOR : colors.subtext}
              />
              <Text
                style={{
                  color: hasPhone ? WHATSAPP_BRAND_COLOR : colors.subtext,
                  fontWeight: "800",
                }}
              >
                {bookingsCopy.results.whatsappCta}
              </Text>
            </Pressable>
          </View>
        </View>
      );
    });

    return (
      <View
        key={group.date}
        style={[
          styles.bookingListSection,
          groupIndex === 0 && styles.bookingListSectionFirst,
        ]}
      >
        <View style={styles.bookingListSectionHeader}>
          <Text style={styles.bookingListSectionTitle}>{dateLabel}</Text>
          <Text style={styles.bookingListSectionCount}>{countLabel}</Text>
        </View>
        {bookingItems}
      </View>
    );
  });

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: isCompactLayout ? 16 : 20, gap: 16 }}
      refreshControl={
        <RefreshControl refreshing={allBookingsLoading} onRefresh={handleRefresh} />
      }
    >
      <View
        style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 12 }]}
      >
        <View style={[styles.listHeaderRow, isCompactLayout && styles.listHeaderRowCompact]}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.title, { color: colors.text }]}>{bookingsCopy.title}</Text>
            <Text style={{ color: colors.subtext, fontSize: 13, fontWeight: "600" }}>
              {bookingsCopy.subtitle}
            </Text>
          </View>
          <Pressable
            onPress={onCreateBooking}
            style={[styles.defaultCta, { marginTop: 0 }, isCompactLayout && styles.fullWidthButton]}
            accessibilityRole="button"
            accessibilityLabel={bookingsCopy.ctaAccessibility}
          >
            <Text style={styles.defaultCtaText}>{bookingsCopy.ctaLabel}</Text>
          </Pressable>
        </View>

        <FilterToggle
          initiallyOpen={false}
          showLabel={bookingsCopy.filters.toggleShow}
          hideLabel={bookingsCopy.filters.toggleHide}
          colors={colors}
        >
          <View style={{ gap: 12 }}>
            <View>
              <Text style={styles.filterLabel}>{bookingsCopy.filters.barber}</Text>
              <View style={styles.filterChipsRow}>
                <Pressable
                  onPress={() => setBookingFilterBarber(null)}
                  style={[styles.chip, !bookingFilterBarber && styles.chipActive]}
                >
                  <MaterialCommunityIcons
                    name="account-group"
                    size={16}
                    color={!bookingFilterBarber ? colors.accentFgOn : colors.subtext}
                  />
                  <Text style={[styles.chipText, !bookingFilterBarber && styles.chipTextActive]}>
                    {bookingsCopy.filters.all}
                  </Text>
                </Pressable>
                {BARBERS.map((barber) => {
                  const active = bookingFilterBarber === barber.id;
                  return (
                    <Pressable
                      key={barber.id}
                      onPress={() => setBookingFilterBarber(active ? null : barber.id)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <MaterialCommunityIcons
                        name={barber.icon}
                        size={16}
                        color={active ? colors.accentFgOn : colors.subtext}
                      />
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{barber.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View>
              <Text style={styles.filterLabel}>{bookingsCopy.filters.service}</Text>
              <View style={styles.filterChipsRow}>
                <Pressable
                  onPress={() => setBookingFilterService(null)}
                  style={[styles.chip, !bookingFilterService && styles.chipActive]}
                >
                  <MaterialCommunityIcons
                    name="briefcase-outline"
                    size={16}
                    color={!bookingFilterService ? colors.accentFgOn : colors.subtext}
                  />
                  <Text style={[styles.chipText, !bookingFilterService && styles.chipTextActive]}>
                    {bookingsCopy.filters.all}
                  </Text>
                </Pressable>
                {services.map((svc) => {
                  const localized = localizedServiceMap.get(svc.id) ?? svc;
                  const active = bookingFilterService === svc.id;
                  return (
                    <Pressable
                      key={svc.id}
                      onPress={() => setBookingFilterService(active ? null : svc.id)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <MaterialCommunityIcons
                        name={svc.icon}
                        size={16}
                        color={active ? colors.accentFgOn : colors.subtext}
                      />
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{localized.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View>
              <Text style={styles.filterLabel}>{bookingsCopy.filters.sort}</Text>
              <View style={styles.filterChipsRow}>
                <Pressable
                  onPress={() => {
                    if (bookingSortOrder !== "desc") setBookingSortOrder("desc");
                  }}
                  style={[styles.chip, bookingSortOrder === "desc" && styles.chipActive]}
                >
                  <MaterialCommunityIcons
                    name="sort-clock-descending"
                    size={16}
                    color={bookingSortOrder === "desc" ? colors.accentFgOn : colors.subtext}
                  />
                  <Text style={[styles.chipText, bookingSortOrder === "desc" && styles.chipTextActive]}>
                    {bookingsCopy.filters.sortNewest}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    if (bookingSortOrder !== "asc") setBookingSortOrder("asc");
                  }}
                  style={[styles.chip, bookingSortOrder === "asc" && styles.chipActive]}
                >
                  <MaterialCommunityIcons
                    name="sort-clock-ascending"
                    size={16}
                    color={bookingSortOrder === "asc" ? colors.accentFgOn : colors.subtext}
                  />
                  <Text style={[styles.chipText, bookingSortOrder === "asc" && styles.chipTextActive]}>
                    {bookingsCopy.filters.sortOldest}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View>
              <Text style={styles.filterLabel}>{bookingsCopy.filters.limit}</Text>
              <View style={styles.filterChipsRow}>
                {bookingLimitOptions.map((option) => {
                  const active = bookingResultLimit === option;
                  return (
                    <Pressable
                      key={option}
                      onPress={() => {
                        if (bookingResultLimit !== option) {
                          setBookingResultLimit(option);
                        }
                      }}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <MaterialCommunityIcons
                        name="format-list-numbered"
                        size={16}
                        color={active ? colors.accentFgOn : colors.subtext}
                      />
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {bookingsCopy.filters.limitOption(option)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View>
              <Text style={styles.filterLabel}>{bookingsCopy.filters.client}</Text>
              <TextInput
                placeholder={bookingsCopy.filters.clientPlaceholder}
                placeholderTextColor={`${colors.subtext}99`}
                value={bookingFilterClient}
                onChangeText={setBookingFilterClient}
                style={styles.input}
              />
            </View>

            <View style={[styles.filterRow, isCompactLayout && styles.filterRowStack]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.filterLabel}>{bookingsCopy.filters.startDate}</Text>
                <DateTimeInput
                  value={bookingFilterStartDate}
                  onChange={setBookingFilterStartDate}
                  placeholder={bookingsCopy.filters.startDatePlaceholder}
                  placeholderTextColor={`${colors.subtext}99`}
                  mode="date"
                  colors={colors}
                  confirmLabel={bookingsCopy.filters.pickerConfirm}
                  cancelLabel={bookingsCopy.filters.pickerCancel}
                  containerStyle={{ flex: 1 }}
                  inputStyle={styles.input}
                  textInputProps={{ autoCapitalize: "none" }}
                  accessibilityLabel={`${bookingsCopy.filters.startDate} picker`}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.filterLabel}>{bookingsCopy.filters.startTime}</Text>
                <DateTimeInput
                  value={bookingFilterStartTime}
                  onChange={setBookingFilterStartTime}
                  placeholder={bookingsCopy.filters.startTimePlaceholder}
                  placeholderTextColor={`${colors.subtext}99`}
                  mode="time"
                  colors={colors}
                  confirmLabel={bookingsCopy.filters.pickerConfirm}
                  cancelLabel={bookingsCopy.filters.pickerCancel}
                  containerStyle={{ flex: 1 }}
                  inputStyle={styles.input}
                  textInputProps={{ autoCapitalize: "none" }}
                  accessibilityLabel={`${bookingsCopy.filters.startTime} picker`}
                />
              </View>
            </View>

            <View style={[styles.filterRow, isCompactLayout && styles.filterRowStack]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.filterLabel}>{bookingsCopy.filters.endDate}</Text>
                <DateTimeInput
                  value={bookingFilterEndDate}
                  onChange={setBookingFilterEndDate}
                  placeholder={bookingsCopy.filters.endDatePlaceholder}
                  placeholderTextColor={`${colors.subtext}99`}
                  mode="date"
                  colors={colors}
                  confirmLabel={bookingsCopy.filters.pickerConfirm}
                  cancelLabel={bookingsCopy.filters.pickerCancel}
                  containerStyle={{ flex: 1 }}
                  inputStyle={styles.input}
                  textInputProps={{ autoCapitalize: "none" }}
                  accessibilityLabel={`${bookingsCopy.filters.endDate} picker`}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.filterLabel}>{bookingsCopy.filters.endTime}</Text>
                <DateTimeInput
                  value={bookingFilterEndTime}
                  onChange={setBookingFilterEndTime}
                  placeholder={bookingsCopy.filters.endTimePlaceholder}
                  placeholderTextColor={`${colors.subtext}99`}
                  mode="time"
                  colors={colors}
                  confirmLabel={bookingsCopy.filters.pickerConfirm}
                  cancelLabel={bookingsCopy.filters.pickerCancel}
                  containerStyle={{ flex: 1 }}
                  inputStyle={styles.input}
                  textInputProps={{ autoCapitalize: "none" }}
                  accessibilityLabel={`${bookingsCopy.filters.endTime} picker`}
                />
              </View>
            </View>

            <View style={[styles.filterActions, isCompactLayout && styles.filterActionsCompact]}>
              <Pressable onPress={clearBookingFilters} style={[styles.smallBtn, { borderColor: colors.border }]}>
                <Text style={{ color: colors.subtext, fontWeight: "800" }}>{bookingsCopy.filters.clear}</Text>
              </Pressable>
            </View>
          </View>
        </FilterToggle>
      </View>

      <View
        style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 14 }]}
      >
        <View style={[styles.listHeaderRow, isCompactLayout && styles.listHeaderRowCompact]}>
          <Text style={[styles.title, { color: colors.text }]}>{bookingsCopy.results.title}</Text>
          <View
            style={[styles.listHeaderMeta, isCompactLayout && styles.listHeaderMetaCompact]}
          >
            <Text style={{ color: colors.subtext, fontWeight: "700" }}>
              {bookingsCopy.results.count(filteredBookingsList.length, allBookings.length)}
            </Text>
            <Text style={styles.bookingListNotice}>
              {bookingsCopy.results.limitNotice(allBookings.length, bookingResultLimit)}
            </Text>
          </View>
        </View>

        {allBookingsLoading ? (
          <ActivityIndicator />
        ) : groupedBookings.length === 0 ? (
          <Text style={styles.empty}>{bookingsCopy.results.empty}</Text>
        ) : (
          renderedBookingGroups
        )}
      </View>
    </ScrollView>
  );
}

export const bookingsRenderer: BookingsScreenRenderer = (props) => (
  <BookingsScreen {...props} />
);

export default function Bookings(): React.ReactElement {
  return (
    <AuthenticatedApp
      initialScreen="bookings"
      renderBookings={bookingsRenderer}
      renderCashRegister={cashRegisterRenderer}
      renderProducts={productsRenderer}
      renderServices={servicesRenderer}
    />
  );
}
