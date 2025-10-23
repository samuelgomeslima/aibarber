import React from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import AuthenticatedApp, {
  type BarbershopSettingsScreenProps,
  type BarbershopSettingsScreenRenderer,
} from "../src/app/AuthenticatedApp";
import { bookingsRenderer } from "./(tabs)/bookings";
import { cashRegisterRenderer } from "./(tabs)/cash-register";
import { productsRenderer } from "./products";
import { servicesRenderer } from "./services";
import { useAuthenticatedAppNavigation } from "../src/app/navigation";

export function BarbershopSettingsScreen({
  isCompactLayout,
  colors,
  styles,
  barbershopPageCopy,
  barbershopLoading,
  barbershop,
  barbershopForm,
  barbershopSaving,
  barbershopError,
  barbershopSuccess,
  handleBarbershopFieldChange,
  handleSaveBarbershop,
  handleNavigateToSettings,
  handleRetryBarbershop,
}: BarbershopSettingsScreenProps): React.ReactElement {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: isCompactLayout ? 16 : 20, gap: 16 }}>
      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 12 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <MaterialCommunityIcons name="store-edit-outline" size={22} color={colors.accent} />
          <Text style={[styles.title, { color: colors.text }]}>{barbershopPageCopy.title}</Text>
        </View>
        <Text style={{ color: colors.subtext, fontSize: 13, fontWeight: "600" }}>
          {barbershopPageCopy.subtitle}
        </Text>
      </View>

      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 16 }]}>
        {barbershopLoading ? (
          <View style={{ alignItems: "center", paddingVertical: 12 }}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : barbershop ? (
          <View style={{ gap: 16 }}>
            <View style={{ gap: 6 }}>
              <Text style={[styles.languageLabel, { color: colors.subtext }]}>
                {barbershopPageCopy.fields.nameLabel}
              </Text>
              <TextInput
                value={barbershopForm.name}
                onChangeText={(value) => handleBarbershopFieldChange("name", value)}
                placeholder={barbershopPageCopy.fields.namePlaceholder}
                placeholderTextColor={colors.subtext}
                style={styles.input}
                autoCapitalize="words"
                editable={!barbershopSaving}
                accessibilityLabel={barbershopPageCopy.fields.nameLabel}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text style={[styles.languageLabel, { color: colors.subtext }]}>
                {barbershopPageCopy.fields.slugLabel}
              </Text>
              <TextInput
                value={barbershopForm.slug}
                onChangeText={(value) => handleBarbershopFieldChange("slug", value)}
                placeholder={barbershopPageCopy.fields.slugPlaceholder}
                placeholderTextColor={colors.subtext}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!barbershopSaving}
                accessibilityLabel={barbershopPageCopy.fields.slugLabel}
              />
              <Text style={{ color: colors.subtext, fontSize: 12, fontWeight: "600" }}>
                {barbershopPageCopy.fields.slugHelper}
              </Text>
            </View>

            <View style={{ gap: 6 }}>
              <Text style={[styles.languageLabel, { color: colors.subtext }]}>
                {barbershopPageCopy.fields.timezoneLabel}
              </Text>
              <TextInput
                value={barbershopForm.timezone}
                onChangeText={(value) => handleBarbershopFieldChange("timezone", value)}
                placeholder={barbershopPageCopy.fields.timezonePlaceholder}
                placeholderTextColor={colors.subtext}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!barbershopSaving}
                accessibilityLabel={barbershopPageCopy.fields.timezoneLabel}
              />
              <Text style={{ color: colors.subtext, fontSize: 12, fontWeight: "600" }}>
                {barbershopPageCopy.fields.timezoneHelper}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={{ color: colors.subtext, fontSize: 13, fontWeight: "600" }}>
            {barbershopError ?? barbershopPageCopy.empty}
          </Text>
        )}

        {barbershop && barbershopError ? (
          <Text style={{ color: colors.danger, fontWeight: "700" }}>{barbershopError}</Text>
        ) : null}
        {barbershopSuccess ? (
          <Text style={{ color: colors.accent, fontWeight: "700" }}>{barbershopSuccess}</Text>
        ) : null}

        <View
          style={{
            flexDirection: isCompactLayout ? "column" : "row",
            alignItems: isCompactLayout ? "stretch" : "center",
            justifyContent: isCompactLayout ? "flex-start" : "flex-end",
            gap: 12,
          }}
        >
          <Pressable
            onPress={handleNavigateToSettings}
            style={[styles.smallBtn, { borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel={barbershopPageCopy.actions.back}
          >
            <Text style={{ color: colors.subtext, fontWeight: "800" }}>
              {barbershopPageCopy.actions.back}
            </Text>
          </Pressable>

          {barbershop ? (
            <Pressable
              onPress={handleSaveBarbershop}
              disabled={barbershopSaving}
              style={[
                styles.smallBtn,
                {
                  borderColor: colors.accent,
                  backgroundColor: colors.accent,
                  opacity: barbershopSaving ? 0.7 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={barbershopSaving ? barbershopPageCopy.actions.saving : barbershopPageCopy.actions.save}
            >
              <Text style={{ color: colors.accentFgOn, fontWeight: "900" }}>
                {barbershopSaving ? barbershopPageCopy.actions.saving : barbershopPageCopy.actions.save}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => {
                void handleRetryBarbershop();
              }}
              disabled={barbershopLoading}
              style={[styles.smallBtn, { borderColor: colors.border }, barbershopLoading && styles.smallBtnDisabled]}
              accessibilityRole="button"
              accessibilityLabel={barbershopPageCopy.actions.retry}
            >
              <Text style={{ color: colors.subtext, fontWeight: "800" }}>
                {barbershopPageCopy.actions.retry}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

export const barbershopSettingsRenderer: BarbershopSettingsScreenRenderer = (props) => (
  <BarbershopSettingsScreen {...props} />
);

export default function BarbershopSettings(): React.ReactElement {
  const handleNavigate = useAuthenticatedAppNavigation();

  return (
    <AuthenticatedApp
      initialScreen="barbershopSettings"
      onNavigate={handleNavigate}
      renderBarbershopSettings={barbershopSettingsRenderer}
      renderBookings={bookingsRenderer}
      renderCashRegister={cashRegisterRenderer}
      renderProducts={productsRenderer}
      renderServices={servicesRenderer}
    />
  );
}
