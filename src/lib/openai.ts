const PROXY_URL = "/api/openai-proxy";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

// Optional: runtime health probe (client-side way to check config)
export async function isOpenAiConfigured(): Promise<boolean> {
  try {
    const res = await fetch(PROXY_URL, { method: "GET" });
    return res.status === 204;
  } catch {
    return false;
  }
}

function buildErrorMessage(status: number, body: any) {
  if (body && typeof body === "object" && "error" in body) {
    const err = (body as any).error;
    if (err && typeof err === "object" && "message" in err) {
      return String(err.message);
    }
    if (typeof err === "string") return err;
  }
  if (status >= 400 && status < 500) return `Request failed with status ${status}.`;
  if (status >= 500) return "OpenAI service is currently unavailable.";
  return "Unexpected error calling OpenAI.";
}

export async function fetchAssistantReply(messages: ChatMessage[]): Promise<string> {
  const response = await fetch(PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages,
    }),
  });

  let body: any = null;
  try {
    body = await response.json();
  } catch {
    // pass
  }

  if (!response.ok) {
    throw new Error(buildErrorMessage(response.status, body));
  }

  const content = body?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenAI assistant did not return any content.");
  }

  return content.trim();
}
