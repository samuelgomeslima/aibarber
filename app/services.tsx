import React from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import AuthenticatedApp, {
  type ServicesScreenProps,
  type ServicesScreenRenderer,
} from "../src/app/AuthenticatedApp";
import ServiceForm from "../src/components/ServiceForm";
import { formatPrice } from "../src/lib/domain";
import { cashRegisterRenderer } from "../src/app/screens/cash-register";
import { bookingsRenderer } from "../src/app/screens/bookings";
import { productsRenderer } from "./products";

export function ServicesScreen({
  isCompactLayout,
  colors,
  styles,
  servicesCopy,
  servicesLoading,
  loadServices,
  handleOpenCreateService,
  serviceFormVisible,
  serviceFormMode,
  serviceBeingEdited,
  handleServiceCreated,
  handleServiceUpdated,
  handleServiceFormClose,
  serviceFormCopy,
  services,
  localizedServiceMap,
  handleOpenEditService,
  handleDeleteService,
}: ServicesScreenProps): React.ReactElement {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: isCompactLayout ? 16 : 20, gap: 16 }}
      refreshControl={<RefreshControl refreshing={servicesLoading} onRefresh={loadServices} />}
    >
      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 12 }]}>
        <View style={[styles.listHeaderRow, isCompactLayout && styles.listHeaderRowCompact]}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.title, { color: colors.text }]}>{servicesCopy.title}</Text>
            <Text style={{ color: colors.subtext, fontSize: 13, fontWeight: "600" }}>
              {servicesCopy.subtitle}
            </Text>
          </View>
          <Pressable
            onPress={handleOpenCreateService}
            style={[styles.defaultCta, { marginTop: 0 }, isCompactLayout && styles.fullWidthButton]}
            accessibilityRole="button"
            accessibilityLabel={servicesCopy.createCta.accessibility}
          >
            <Text style={styles.defaultCtaText}>{servicesCopy.createCta.label}</Text>
          </Pressable>
        </View>
      </View>

      {serviceFormVisible ? (
        <ServiceForm
          mode={serviceFormMode}
          service={serviceFormMode === "edit" ? serviceBeingEdited : null}
          onCreated={handleServiceCreated}
          onUpdated={handleServiceUpdated}
          onCancel={handleServiceFormClose}
          colors={{
            text: colors.text,
            subtext: colors.subtext,
            border: colors.border,
            surface: colors.surface,
            accent: colors.accent,
            accentFgOn: colors.accentFgOn,
            danger: colors.danger,
          }}
          copy={serviceFormCopy}
        />
      ) : null}

      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, gap: 12 }]}>
        <Text style={[styles.title, { color: colors.text }]}>{servicesCopy.listTitle}</Text>
        {services.length === 0 ? (
          <Text style={[styles.empty, { marginVertical: 8 }]}>{servicesCopy.empty}</Text>
        ) : (
          services.map((svc) => {
            const localized = localizedServiceMap.get(svc.id) ?? svc;
            return (
              <View key={svc.id} style={styles.serviceRow}>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1, flexWrap: "wrap" }}
                >
                  <MaterialCommunityIcons name={svc.icon} size={22} color={colors.accent} />
                  <View>
                    <Text style={{ color: colors.text, fontWeight: "800" }}>{localized.name}</Text>
                    <Text style={{ color: colors.subtext, fontSize: 12 }}>
                      {servicesCopy.serviceMeta(svc.estimated_minutes, formatPrice(svc.price_cents))}
                    </Text>
                  </View>
                </View>
                <View style={styles.serviceActions}>
                  <Pressable
                    onPress={() => handleOpenEditService(svc)}
                    style={[styles.smallBtn, { borderColor: colors.border }]}
                    accessibilityRole="button"
                    accessibilityLabel={servicesCopy.actions.edit.accessibility(localized.name)}
                  >
                    <Text style={{ color: colors.subtext, fontWeight: "800" }}>
                      {servicesCopy.actions.edit.label}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => handleDeleteService(svc)}
                    style={[
                      styles.smallBtn,
                      {
                        borderColor: colors.danger,
                        backgroundColor: "rgba(239,68,68,0.1)",
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={servicesCopy.actions.delete.accessibility(localized.name)}
                  >
                    <Text style={{ color: colors.danger, fontWeight: "800" }}>
                      {servicesCopy.actions.delete.label}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

export const servicesRenderer: ServicesScreenRenderer = (props) => <ServicesScreen {...props} />;

export default function Services(): React.ReactElement {
  return (
    <AuthenticatedApp
      initialScreen="services"
      renderBookings={bookingsRenderer}
      renderCashRegister={cashRegisterRenderer}
      renderProducts={productsRenderer}
      renderServices={servicesRenderer}
    />
  );
}
