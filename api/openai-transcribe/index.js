const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_BASE_URL = (process.env.OPENAI_API_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");

function toBuffer(value) {
  if (!value) {
    return null;
  }
  if (Buffer.isBuffer(value)) {
    return value;
  }
  if (typeof value === "string") {
    return Buffer.from(value);
  }
  if (value instanceof ArrayBuffer) {
    return Buffer.from(value);
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

  const contentType = req.headers["content-type"] || req.headers["Content-Type"];
  if (!contentType || !contentType.toLowerCase().includes("multipart/form-data")) {
    return {
      status: 400,
      body: { error: "Requests must use multipart/form-data." },
    };
  }

  const bodyBuffer = toBuffer(req.rawBody) || toBuffer(req.body);
  if (!bodyBuffer || bodyBuffer.length === 0) {
    return {
      status: 400,
      body: { error: "Request body is empty." },
    };
  }

  try {
    const response = await fetch(`${OPENAI_API_BASE_URL}/audio/transcriptions`, {
      method: "POST",
      headers: {
        "Content-Type": contentType,
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: bodyBuffer,
    });

    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!response.ok) {
      const message =
        (data && typeof data === "object" && data.error && data.error.message) ||
        (typeof data === "string" ? data : null) ||
        `OpenAI request failed with status ${response.status}.`;
      context.log.error("OpenAI transcription failed", message);
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
    context.log.error("Unexpected error calling OpenAI transcription", error);
    return {
      status: 500,
      body: { error: "Unexpected error calling OpenAI transcription." },
    };
  }
};
