import React from "react";
import { Slot } from "expo-router";

import { SidebarLayout } from "../../src/components/navigation/SidebarLayout";
import { SidebarProvider } from "../../src/providers/SidebarProvider";

export default function DashboardLayout(): React.ReactElement {
  return (
    <SidebarProvider>
      <SidebarLayout>
        <Slot />
      </SidebarLayout>
    </SidebarProvider>
  );
}

