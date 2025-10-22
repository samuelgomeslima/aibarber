import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import type { ApiServiceName, ApiServiceStatus } from "../../lib/apiStatus";
import type {
  SupportedLanguage,
  ThemeColors,
  ThemePreference,
} from "../AuthenticatedApp";

type SettingsCopy = {
  title: string;
  subtitle: string;
  apiStatus: {
    title: string;
    description: string;
    refresh: string;
    refreshing: string;
    loading: string;
    error: string;
    labels: Record<ApiServiceName, string>;
    states: Record<"available" | "unavailable" | "unauthorized", string>;
  };
  emailConfirmation: {
    title: string;
    description: (email: string) => string;
    action: string;
    sending: string;
    success: string;
    error: string;
  };
  languageLabel: string;
  switchLanguage: string;
  themeLabel: string;
  themeDescription: string;
  themeOptions: Record<ThemePreference, string>;
  barbershop: {
    title: string;
    description: string;
    cta: string;
    ctaAccessibility: string;
  };
};

export type SettingsScreenProps = {
  settingsCopy: SettingsCopy;
  languageOptions: { code: SupportedLanguage; label: string }[];
  currentLanguage: SupportedLanguage;
  onChangeLanguage: (language: SupportedLanguage) => void;
  themeOptions: { value: ThemePreference }[];
  themePreference: ThemePreference;
  onChangeThemePreference: (preference: ThemePreference) => void;
  apiStatusOrder: ApiServiceName[];
  apiStatuses: ApiServiceStatus[];
  apiStatusLoading: boolean;
  apiStatusError: string | null;
  onRefreshApiStatuses: () => void;
  showEmailConfirmationReminder: boolean;
  emailConfirmationCopy: SettingsCopy["emailConfirmation"];
  onResendConfirmationEmail: () => void;
  resendingConfirmation: boolean;
  resentConfirmation: boolean;
  resendConfirmationError: string | null;
  currentUserEmail: string | null;
  onOpenBarbershopSettings: () => void;
  settingsBarbershopCopy: SettingsCopy["barbershop"];
  colors: ThemeColors;
  styles: import("../AuthenticatedApp").AppStyles;
  isCompactLayout: boolean;
};

export default function SettingsScreen({
  settingsCopy,
  languageOptions,
  currentLanguage,
  onChangeLanguage,
  themeOptions,
  themePreference,
  onChangeThemePreference,
  apiStatusOrder,
  apiStatuses,
  apiStatusLoading,
  apiStatusError,
  onRefreshApiStatuses,
  showEmailConfirmationReminder,
  emailConfirmationCopy,
  onResendConfirmationEmail,
  resendingConfirmation,
  resentConfirmation,
  resendConfirmationError,
  currentUserEmail,
  onOpenBarbershopSettings,
  settingsBarbershopCopy,
  colors,
  styles,
  isCompactLayout,
}: SettingsScreenProps) {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: isCompactLayout ? 16 : 20, gap: 16 }}
    >
      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 12 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Ionicons name="settings-outline" size={22} color={colors.accent} />
          <Text style={[styles.title, { color: colors.text }]}>{settingsCopy.title}</Text>
        </View>
        <Text style={{ color: colors.subtext, fontSize: 13, fontWeight: "600" }}>
          {settingsCopy.subtitle}
        </Text>
      </View>

      {showEmailConfirmationReminder ? (
        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 12 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="mail-unread-outline" size={20} color={colors.accent} />
            <Text style={[styles.languageLabel, { color: colors.accent }]}>
              {emailConfirmationCopy.title}
            </Text>
          </View>
          <Text style={{ color: colors.subtext, fontSize: 13, fontWeight: "600" }}>
            {emailConfirmationCopy.description(currentUserEmail ?? "")}
          </Text>
          {resentConfirmation ? (
            <Text style={{ color: colors.accent, fontWeight: "700" }}>
              {emailConfirmationCopy.success}
            </Text>
          ) : null}
          {resendConfirmationError ? (
            <Text style={{ color: colors.danger, fontWeight: "700" }}>{resendConfirmationError}</Text>
          ) : null}
          <Pressable
            onPress={onResendConfirmationEmail}
            disabled={resendingConfirmation}
            style={[
              styles.smallBtn,
              {
                alignSelf: "flex-start",
                borderColor: colors.accent,
                backgroundColor: colors.accent,
                opacity: resendingConfirmation ? 0.7 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={emailConfirmationCopy.action}
          >
            <Text style={{ color: colors.accentFgOn, fontWeight: "900" }}>
              {resendingConfirmation ? emailConfirmationCopy.sending : emailConfirmationCopy.action}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 16 }]}>
        <View style={styles.statusHeader}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.languageLabel, { color: colors.subtext }]}>
              {settingsCopy.apiStatus.title}
            </Text>
            <Text style={{ color: colors.subtext, fontSize: 13, fontWeight: "600" }}>
              {settingsCopy.apiStatus.description}
            </Text>
          </View>
          <Pressable
            onPress={onRefreshApiStatuses}
            disabled={apiStatusLoading}
            style={[
              styles.statusRefresh,
              {
                borderColor: colors.border,
                backgroundColor: colors.surface,
                opacity: apiStatusLoading ? 0.5 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              apiStatusLoading ? settingsCopy.apiStatus.refreshing : settingsCopy.apiStatus.refresh
            }
          >
            <Ionicons name="refresh" size={16} color={colors.subtext} />
            <Text style={[styles.statusRefreshText, { color: colors.subtext }]}>
              {apiStatusLoading ? settingsCopy.apiStatus.refreshing : settingsCopy.apiStatus.refresh}
            </Text>
          </Pressable>
        </View>

        {apiStatusLoading ? (
          <View style={styles.statusLoadingRow}>
            <ActivityIndicator size="small" color={colors.subtext} />
            <Text style={[styles.statusErrorText, { color: colors.subtext }]}>
              {settingsCopy.apiStatus.loading}
            </Text>
          </View>
        ) : apiStatusError ? (
          <View style={{ gap: 6 }}>
            <Text style={[styles.statusErrorText, { color: colors.danger }]}>
              {settingsCopy.apiStatus.error}
            </Text>
            <Text style={[styles.statusErrorText, { color: colors.subtext }]}>{apiStatusError}</Text>
          </View>
        ) : (
          <View style={styles.statusList}>
            {apiStatusOrder.map((service) => {
              const status = apiStatuses.find((item) => item.service === service);
              const state = status?.state ?? "unavailable";
              const label = settingsCopy.apiStatus.labels[service];
              const detail =
                (status?.message && status.message.trim()) ||
                settingsCopy.apiStatus.states[state];
              const pillStyle = [
                styles.statusPill,
                state === "available"
                  ? styles.statusPillAvailable
                  : state === "unauthorized"
                    ? styles.statusPillUnauthorized
                    : styles.statusPillUnavailable,
              ];
              const iconName =
                state === "available"
                  ? "checkmark-circle"
                  : state === "unauthorized"
                    ? "shield-half"
                    : "close-circle";
              const pillColor =
                state === "available"
                  ? colors.accent
                  : state === "unauthorized"
                    ? "#f59e0b"
                    : colors.danger;

              return (
                <View key={service} style={styles.statusRow}>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text style={[styles.statusTitle, { color: colors.text }]}>{label}</Text>
                    <Text style={[styles.statusDescription, { color: colors.subtext }]}>{detail}</Text>
                  </View>
                  <View style={pillStyle}>
                    <Ionicons name={iconName as keyof typeof Ionicons.glyphMap} size={16} color={pillColor} />
                    <Text style={[styles.statusPillText, { color: pillColor }]}>
                      {settingsCopy.apiStatus.states[state]}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 16 }]}>
        <Text style={[styles.languageLabel, { color: colors.subtext }]}>{settingsCopy.languageLabel}</Text>
        <View style={styles.languageOptions}>
          {languageOptions.map((option) => {
            const isActive = option.code === currentLanguage;
            return (
              <Pressable
                key={option.code}
                onPress={() => onChangeLanguage(option.code)}
                style={[
                  styles.languageOption,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                  isActive && { backgroundColor: colors.accent, borderColor: colors.accent },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${settingsCopy.switchLanguage} ${option.label}`}
              >
                <Text
                  style={[
                    styles.languageOptionText,
                    { color: isActive ? colors.accentFgOn : colors.subtext },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 12 }]}>
        <Text style={[styles.languageLabel, { color: colors.subtext }]}>{settingsCopy.themeLabel}</Text>
        <Text style={{ color: colors.subtext, fontSize: 13, fontWeight: "600" }}>
          {settingsCopy.themeDescription}
        </Text>
        <View style={styles.languageOptions}>
          {themeOptions.map((option) => {
            const isActive = option.value === themePreference;
            return (
              <Pressable
                key={option.value}
                onPress={() => onChangeThemePreference(option.value)}
                style={[
                  styles.languageOption,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                  isActive && { backgroundColor: colors.accent, borderColor: colors.accent },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${settingsCopy.themeLabel}: ${settingsCopy.themeOptions[option.value]}`}
              >
                <Text
                  style={[
                    styles.languageOptionText,
                    { color: isActive ? colors.accentFgOn : colors.subtext },
                  ]}
                >
                  {settingsCopy.themeOptions[option.value]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 12 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <MaterialCommunityIcons name="store-edit-outline" size={22} color={colors.accent} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.languageLabel, { color: colors.subtext }]}>
              {settingsBarbershopCopy.title}
            </Text>
            <Text style={{ color: colors.subtext, fontSize: 13, fontWeight: "600" }}>
              {settingsBarbershopCopy.description}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={onOpenBarbershopSettings}
          style={[
            styles.smallBtn,
            {
              alignSelf: "flex-start",
              borderColor: colors.accent,
              backgroundColor: colors.accent,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={settingsBarbershopCopy.ctaAccessibility}
        >
          <Text style={{ color: colors.accentFgOn, fontWeight: "900" }}>
            {settingsBarbershopCopy.cta}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
