import React from "react";
import { Tabs } from "expo-router";

export default function CashRegisterTabsLayout(): React.ReactElement {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBar: () => null,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Cash register" }} />
    </Tabs>
  );
}
