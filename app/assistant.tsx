import React from "react";

import AuthenticatedApp, {
  type AssistantScreenProps,
  type AssistantScreenRenderer,
} from "../src/app/AuthenticatedApp";
import AssistantChat from "../src/components/AssistantChat";
import { useAuthenticatedAppNavigation } from "../src/app/navigation";
import { bookingsRenderer } from "./(tabs)/bookings";
import { cashRegisterRenderer } from "./(tabs)/cash-register";
import { productsRenderer } from "./products";
import { servicesRenderer } from "./services";

export function AssistantScreen({
  colors,
  assistantCopy,
  assistantSystemPrompt,
  assistantContextSummary,
  handleBookingsMutated,
  localizedServices,
}: AssistantScreenProps): React.ReactElement {
  return (
    <AssistantChat
      colors={{
        text: colors.text,
        subtext: colors.subtext,
        surface: colors.surface,
        border: colors.border,
        accent: colors.accent,
        accentFgOn: colors.accentFgOn,
        danger: colors.danger,
        bg: colors.bg,
      }}
      systemPrompt={assistantSystemPrompt}
      contextSummary={assistantContextSummary}
      onBookingsMutated={handleBookingsMutated}
      services={localizedServices}
      copy={assistantCopy.chat}
    />
  );
}

export const assistantRenderer: AssistantScreenRenderer = (props) => (
  <AssistantScreen {...props} />
);

export default function Assistant(): React.ReactElement {
  const handleNavigate = useAuthenticatedAppNavigation();

  return (
    <AuthenticatedApp
      initialScreen="assistant"
      onNavigate={handleNavigate}
      renderAssistant={assistantRenderer}
      renderBookings={bookingsRenderer}
      renderCashRegister={cashRegisterRenderer}
      renderProducts={productsRenderer}
      renderServices={servicesRenderer}
    />
  );
}
