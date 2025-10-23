import React from "react";
import { Tabs } from "expo-router";
import { useColorScheme } from "react-native";

export default function SecondMenuLayout(): React.ReactElement {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const activeTint = isDarkMode ? "#FACC15" : "#0F172A";
  const inactiveTint = isDarkMode ? "#CBD5F5" : "#64748B";
  const backgroundColor = isDarkMode ? "#0F172A" : "#F8FAFC";
  const borderColor = isDarkMode ? "#1E293B" : "#CBD5E1";

  return (
    <Tabs
      initialRouteName="barbershop-news"
      screenOptions={{
        headerStyle: { backgroundColor },
        headerTitleStyle: { color: isDarkMode ? "#F8FAFC" : "#0F172A" },
        tabBarActiveTintColor: activeTint,
        tabBarInactiveTintColor: inactiveTint,
        tabBarStyle: {
          backgroundColor,
          borderTopColor: borderColor,
        },
        tabBarLabelStyle: { fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="barbershop-news"
        options={{
          title: "Barbershop news",
        }}
      />
      <Tabs.Screen
        name="barbershop-online-products"
        options={{
          title: "Online products",
        }}
      />
    </Tabs>
  );
}
