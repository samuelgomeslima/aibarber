import React, { useMemo } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View, useColorScheme } from "react-native";
import { Navigate, Route, Routes, useLocation, useNavigate } from "../vendor/react-router-dom";

import OverviewPage from "./pages/OverviewPage";
import BookServicePage from "./pages/BookServicePage";
import BookingsPage from "./pages/BookingsPage";
import ServicesPage from "./pages/ServicesPage";
import PackagesPage from "./pages/PackagesPage";
import ProductsPage from "./pages/ProductsPage";
import CashRegisterPage from "./pages/CashRegisterPage";
import AssistantPage from "./pages/AssistantPage";
import SupportPage from "./pages/SupportPage";
import TeamPage from "./pages/TeamPage";
import BarbershopSettingsPage from "./pages/BarbershopSettingsPage";
import SettingsPage from "./pages/SettingsPage";

const NAVIGATION = [
  {
    path: "/",
    title: "Overview",
    description: "See a high level summary of your barbershop performance.",
    component: OverviewPage,
  },
  {
    path: "/bookings/new",
    title: "Book a service",
    description: "Schedule a new appointment for a customer.",
    component: BookServicePage,
  },
  {
    path: "/bookings",
    title: "Bookings",
    description: "Inspect the complete list of scheduled services.",
    component: BookingsPage,
  },
  {
    path: "/services",
    title: "Services",
    description: "Manage the catalog of services that your barbers offer.",
    component: ServicesPage,
  },
  {
    path: "/packages",
    title: "Packages",
    description: "Create and curate bundled service packages.",
    component: PackagesPage,
  },
  {
    path: "/products",
    title: "Products",
    description: "Track product inventory and sales.",
    component: ProductsPage,
  },
  {
    path: "/cash-register",
    title: "Cash register",
    description: "Record service payments and cash adjustments.",
    component: CashRegisterPage,
  },
  {
    path: "/assistant",
    title: "Assistant",
    description: "Chat with the AI assistant to manage daily operations.",
    component: AssistantPage,
  },
  {
    path: "/support",
    title: "Support",
    description: "Get help from the AIBarber support team.",
    component: SupportPage,
  },
  {
    path: "/team",
    title: "Team",
    description: "Review and update your barbershop staff members.",
    component: TeamPage,
  },
  {
    path: "/barbershop",
    title: "Barbershop",
    description: "Adjust barbershop details like slug and timezone.",
    component: BarbershopSettingsPage,
  },
  {
    path: "/settings",
    title: "Settings",
    description: "Change language, theme and account preferences.",
    component: SettingsPage,
  },
] as const;

type NavigationItem = (typeof NAVIGATION)[number];

function useTheme() {
  const colorScheme = useColorScheme();
  return useMemo(
    () =>
      colorScheme === "dark"
        ? {
            background: "#111",
            sidebar: "#181818",
            text: "#f1f1f1",
            muted: "#b8b8b8",
            accent: "#d4af37",
          }
        : {
            background: "#f8f8f8",
            sidebar: "#fff",
            text: "#202020",
            muted: "#595959",
            accent: "#2f855a",
          },
    [colorScheme],
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
    width: "100%",
  },
  sidebar: {
    width: 260,
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 12,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
  sidebarItem: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 4,
  },
  sidebarItemTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  sidebarItemDescription: {
    fontSize: 12,
  },
  content: {
    flex: 1,
    backgroundColor: "transparent",
  },
});

function SidebarItem({
  item,
  active,
  onPress,
  accentColor,
  textColor,
  mutedColor,
}: {
  item: NavigationItem;
  active: boolean;
  onPress: () => void;
  accentColor: string;
  textColor: string;
  mutedColor: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.sidebarItem, { backgroundColor: active ? accentColor : "transparent" }]}
    >
      <Text style={[styles.sidebarItemTitle, { color: active ? "#fff" : textColor }]}>{item.title}</Text>
      <Text style={[styles.sidebarItemDescription, { color: active ? "#fefefe" : mutedColor }]}>
        {item.description}
      </Text>
    </Pressable>
  );
}

function PageRoutes() {
  return (
    <Routes>
      {NAVIGATION.map(({ path, title, description, component: Component }) => (
        <Route key={path} path={path} element={<Component title={title} description={description} />} />
      ))}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function AuthenticatedApp() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}> 
      <View style={[styles.sidebar, { backgroundColor: theme.sidebar, borderRightColor: theme.muted }]}> 
        <Text style={[styles.sidebarTitle, { color: theme.text }]}>AIBarber Dashboard</Text> 
        <ScrollView showsVerticalScrollIndicator={false}> 
          <View style={{ gap: 8 }}> 
            {NAVIGATION.map((item) => ( 
              <SidebarItem 
                key={item.path} 
                item={item} 
                active={pathname === item.path} 
                onPress={() => navigate(item.path)} 
                accentColor={theme.accent} 
                textColor={theme.text} 
                mutedColor={theme.muted} 
              /> 
            ))} 
          </View> 
        </ScrollView> 
      </View> 
      <View style={styles.content}> 
        <PageRoutes /> 
      </View> 
    </SafeAreaView>
  );
}
