import React from "react";
import { Tabs } from "expo-router";

export default function TabLayout(): React.ReactElement {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
      }}
    >
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Bookings",
          unmountOnBlur: true,
        }}
      />
      <Tabs.Screen
        name="cash-register"
        options={{
          title: "Cash register",
          unmountOnBlur: true,
        }}
      />
    </Tabs>
  );
}
