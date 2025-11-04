import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import type { Customer } from "../../lib/bookings";
import type { SupportedLanguage } from "../../locales/language";
import { LANGUAGE_COPY } from "../copy/authenticatedAppCopy";
import type { ThemeColors } from "../../theme/theme";
import type { AuthenticatedAppStyles } from "../styles/authenticatedAppStyles";
import UserForm from "../../components/UserForm";

type ClientModalCopy = (typeof LANGUAGE_COPY)[SupportedLanguage]["bookService"]["clientModal"];

type ClientModalProps = {
  visible: boolean;
  onClose: () => void;
  customers: Customer[];
  loading: boolean;
  onRefreshQuery: (query: string) => void;
  onPick: (customer: Customer) => void;
  onSaved: (customer: Customer) => void;
  copy: ClientModalCopy;
  colors: ThemeColors;
  styles: AuthenticatedAppStyles;
};

export default function ClientModal({
  visible,
  onClose,
  customers,
  loading,
  onRefreshQuery,
  onPick,
  onSaved,
  copy,
  colors,
  styles,
}: ClientModalProps) {
  const [tab, setTab] = useState<"list" | "create">("list");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (visible) {
      setTab("list");
      setQuery("");
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.sidebarBg, borderColor: colors.border }]}>
          <View style={styles.sheetHeader}>
            <Text style={{ color: colors.text, fontWeight: "900", fontSize: 16 }}>{copy.title}</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.subtext} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() => setTab("list")}
                style={[styles.tab, tab === "list" && { backgroundColor: colors.accent, borderColor: colors.accent }]}
              >
                <Text style={[styles.tabText, tab === "list" && { color: colors.accentFgOn }]}>{copy.tabs.list}</Text>
              </Pressable>
              <Pressable
                onPress={() => setTab("create")}
                style={[styles.tab, tab === "create" && { backgroundColor: colors.accent, borderColor: colors.accent }]}
              >
                <Text style={[styles.tabText, tab === "create" && { color: colors.accentFgOn }]}>{copy.tabs.create}</Text>
              </Pressable>
            </View>

            {tab === "list" ? (
              <View style={{ gap: 10 }}>
                {Platform.OS === "web" && (
                  <input
                    placeholder={copy.searchPlaceholder}
                    value={query}
                    onChange={(event: any) => setQuery(String(event.target.value))}
                    onKeyDown={(event: any) => {
                      if (event.key === "Enter") onRefreshQuery(query);
                    }}
                    style={{
                      padding: 10,
                      borderRadius: 10,
                      width: "100%",
                      border: `1px solid ${colors.border}`,
                      background: colors.surface,
                      color: colors.text,
                      fontWeight: 700,
                      fontSize: 16,
                    }}
                  />
                )}
                <Pressable
                  onPress={() => onRefreshQuery(query)}
                  style={[styles.smallBtn, { alignSelf: "flex-start", borderColor: colors.border }]}
                >
                  <Text style={{ color: colors.subtext, fontWeight: "800" }}>{copy.searchButton}</Text>
                </Pressable>

                <View style={[styles.card, { gap: 6 }]}>
                  {loading ? (
                    <ActivityIndicator />
                  ) : customers.length === 0 ? (
                    <Text style={{ color: colors.subtext }}>{copy.empty}</Text>
                  ) : (
                    customers.map((customer) => (
                      <Pressable key={customer.id} onPress={() => onPick(customer)} style={styles.listRow}>
                        <MaterialCommunityIcons name="account" size={18} color={colors.accent} />
                        <Text style={{ color: colors.text, fontWeight: "800" }}>
                          {customer.first_name} {customer.last_name}
                        </Text>
                        {customer.email ? (
                          <Text style={{ color: colors.subtext, marginLeft: 6, fontSize: 12 }}>{customer.email}</Text>
                        ) : null}
                      </Pressable>
                    ))
                  )}
                </View>
              </View>
            ) : (
              <View style={{ marginTop: 4 }}>
                <UserForm
                  onSaved={(row) => {
                    onSaved({
                      id: row.id,
                      first_name: row.first_name,
                      last_name: row.last_name,
                      phone: row.phone,
                      email: row.email,
                      date_of_birth: row.date_of_birth,
                    });
                    onClose();
                  }}
                  onCancel={() => setTab("list")}
                  colors={{
                    text: colors.text,
                    subtext: colors.subtext,
                    border: colors.border,
                    surface: colors.surface,
                    accent: colors.accent,
                    accentFgOn: colors.accentFgOn,
                    danger: colors.danger,
                  }}
                  copy={copy.userForm}
                />
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
