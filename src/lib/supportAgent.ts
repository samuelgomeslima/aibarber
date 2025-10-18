import type { ConversationMessage } from "./bookingAgent";
import { fetchAssistantReply } from "./openai";

type SupportAgentOptions = {
  systemPrompt: string;
  contextSummary?: string;
  conversation: ConversationMessage[];
};

export async function runSupportAgent({
  systemPrompt,
  contextSummary = "",
  conversation,
}: SupportAgentOptions): Promise<string> {
  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...(contextSummary.trim()
      ? [{ role: "system" as const, content: contextSummary.trim() }]
      : []),
    ...conversation.map((message) => ({ role: message.role, content: message.content })),
  ];

  return fetchAssistantReply(messages);
}
