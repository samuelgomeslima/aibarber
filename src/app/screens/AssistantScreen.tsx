import React from "react";

import AssistantChat from "../../components/AssistantChat";
import type { Service } from "../../lib/domain";
import type { SupportedLanguage } from "../../locales/language";
import type { AuthenticatedAppCopy } from "../copy/authenticatedAppCopy";
import type { ThemeColors } from "../../theme/theme";

export type AssistantScreenProps = {
  colors: ThemeColors;
  assistantCopy: AuthenticatedAppCopy[SupportedLanguage]["assistant"];
  assistantSystemPrompt: string;
  assistantContextSummary: string;
  handleBookingsMutated: () => Promise<void>;
  localizedServices: Service[];
};

export type AssistantScreenRenderer = (
  props: AssistantScreenProps,
) => React.ReactElement | null;

export const defaultAssistantRenderer: AssistantScreenRenderer = ({
  colors,
  assistantCopy,
  assistantSystemPrompt,
  assistantContextSummary,
  handleBookingsMutated,
  localizedServices,
}) => (
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
