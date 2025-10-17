import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Localization from "expo-localization";
import type { Session } from "@supabase/supabase-js";

import {
  completePendingBarbershopRegistration,
  registerBarbershopAdministrator,
} from "../lib/auth";
import { hasSupabaseCredentials, supabase } from "../lib/supabase";
import { formCardColors, palette } from "../theme/colors";

const LOGIN_MODE = "login" as const;
const REGISTER_MODE = "register" as const;

type AuthMode = typeof LOGIN_MODE | typeof REGISTER_MODE;

type LoginFormState = {
  email: string;
  password: string;
};

type RegistrationFormState = {
  barbershopName: string;
  adminFirstName: string;
  adminLastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
};

type AuthGateProps = {
  children: React.ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const [mode, setMode] = useState<AuthMode>(LOGIN_MODE);
  const [initializing, setInitializing] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [loginForm, setLoginForm] = useState<LoginFormState>({ email: "", password: "" });
  const [registrationForm, setRegistrationForm] = useState<RegistrationFormState>({
    barbershopName: "",
    adminFirstName: "",
    adminLastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      setInitializing(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      isMounted = false;
      subscription?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) return;

    completePendingBarbershopRegistration(session).catch((error) => {
      console.error("Failed to complete pending barbershop registration", error);
    });
  }, [session]);

  const colors = useMemo(() => ({
    background: palette.backgroundDark,
    textPrimary: formCardColors.text,
    textSecondary: formCardColors.subtext,
    surface: formCardColors.surface,
    border: formCardColors.border,
    accent: formCardColors.accent,
    accentOn: formCardColors.accentFgOn,
    danger: formCardColors.danger,
  }), []);

  const timezone = useMemo(() => {
    try {
      return Localization.getCalendars()?.[0]?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      console.warn("Unable to detect timezone", error);
      return "UTC";
    }
  }, []);

  const handleLoginChange = (field: keyof LoginFormState, value: string) => {
    setLoginForm((current) => ({ ...current, [field]: value }));
  };

  const handleRegistrationChange = (field: keyof RegistrationFormState, value: string) => {
    setRegistrationForm((current) => ({ ...current, [field]: value }));
  };

  const handleLoginSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginForm.email.trim().toLowerCase(),
        password: loginForm.password,
      });

      if (error) {
        setErrorMessage(error.message);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to sign in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegistrationSubmit = async () => {
    if (submitting) return;

    if (registrationForm.password !== registrationForm.confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const result = await registerBarbershopAdministrator({
        barbershopName: registrationForm.barbershopName,
        adminFirstName: registrationForm.adminFirstName,
        adminLastName: registrationForm.adminLastName,
        email: registrationForm.email,
        password: registrationForm.password,
        phone: registrationForm.phone,
        timezone,
      });

      if (result.requiresEmailConfirmation) {
        setInfoMessage(
          "Check your email to confirm the account. Once confirmed, sign in to finish setting up your barbershop.",
        );
        setMode(LOGIN_MODE);
      } else {
        setInfoMessage("Barbershop registered! You can start using the application.");
      }

      setRegistrationForm({
        barbershopName: "",
        adminFirstName: "",
        adminLastName: "",
        email: "",
        password: "",
        confirmPassword: "",
        phone: "",
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasSupabaseCredentials) {
    return (
      <View style={[styles.fullscreen, { backgroundColor: colors.background }]}> 
        <Text style={[styles.title, { color: colors.textPrimary, textAlign: "center" }]}>
          Supabase credentials are missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to enable
          authentication.
        </Text>
      </View>
    );
  }

  if (initializing) {
    return (
      <View style={[styles.fullscreen, { backgroundColor: colors.background }]}> 
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (session) {
    return <>{children}</>;
  }

  return (
    <View style={[styles.fullscreen, { backgroundColor: colors.background }]}> 
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={styles.keyboardAvoider}
        keyboardVerticalOffset={64}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <Text style={[styles.title, { color: colors.textPrimary }]}> 
              {mode === LOGIN_MODE ? "Sign in to continue" : "Register your barbershop"}
            </Text>

            {errorMessage ? (
              <View style={[styles.feedback, { backgroundColor: `${colors.danger}1A` }]}> 
                <Text style={[styles.feedbackText, { color: colors.danger }]}>{errorMessage}</Text>
              </View>
            ) : null}

            {infoMessage ? (
              <View style={[styles.feedback, { backgroundColor: `${colors.accent}1A` }]}> 
                <Text style={[styles.feedbackText, { color: colors.accent }]}>{infoMessage}</Text>
              </View>
            ) : null}

            {mode === LOGIN_MODE ? (
              <View style={styles.formSection}>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    placeholder="you@example.com"
                    placeholderTextColor={`${colors.textSecondary}AA`}
                    style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
                    value={loginForm.email}
                    onChangeText={(value) => handleLoginChange("email", value)}
                    editable={!submitting}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="password"
                    secureTextEntry
                    placeholder="••••••••"
                    placeholderTextColor={`${colors.textSecondary}AA`}
                    style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
                    value={loginForm.password}
                    onChangeText={(value) => handleLoginChange("password", value)}
                    editable={!submitting}
                  />
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    {
                      backgroundColor: colors.accent,
                      opacity: pressed || submitting ? 0.7 : 1,
                    },
                  ]}
                  onPress={handleLoginSubmit}
                  disabled={submitting}
                >
                  <Text style={[styles.primaryButtonText, { color: colors.accentOn }]}>Sign in</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.formSection}>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Barbershop name</Text>
                  <TextInput
                    placeholder="Fresh Fade Studio"
                    placeholderTextColor={`${colors.textSecondary}AA`}
                    style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
                    value={registrationForm.barbershopName}
                    onChangeText={(value) => handleRegistrationChange("barbershopName", value)}
                    editable={!submitting}
                  />
                </View>
                <View style={styles.row}>
                  <View style={[styles.field, styles.rowItem]}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>First name</Text>
                    <TextInput
                      placeholder="Alex"
                      placeholderTextColor={`${colors.textSecondary}AA`}
                      style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
                      value={registrationForm.adminFirstName}
                      onChangeText={(value) => handleRegistrationChange("adminFirstName", value)}
                      editable={!submitting}
                    />
                  </View>
                  <View style={[styles.field, styles.rowItem]}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Last name</Text>
                    <TextInput
                      placeholder="Carvalho"
                      placeholderTextColor={`${colors.textSecondary}AA`}
                      style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
                      value={registrationForm.adminLastName}
                      onChangeText={(value) => handleRegistrationChange("adminLastName", value)}
                      editable={!submitting}
                    />
                  </View>
                </View>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Administrator email</Text>
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    placeholder="owner@freshfade.com"
                    placeholderTextColor={`${colors.textSecondary}AA`}
                    style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
                    value={registrationForm.email}
                    onChangeText={(value) => handleRegistrationChange("email", value)}
                    editable={!submitting}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Administrator phone</Text>
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="tel"
                    keyboardType="phone-pad"
                    placeholder="5511999999999"
                    placeholderTextColor={`${colors.textSecondary}AA`}
                    style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
                    value={registrationForm.phone}
                    onChangeText={(value) => handleRegistrationChange("phone", value)}
                    editable={!submitting}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="password"
                    secureTextEntry
                    placeholder="Create a secure password"
                    placeholderTextColor={`${colors.textSecondary}AA`}
                    style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
                    value={registrationForm.password}
                    onChangeText={(value) => handleRegistrationChange("password", value)}
                    editable={!submitting}
                  />
                </View>
                <View style={styles.field}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Confirm password</Text>
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="password"
                    secureTextEntry
                    placeholder="Repeat the password"
                    placeholderTextColor={`${colors.textSecondary}AA`}
                    style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
                    value={registrationForm.confirmPassword}
                    onChangeText={(value) => handleRegistrationChange("confirmPassword", value)}
                    editable={!submitting}
                  />
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    {
                      backgroundColor: colors.accent,
                      opacity: pressed || submitting ? 0.7 : 1,
                    },
                  ]}
                  onPress={handleRegistrationSubmit}
                  disabled={submitting}
                >
                  <Text style={[styles.primaryButtonText, { color: colors.accentOn }]}>Register barbershop</Text>
                </Pressable>
              </View>
            )}

            <View style={styles.toggleRow}>
              <Text style={[styles.toggleText, { color: colors.textSecondary }]}> 
                {mode === LOGIN_MODE ? "Need an account?" : "Already have an account?"}
              </Text>
              <Pressable onPress={() => setMode(mode === LOGIN_MODE ? REGISTER_MODE : LOGIN_MODE)} disabled={submitting}>
                <Text style={[styles.toggleCta, { color: colors.accent }]}>
                  {mode === LOGIN_MODE ? "Register your barbershop" : "Sign in"}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullscreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  keyboardAvoider: {
    flex: 1,
    width: "100%",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: "100%",
    maxWidth: 480,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "left",
  },
  feedback: {
    borderRadius: 12,
    padding: 12,
  },
  feedbackText: {
    fontSize: 14,
    fontWeight: "600",
  },
  formSection: {
    gap: 16,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  primaryButton: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  rowItem: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  toggleText: {
    fontSize: 14,
  },
  toggleCta: {
    fontSize: 14,
    fontWeight: "700",
  },
});
