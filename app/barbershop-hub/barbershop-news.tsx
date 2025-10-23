import React, { useMemo } from "react";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import {
  Linking,
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
    introTitle: "Latest highlights",
    introSubtitle: "Stay ahead with curated industry updates.",
    readMore: "Read more",
    readMoreAccessibility: "Open article",
    sections: [
      {
        id: "ai-trends",
        title: "AI-assisted grooming takes center stage",
        summary:
          "Stylists report a 25% increase in repeat bookings after introducing AI-assisted style previews.",
        url: "https://example.com/ai-barbershop-trends",
        icon: "robot-excited-outline" as const,
      },
      {
        id: "community",
        title: "Community pop-ups drive new customers",
        summary:
          "Weekend pop-up events with local artists are converting walk-ins into loyal memberships in major cities.",
        url: "https://example.com/barbershop-community",
        icon: "account-group-outline" as const,
      },
      {
        id: "education",
        title: "Certification programs now available online",
        summary:
          "Regional barber councils have launched online certifications to help teams train without leaving the shop.",
        url: "https://example.com/barber-education",
        icon: "certificate-outline" as const,
      },
    ],
  },
  pt: {
    introTitle: "Destaques recentes",
    introSubtitle: "Fique por dentro das novidades do setor.",
    readMore: "Ler matéria",
    readMoreAccessibility: "Abrir notícia",
    sections: [
      {
        id: "ai-trends",
        title: "Cuidados assistidos por IA ganham destaque",
        summary:
          "Profissionais registram aumento de 25% nas recorrências após incluir prévias com IA no atendimento.",
        url: "https://example.com/ai-barbershop-trends",
        icon: "robot-excited-outline" as const,
      },
      {
        id: "community",
        title: "Eventos locais atraem novos clientes",
        summary:
          "Eventos com artistas da região aos fins de semana têm convertido visitantes em assinantes fiéis.",
        url: "https://example.com/barbershop-community",
        icon: "account-group-outline" as const,
      },
      {
        id: "education",
        title: "Programas de certificação disponíveis online",
        summary:
          "Conselhos regionais lançaram certificações digitais para treinar a equipe sem precisar sair da barbearia.",
        url: "https://example.com/barber-education",
        icon: "certificate-outline" as const,
      },
    ],
  },
};

type LocaleKey = keyof typeof COPY;

function resolveLocale(): LocaleKey {
  const locale = Localization.locale?.toLowerCase() ?? "en";
  return locale.startsWith("pt") ? "pt" : "en";
}

export default function BarbershopNewsScreen(): React.ReactElement {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const locale = useMemo(resolveLocale, []);
  const copy = COPY[locale];

  const colors = useMemo(
    () => ({
      background: isDark ? "#0a0f1f" : "#f8fafc",
      card: isDark ? "#111827" : "#ffffff",
      border: isDark ? "#1f2937" : "#e2e8f0",
      text: isDark ? "#f9fafb" : "#0f172a",
      subtext: isDark ? "#cbd5f5" : "#475569",
      accent: "#38bdf8",
    }),
    [isDark],
  );

  const handleOpenArticle = (url: string) => {
    Linking.openURL(url).catch(() => {
      // no-op: gracefully ignore failures in offline environments
    });
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{copy.introTitle}</Text>
        <Text style={[styles.headerSubtitle, { color: colors.subtext }]}>{copy.introSubtitle}</Text>
      </View>

      <View style={styles.sections}>
        {copy.sections.map((section) => (
          <View
            key={section.id}
            style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={styles.sectionHeader}>
              <View style={[styles.iconBadge, { backgroundColor: `${colors.accent}1A` }]}> 
                <MaterialCommunityIcons name={section.icon} size={22} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
                <Text style={[styles.sectionSummary, { color: colors.subtext }]}>{section.summary}</Text>
              </View>
            </View>

            <Pressable
              onPress={() => handleOpenArticle(section.url)}
              style={({ pressed }) => [
                styles.sectionCta,
                {
                  backgroundColor: colors.accent,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              accessibilityRole="link"
              accessibilityHint={copy.readMoreAccessibility}
            >
              <Ionicons name="open-outline" size={16} color="#0f172a" />
              <Text style={styles.sectionCtaLabel}>{copy.readMore}</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 20,
  },
  headerCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    lineHeight: 21,
  },
  sections: {
    gap: 16,
  },
  sectionCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  sectionSummary: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionCta: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionCtaLabel: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
});
