import React, { useMemo } from "react";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import {
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
    intro: {
      title: "Launch-ready online products",
      subtitle:
        "Bundle your services with digital add-ons to generate revenue even when the chairs are empty.",
    },
    ctaLabel: "Add to storefront",
    ctaHint: "Add this product to your online storefront",
    products: [
      {
        id: "style-guides",
        title: "Seasonal style guide pack",
        description:
          "A downloadable PDF with curated cuts, product recommendations, and styling tips for the season.",
        price: "$18",
        icon: "content-save-outline" as const,
      },
      {
        id: "membership",
        title: "VIP grooming membership",
        description:
          "Offer unlimited touch-ups, priority booking, and exclusive retail discounts via subscription.",
        price: "$59/mo",
        icon: "crown-outline" as const,
      },
      {
        id: "video-course",
        title: "At-home beard mastery course",
        description:
          "A five-part video course guiding clients through professional beard maintenance routines.",
        price: "$32",
        icon: "video-account" as const,
      },
    ],
    tips: {
      title: "Implementation tips",
      items: [
        "Use booking confirmation emails to promote digital bundles.",
        "Enable recurring billing to reduce churn on memberships.",
        "Pair online exclusives with in-shop loyalty rewards.",
      ],
    },
  },
  pt: {
    intro: {
      title: "Produtos online prontos para lançar",
      subtitle:
        "Combine seus serviços com complementos digitais para faturar mesmo fora do horário de atendimento.",
    },
    ctaLabel: "Adicionar à vitrine",
    ctaHint: "Adicionar este produto à vitrine online",
    products: [
      {
        id: "style-guides",
        title: "Pacote de guias de estilo",
        description:
          "PDF para download com cortes selecionados, recomendações de produtos e dicas para a estação.",
        price: "R$ 89",
        icon: "content-save-outline" as const,
      },
      {
        id: "membership",
        title: "Clube VIP de grooming",
        description:
          "Ofereça retoques ilimitados, agendamento prioritário e descontos exclusivos com assinatura.",
        price: "R$ 289/mês",
        icon: "crown-outline" as const,
      },
      {
        id: "video-course",
        title: "Curso de barba em casa",
        description:
          "Série com cinco aulas em vídeo orientando clientes sobre manutenção profissional da barba.",
        price: "R$ 149",
        icon: "video-account" as const,
      },
    ],
    tips: {
      title: "Dicas de implementação",
      items: [
        "Use o e-mail de confirmação para divulgar pacotes digitais.",
        "Ative cobrança recorrente para reduzir cancelamentos nas assinaturas.",
        "Combine exclusivos online com recompensas presenciais.",
      ],
    },
  },
};

type LocaleKey = keyof typeof COPY;

function resolveLocale(): LocaleKey {
  const locale = Localization.locale?.toLowerCase() ?? "en";
  return locale.startsWith("pt") ? "pt" : "en";
}

export default function BarbershopOnlineProductsScreen(): React.ReactElement {
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
      accent: "#f97316",
    }),
    [isDark],
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      <View style={[styles.introCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.introTitle, { color: colors.text }]}>{copy.intro.title}</Text>
        <Text style={[styles.introSubtitle, { color: colors.subtext }]}>{copy.intro.subtitle}</Text>
      </View>

      <View style={styles.products}>
        {copy.products.map((product) => (
          <View
            key={product.id}
            style={[styles.productCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={styles.productHeader}>
              <View style={[styles.iconBadge, { backgroundColor: `${colors.accent}1A` }]}> 
                <MaterialCommunityIcons name={product.icon} size={22} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.productTitle, { color: colors.text }]}>{product.title}</Text>
                <Text style={[styles.productDescription, { color: colors.subtext }]}>{product.description}</Text>
              </View>
            </View>

            <View style={styles.productFooter}>
              <View style={styles.priceTag}>
                <Ionicons name="pricetag-outline" size={16} color={colors.accent} />
                <Text style={[styles.priceText, { color: colors.accent }]}>{product.price}</Text>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.cta,
                  {
                    backgroundColor: colors.accent,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityHint={copy.ctaHint}
              >
                <Text style={styles.ctaLabel}>{copy.ctaLabel}</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>

      <View style={[styles.tipsCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
        <Text style={[styles.tipsTitle, { color: colors.text }]}>{copy.tips.title}</Text>
        {copy.tips.items.map((tip) => (
          <View key={tip} style={styles.tipRow}>
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.accent} />
            <Text style={[styles.tipText, { color: colors.subtext }]}>{tip}</Text>
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
  introCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  introSubtitle: {
    fontSize: 15,
    lineHeight: 21,
  },
  products: {
    gap: 16,
  },
  productCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 16,
  },
  productHeader: {
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
  productTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  productFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  priceTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "transparent",
  },
  priceText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  cta: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  ctaLabel: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  tipsCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
