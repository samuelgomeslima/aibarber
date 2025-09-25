const API_URL = "https://api.openai.com/v1/chat/completions";
const API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export const isOpenAiConfigured = typeof API_KEY === "string" && API_KEY.length > 0;

function buildErrorMessage(status: number, body: any) {
  if (body && typeof body === "object" && "error" in body) {
    const err = (body as any).error;
    if (err && typeof err === "object" && "message" in err) {
      return String(err.message);
    }
  }
  if (status >= 400 && status < 500) return `Request failed with status ${status}.`;
  if (status >= 500) return "OpenAI service is currently unavailable.";
  return "Unexpected error calling OpenAI.";
}

export async function fetchAssistantReply(messages: ChatMessage[]): Promise<string> {
  if (!isOpenAiConfigured) {
    throw new Error("OpenAI API key is not configured. Set EXPO_PUBLIC_OPENAI_API_KEY in your environment.");
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages,
    }),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(buildErrorMessage(response.status, body));
  }

  const content = body?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenAI assistant did not return any content.");
  }

  return content.trim();
}