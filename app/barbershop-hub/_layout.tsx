import React from "react";
import { Stack } from "expo-router";
import { useColorScheme } from "react-native";

const LIGHT_HEADER_BG = "#ffffff";
const DARK_HEADER_BG = "#121212";

export default function BarbershopHubLayout(): React.ReactElement {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: isDark ? DARK_HEADER_BG : LIGHT_HEADER_BG,
        },
        headerTintColor: isDark ? "#f3f4f6" : "#111827",
        headerTitleStyle: {
          fontWeight: "700",
        },
        contentStyle: {
          backgroundColor: isDark ? "#0a0a0a" : "#f9fafb",
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Barbershop hub",
          headerLargeTitle: true,
          headerLargeTitleShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="barbershop-news"
        options={{
          title: "Barbershop news",
        }}
      />
      <Stack.Screen
        name="barbershop-online-products"
        options={{
          title: "Online products",
          headerRight: () => null,
        }}
      />
    </Stack>
  );
}
