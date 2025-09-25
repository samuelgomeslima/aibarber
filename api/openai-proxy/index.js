// Node 18+ on Azure Functions has global fetch.
const ALLOWED_ORIGINS = []; // e.g., ["https://your-swa.azurestaticapps.net"]; empty = same-origin via SWA

function cors(req) {
  // If front-end and API are served by SWA together, you can omit CORS completely.
  // Keep this utility for local dev across ports.
  const origin = req.headers && req.headers.origin;
  const allow =
    !ALLOWED_ORIGINS.length || (origin && ALLOWED_ORIGINS.includes(origin))
      ? origin || "*"
      : "null";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  };
}

function badRequest(body, req) {
  return { status: 400, body: JSON.stringify(body), headers: { "Content-Type": "application/json", ...cors(req) } };
}
function serverError(body, req) {
  return { status: 500, body: JSON.stringify(body), headers: { "Content-Type": "application/json", ...cors(req) } };
}
function noContent(req) {
  return { status: 204, headers: cors(req) };
}

module.exports = async function (context, req) {
  // CORS preflight
  if (req.method === "OPTIONS") return noContent(req);

  const key = process.env.OPENAI_API_KEY;
  if (req.method === "GET") {
    // Health check endpoint: returns 204 if configured
    if (!key) return serverError({ error: "OPENAI_API_KEY not configured" }, req);
    return noContent(req);
  }

  if (req.method !== "POST") {
    return badRequest({ error: "Use POST /api/openai-proxy" }, req);
  }
  if (!key) return serverError({ error: "OPENAI_API_KEY not configured" }, req);

  let payload = {};
  try {
    payload = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  } catch {
    return badRequest({ error: "Invalid JSON body" }, req);
  }

  // Expect { messages: ChatMessage[], model?, temperature? }
  const { messages, model = "gpt-4o-mini", temperature = 0.7 } = payload || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return badRequest({ error: "Missing 'messages' array" }, req);
  }

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        temperature,
        messages
      })
    });

    const text = await r.text(); // pass through OpenAI response as-is
    return {
      status: r.status,
      body: text,
      headers: { "Content-Type": "application/json", ...cors(req) }
    };
  } catch (err) {
    context.log("Proxy error:", err);
    return serverError({ error: "Failed calling OpenAI" }, req);
  }
};
