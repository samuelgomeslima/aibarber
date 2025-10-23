import React, { useMemo } from "react";
import { Link } from "expo-router";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import * as Localization from "expo-localization";

const COPY = {
  en: {
    title: "Barbershop hub",
    subtitle: "Discover updates and digital tools to grow your barbershop.",
    menu: [
      {
        title: "Barbershop news",
        description: "Read the latest announcements curated for barbershop owners.",
        href: "/barbershop-hub/barbershop-news",
        icon: "newspaper-variant-outline" as const,
      },
      {
        title: "Online products",
        description: "Explore digital items and retail bundles ready to sell online.",
        href: "/barbershop-hub/barbershop-online-products",
        icon: "shopping-outline" as const,
      },
    ],
  },
  pt: {
    title: "Central da barbearia",
    subtitle: "Confira novidades e ferramentas digitais para expandir sua barbearia.",
    menu: [
      {
        title: "Notícias da barbearia",
        description: "Leia os anúncios mais recentes selecionados para donos de barbearia.",
        href: "/barbershop-hub/barbershop-news",
        icon: "newspaper-variant-outline" as const,
      },
      {
        title: "Produtos online",
        description: "Conheça itens digitais e kits prontos para vender pela internet.",
        href: "/barbershop-hub/barbershop-online-products",
        icon: "shopping-outline" as const,
      },
    ],
  },
};

type LocaleKey = keyof typeof COPY;

function resolveLocale(): LocaleKey {
  const locale = Localization.locale?.toLowerCase() ?? "en";
  return locale.startsWith("pt") ? "pt" : "en";
}

export default function BarbershopHubMenu(): React.ReactElement {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const locale = useMemo(resolveLocale, []);
  const copy = COPY[locale];

  const colors = useMemo(
    () => ({
      background: isDark ? "#0f172a" : "#f8fafc",
      card: isDark ? "#111827" : "#ffffff",
      border: isDark ? "#1f2937" : "#e2e8f0",
      text: isDark ? "#f9fafb" : "#0f172a",
      subtext: isDark ? "#cbd5f5" : "#475569",
      accent: "#7C3AED",
    }),
    [isDark],
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      <View style={[styles.content, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>{copy.title}</Text>
            <Text style={[styles.subtitle, { color: colors.subtext }]}>{copy.subtitle}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Ionicons name="sparkles-outline" size={16} color={colors.accent} />
            <Text style={[styles.badgeLabel, { color: colors.accent }]}>AIBarber</Text>
          </View>
        </View>

        <View style={styles.menu}>
          {copy.menu.map((item) => (
            <Link key={item.href} href={item.href} asChild>
              <Pressable
                style={({ pressed }) => [
                  styles.menuItem,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.card,
                    opacity: pressed ? 0.85 : 1,
                    shadowOpacity: isDark ? 0.35 : 0.08,
                  },
                  Platform.select({
                    web: {
                      transform: [{ translateY: pressed ? 1 : 0 }],
                    },
                  }),
                ]}
                accessibilityRole="button"
                accessibilityLabel={item.title}
              >
                <View style={[styles.menuIcon, { backgroundColor: `${colors.accent}1A` }]}> 
                  <MaterialCommunityIcons name={item.icon} size={22} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuTitle, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[styles.menuDescription, { color: colors.subtext }]}>{item.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
              </Pressable>
            </Link>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  content: {
    borderRadius: 20,
    padding: 24,
    gap: 24,
    borderWidth: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
    lineHeight: 22,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 6,
    borderWidth: 1,
  },
  badgeLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  menu: {
    gap: 16,
  },
  menuItem: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
});
