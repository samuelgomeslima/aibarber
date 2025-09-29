const { getAuthenticatedUser } = require("../_shared/auth");
const { getConfig } = require("../_shared/config");
const { consumeQuota } = require("../_shared/quota");
const { jsonResponse, errorResponse } = require("../_shared/http");

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const ALLOWED_PAYLOAD_FIELDS = new Set([
  "messages",
  "model",
  "temperature",
  "top_p",
  "max_completion_tokens",
  "max_tokens",
  "presence_penalty",
  "frequency_penalty",
  "response_format",
  "tools",
  "tool_choice",
]);

function sanitizeMessages(rawMessages) {
  if (!Array.isArray(rawMessages)) return null;
  const sanitized = [];
  for (const message of rawMessages) {
    if (!message || typeof message !== "object") continue;
    const role = typeof message.role === "string" ? message.role : null;
    if (!role) continue;
    const entry = { role };

    if ("content" in message) {
      if (typeof message.content === "string" || Array.isArray(message.content)) {
        entry.content = message.content;
      }
    }

    if (typeof message.name === "string" && message.name.length > 0) {
      entry.name = message.name;
    }

    if (typeof message.tool_call_id === "string" && message.tool_call_id.length > 0) {
      entry.tool_call_id = message.tool_call_id;
    }

    if (Array.isArray(message.tool_calls)) {
      entry.tool_calls = message.tool_calls
        .map((call) => {
          if (!call || typeof call !== "object") return null;
          if (call.type !== "function") return null;
          const fn = call.function;
          if (!fn || typeof fn !== "object") return null;
          const sanitizedCall = {
            id: typeof call.id === "string" ? call.id : undefined,
            type: "function",
            function: {
              name: typeof fn.name === "string" ? fn.name : undefined,
              arguments: typeof fn.arguments === "string" ? fn.arguments : undefined,
            },
          };
          return sanitizedCall;
        })
        .filter(Boolean);
    }

    sanitized.push(entry);
  }
  return sanitized.length > 0 ? sanitized : null;
}

function sanitizeTools(rawTools) {
  if (!Array.isArray(rawTools)) return undefined;
  const sanitized = rawTools
    .map((tool) => {
      if (!tool || typeof tool !== "object") return null;
      if (tool.type !== "function") return null;
      const fn = tool.function;
      if (!fn || typeof fn !== "object") return null;
      const sanitizedFn = {};
      if (typeof fn.name === "string" && fn.name.length > 0) {
        sanitizedFn.name = fn.name;
      }
      if (typeof fn.description === "string" && fn.description.length > 0) {
        sanitizedFn.description = fn.description;
      }
      if (fn.parameters && typeof fn.parameters === "object") {
        sanitizedFn.parameters = fn.parameters;
      }
      return {
        type: "function",
        function: sanitizedFn,
      };
    })
    .filter(Boolean);
  return sanitized.length > 0 ? sanitized : undefined;
}

function buildOpenAiPayload(config, payload) {
  const sanitized = {
    model: config.chatModel,
  };
  for (const key of Object.keys(payload || {})) {
    if (!ALLOWED_PAYLOAD_FIELDS.has(key)) continue;
    sanitized[key] = payload[key];
  }

  const messages = sanitizeMessages(payload?.messages);
  if (!messages) {
    throw new Error("Invalid messages payload.");
  }
  sanitized.messages = messages;

  const tools = sanitizeTools(payload?.tools);
  if (tools) {
    sanitized.tools = tools;
  }

  if (sanitized.tool_choice && typeof sanitized.tool_choice !== "string") {
    if (
      !sanitized.tool_choice ||
      typeof sanitized.tool_choice !== "object" ||
      sanitized.tool_choice.type !== "function"
    ) {
      delete sanitized.tool_choice;
    }
  }

  if (typeof sanitized.temperature !== "number") {
    sanitized.temperature = payload?.temperature ?? 0.7;
  }

  sanitized.stream = false;
  return sanitized;
}

function normalizeErrorMessage(error) {
  if (!error) return "Unexpected error calling OpenAI.";
  if (typeof error === "string") return error;
  if (typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "Unexpected error calling OpenAI.";
}

function mapChoice(choice) {
  if (!choice || typeof choice !== "object") return null;
  const result = {
    index: choice.index,
    finish_reason: choice.finish_reason,
  };
  if (choice.message && typeof choice.message === "object") {
    result.message = {
      role: choice.message.role,
      content: choice.message.content ?? null,
    };
    if (Array.isArray(choice.message.tool_calls)) {
      result.message.tool_calls = choice.message.tool_calls
        .map((call) => {
          if (!call || typeof call !== "object") return null;
          if (call.type !== "function") return null;
          const fn = call.function;
          if (!fn || typeof fn !== "object") return null;
          return {
            id: call.id,
            type: "function",
            function: {
              name: fn.name,
              arguments: fn.arguments,
            },
          };
        })
        .filter(Boolean);
    }
  }
  return result;
}

module.exports = async function (context, req) {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return errorResponse(401, "Authentication required.");
    }

    const config = getConfig();
    const payload = req.body?.payload || req.body || {};

    let openAiPayload;
    try {
      openAiPayload = buildOpenAiPayload(config, payload);
    } catch (err) {
      return errorResponse(400, err.message || "Invalid request payload.");
    }

    const quota = await consumeQuota(user.id, config.chatCost);
    if (!quota.allowed) {
      return errorResponse(429, "Daily request limit reached.", { quota });
    }

    const response = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.openAiApiKey}`,
      },
      body: JSON.stringify(openAiPayload),
    });

    const bodyText = await response.text();
    let body;
    try {
      body = bodyText ? JSON.parse(bodyText) : null;
    } catch (err) {
      body = null;
    }

    if (!response.ok) {
      const errorMessage = normalizeErrorMessage(body?.error);
      return errorResponse(response.status, errorMessage, {
        quota,
      });
    }

    const choices = Array.isArray(body?.choices)
      ? body.choices.map((choice) => mapChoice(choice)).filter(Boolean)
      : [];

    return jsonResponse(200, {
      choices,
      usage: body?.usage ?? null,
      quota,
    });
  } catch (err) {
    context.log("openai-chat error", err);
    return errorResponse(500, "Failed to call assistant service.");
  }
};
