const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_PROXY_TOKEN = process.env.OPENAI_PROXY_TOKEN;

function getProvidedToken(req) {
  if (!req || typeof req !== "object" || !req.headers) return undefined;
  const headers = req.headers;
  return headers["x-api-key"] || headers["x-functions-key"];
}

module.exports = async function (context, req) {
  const method = (req?.method || "GET").toUpperCase();
  const providedToken = getProvidedToken(req);

  if (method === "GET") {
    if (!OPENAI_API_KEY) {
      context.log.warn("Missing OPENAI_API_KEY environment variable.");
      context.res = {
        status: 503,
        headers: {
          "Content-Type": "application/json",
        },
        body: {
          ok: false,
          error: {
            message: "The OpenAI API key is not configured on the server.",
          },
        },
      };
      return;
    }

    if (!OPENAI_PROXY_TOKEN) {
      context.log.error("Missing OPENAI_PROXY_TOKEN configuration.");
      context.res = {
        status: 503,
        headers: {
          "Content-Type": "application/json",
        },
        body: {
          ok: false,
          error: {
            message: "Server misconfiguration: missing OpenAI proxy token.",
          },
        },
      };
      return;
    }

    if (!providedToken || providedToken !== OPENAI_PROXY_TOKEN) {
      context.res = {
        status: 401,
        headers: {
          "Content-Type": "application/json",
        },
        body: {
          ok: false,
          error: {
            message: "Unauthorized request.",
          },
        },
      };
      return;
    }

    context.res = {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        ok: true,
        message: "Chat completion proxy is ready.",
      },
    };
    return;
  }

  if (method !== "POST") {
    context.res = {
      status: 405,
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        error: {
          message: "Method not allowed.",
        },
      },
    };
    return;
  }

  if (!OPENAI_API_KEY) {
    context.log.warn("Missing OPENAI_API_KEY environment variable.");
    context.res = {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        error: {
          message: "The OpenAI API key is not configured on the server.",
        },
      },
    };
    return;
  }

  if (!OPENAI_PROXY_TOKEN) {
    context.log.error("Missing OPENAI_PROXY_TOKEN configuration.");
    context.res = {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        error: {
          message: "Server misconfiguration: missing OpenAI proxy token.",
        },
      },
    };
    return;
  }

  if (!providedToken || providedToken !== OPENAI_PROXY_TOKEN) {
    context.res = {
      status: 401,
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        error: {
          message: "Unauthorized request.",
        },
      },
    };
    return;
  }

  let body;
  try {
    body = req.body;
    if (!body && req.rawBody) {
      body = JSON.parse(req.rawBody);
    }
  } catch (error) {
    context.log.warn("Failed to parse request body as JSON.", error);
    context.res = {
      status: 400,
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        error: {
          message: "Invalid JSON payload in request body.",
        },
      },
    };
    return;
  }

  const { messages, temperature = 0.6, tools, model = "gpt-4o-mini" } = body || {};

  if (!Array.isArray(messages)) {
    context.res = {
      status: 400,
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        error: {
          message: 'The request body must include a "messages" array.',
        },
      },
    };
    return;
  }

  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        tools,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      context.log.warn("OpenAI API returned an error response.", data);
      context.res = {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
        },
        body: data,
      };
      return;
    }

    context.res = {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: data,
    };
  } catch (error) {
    context.log.error("Unexpected error calling OpenAI API.", error);
    context.res = {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        error: {
          message: "Unable to contact the AI service right now. Please try again later.",
        },
      },
    };
  }
};
