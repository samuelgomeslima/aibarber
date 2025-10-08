import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { supabase } from "../lib/supabase";
import { defaultComponentCopy } from "../locales/componentCopy";
import type { UserFormCopy } from "../locales/types";
import { subtleFormCardColors, type SubtleFormCardColors } from "../theme/colors";

const DEFAULT_FORM_AGE = 18;
const MINIMUM_AGE = 13;

/* ========= Types ========= */
export type NewUser = {
  firstName: string;
  lastName: string;
  phone: string;        // digits
  email: string;
  date_of_birth: Date;  // <-- renamed
};

type UserFormErrors = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  date_of_birth?: string;
};

/* ========= Component ========= */
export default function UserForm({
  initial,
  onSaved, // optional callback after successful save
  onCancel,
  colors = subtleFormCardColors,
  copy = defaultComponentCopy.userForm,
  table = "customers",
}: {
  initial?: Partial<NewUser>;
  onSaved?: (row: { id: string } & Record<string, any>) => void;
  onCancel?: () => void;
  colors?: SubtleFormCardColors;
  copy?: UserFormCopy;
  table?: string;
}) {
  const [firstName, setFirstName]     = useState(initial?.firstName ?? "");
  const [lastName, setLastName]       = useState(initial?.lastName ?? "");
  const [phoneRaw, setPhoneRaw]       = useState(initial?.phone ?? "");
  const [email, setEmail]             = useState(initial?.email ?? "");
  const [dateOfBirth, setDateOfBirth] = useState<Date>(
    initial?.date_of_birth ?? todayMinusYears(DEFAULT_FORM_AGE),
  );
  const [saving, setSaving]           = useState(false);

  // phone mask (store digits)
  const phoneDigits = phoneRaw.replace(/\D/g, "");
  const phoneMasked = useMemo(() => formatPhone(phoneDigits), [phoneDigits]);

  // validation
  const errs = useMemo<UserFormErrors>(() => {
    const e: UserFormErrors = {};
    if (!firstName.trim()) e.firstName = copy.fields.firstName.required;
    if (!lastName.trim()) e.lastName = copy.fields.lastName.required;
    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      e.phone = copy.fields.phone.invalid;
    }
    if (!EMAIL_RE.test(email.toLowerCase())) {
      e.email = copy.fields.email.invalid;
    }

    const dob = dateOfBirth;
    const now = new Date();
    if (!dob || Number.isNaN(dob.getTime())) {
      e.date_of_birth = copy.fields.dateOfBirth.invalid;
    } else if (dob > now) {
      e.date_of_birth = copy.fields.dateOfBirth.future;
    } else if (yearsBetween(dob, now) < MINIMUM_AGE) {
      e.date_of_birth = copy.fields.dateOfBirth.minAge(MINIMUM_AGE);
    }

    return e;
  }, [copy, dateOfBirth, email, firstName, lastName, phoneDigits]);

  const valid = Object.keys(errs).length === 0;

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      const payload = {
        first_name:    firstName.trim(),
        last_name:     lastName.trim(),
        phone:         phoneDigits,
        email:         email.trim(),
        date_of_birth: dateOfBirth.toISOString().slice(0, 10), // YYYY-MM-DD
      };

      const { data, error, status } = await supabase
        .from(table)
        .insert(payload)
        .select("id, first_name, last_name, phone, email, date_of_birth")
        .single();

      if (error) throw new Error(error.message || `Insert failed (${status})`);

      Alert.alert(copy.alerts.savedTitle, copy.alerts.savedMessage(payload.first_name, payload.last_name));
      onSaved?.(data as any);

      // reset
      setFirstName("");
      setLastName("");
      setPhoneRaw("");
      setEmail("");
      setDateOfBirth(todayMinusYears(DEFAULT_FORM_AGE));
    } catch (e: any) {
      Alert.alert(copy.alerts.failedTitle, e?.message ?? copy.alerts.failedFallback);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.text }]}>{copy.title}</Text>

        {/* First / Last */}
        <View style={styles.rowGap}>
          <FormField
            label={copy.fields.firstName.label}
            value={firstName}
            onChangeText={setFirstName}
            placeholder={copy.fields.firstName.placeholder}
            error={errs.firstName}
            colors={colors}
          />
          <FormField
            label={copy.fields.lastName.label}
            value={lastName}
            onChangeText={setLastName}
            placeholder={copy.fields.lastName.placeholder}
            error={errs.lastName}
            colors={colors}
          />
        </View>

        {/* Phone */}
        <FormField
          label={copy.fields.phone.label}
          value={phoneMasked}
          onChangeText={setPhoneRaw}
          keyboardType="phone-pad"
          placeholder={copy.fields.phone.placeholder}
          error={errs.phone}
          colors={colors}
        />

        {/* Email */}
        <FormField
          label={copy.fields.email.label}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder={copy.fields.email.placeholder}
          error={errs.email}
          colors={colors}
        />

        {/* Date of birth */}
        <Text style={[styles.label, { color: colors.subtext }]}>{copy.fields.dateOfBirth.label}</Text>
        <InlineDatePicker value={dateOfBirth} onChange={setDateOfBirth} colors={colors} />
        {errs.date_of_birth ? <Text style={[styles.error, { color: colors.danger }]}>{errs.date_of_birth}</Text> : null}

        {/* Actions */}
        <View style={styles.actions}>
          {onCancel && (
            <Pressable onPress={onCancel} style={[styles.btnGhost, { borderColor: colors.border }]}>
              <Text style={[styles.btnGhostText, { color: colors.subtext }]}>{copy.buttons.cancel}</Text>
            </Pressable>
          )}
          <Pressable
            disabled={!valid || saving}
            onPress={submit}
            style={[
              styles.btnPrimary,
              { backgroundColor: valid && !saving ? colors.accent : "#334155", borderColor: valid && !saving ? colors.accent : "#334155" },
            ]}
            accessibilityLabel={copy.buttons.submitAccessibility}
          >
            {saving ? (
              <ActivityIndicator color={colors.accentFgOn} />
            ) : (
              <Text style={[styles.btnPrimaryText, { color: colors.accentFgOn }]}>{copy.buttons.submit}</Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ========= Building blocks ========= */

function FormField({
  label,
  error,
  colors,
  ...rest
}: {
  label: string;
  error?: string;
  colors: SubtleFormCardColors;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={[styles.label, { color: colors.subtext }]}>{label}</Text>
      <TextInput
        {...rest}
        placeholderTextColor="#94a3b8"
        style={[
          styles.input,
          { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text },
          error && { borderColor: colors.danger },
        ]}
      />
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

function InlineDatePicker({
  value,
  onChange,
  colors,
}: {
  value: Date;
  onChange: (d: Date) => void;
  colors: SubtleFormCardColors;
}) {
  if (Platform.OS === "web") {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const toInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return (
      <input
        type="date"
        value={toInput(value)}
        onChange={(e: any) => {
          const [y, m, day] = String(e.target.value).split("-").map(Number);
          const d = new Date();
          d.setFullYear(y, m - 1, day);
          d.setHours(0, 0, 0, 0);
          onChange(d);
        }}
        style={{
          padding: 10,
          borderRadius: 10,
          border: `1px solid ${colors.border}`,
          background: colors.surface,
          color: colors.text,
          outline: "none",
          fontWeight: 700,
          width: "100%",
        }}
      />
    );
  }

  const RNDateTimePicker = require("@react-native-community/datetimepicker").default;
  return (
    <View style={{ marginBottom: 8 }}>
      <RNDateTimePicker
        mode="date"
        value={value}
        display={Platform.OS === "ios" ? "inline" : "calendar"}
        onChange={(_evt: unknown, d?: Date) => d && onChange(d)}
        themeVariant="dark"
        // @ts-ignore iOS
        textColor={colors.text}
      />
    </View>
  );
}

/* ========= Utils & styles ========= */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

function todayMinusYears(n: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n, d.getMonth(), d.getDate());
  d.setHours(0, 0, 0, 0);
  return d;
}
function yearsBetween(a: Date, b: Date) {
  let years = b.getFullYear() - a.getFullYear();
  const m = b.getMonth() - a.getMonth();
  if (m < 0 || (m === 0 && b.getDate() < a.getDate())) years--;
  return years;
}
function formatPhone(value: string) {
    // Remove tudo que não é número
    const digits = value.replace(/\D/g, "");
  
    // (XX) XXXXX-XXXX
    if (digits.length <= 2) {
      return `(${digits}`;
    }
    if (digits.length <= 6) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }
    if (digits.length <= 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  }

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  title: { fontWeight: "800", fontSize: 16, marginBottom: 6 },
  rowGap: { gap: 10 },
  label: { fontSize: 12, fontWeight: "800", marginBottom: 6, letterSpacing: 0.3 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontWeight: "700" },
  error: { marginTop: 4, fontSize: 12, fontWeight: "700" },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 6 },
  btnGhost: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1 },
  btnGhostText: { fontWeight: "800" },
  btnPrimary: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1 },
  btnPrimaryText: { fontWeight: "900", letterSpacing: 0.3 },
});
