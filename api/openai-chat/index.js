const DEFAULT_CHAT_MODEL = process.env.OPENAI_DEFAULT_CHAT_MODEL || "gpt-4o-mini";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_BASE_URL = (process.env.OPENAI_API_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");

function pickErrorMessage(payload) {
  if (!payload) return null;
  if (typeof payload === "string") return payload;
  if (typeof payload === "object") {
    if (typeof payload.error === "string") return payload.error;
    if (payload.error && typeof payload.error.message === "string") return payload.error.message;
    if (typeof payload.message === "string") return payload.message;
  }
  return null;
}

module.exports = async function (context, req) {
  if (req.method !== "POST") {
    return {
      status: 405,
      headers: { "Allow": "POST" },
      body: { error: "Method not allowed" },
    };
  }

  if (!OPENAI_API_KEY) {
    return {
      status: 500,
      body: { error: "OPENAI_API_KEY is not configured on the server." },
    };
  }

  const body = req.body || {};
  const payload = {
    model: DEFAULT_CHAT_MODEL,
    temperature: 0.7,
    ...body,
  };

  try {
    const response = await fetch(`${OPENAI_API_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!response.ok) {
      const message = pickErrorMessage(data) || `OpenAI request failed with status ${response.status}.`;
      context.log.error("OpenAI chat completion failed", message);
      return {
        status: response.status,
        body: { error: message },
      };
    }

    return {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: data,
    };
  } catch (error) {
    context.log.error("Unexpected error calling OpenAI chat completion", error);
    return {
      status: 500,
      body: { error: "Unexpected error calling OpenAI chat completion." },
    };
  }
};
