const OPENAI_URL = "https://api.openai.com/v1/images/generations";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_PROXY_TOKEN = process.env.OPENAI_PROXY_TOKEN;
const LEGACY_IMAGE_TOKEN = process.env.IMAGE_API_TOKEN;

function getProvidedToken(req) {
  if (!req || typeof req !== "object" || !req.headers) return undefined;
  const headers = req.headers;
  return headers["x-api-key"] || headers["x-functions-key"];
}

function parseRequestBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.rawBody === "string" && req.rawBody.trim().length > 0) {
    return JSON.parse(req.rawBody);
  }

  if (Buffer.isBuffer(req.rawBody) && req.rawBody.length > 0) {
    return JSON.parse(req.rawBody.toString("utf8"));
  }

  return undefined;
}

module.exports = async function (context, req) {
  const method = (req?.method || "GET").toUpperCase();
  const configuredToken = OPENAI_PROXY_TOKEN || LEGACY_IMAGE_TOKEN;
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

    if (!configuredToken) {
      context.log.error("Missing OPENAI_PROXY_TOKEN (or IMAGE_API_TOKEN fallback).");
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

    if (!providedToken || providedToken !== configuredToken) {
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
        message: "Image generation proxy is ready.",
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

  if (!configuredToken) {
    context.log.error("Missing OPENAI_PROXY_TOKEN (or IMAGE_API_TOKEN fallback).");
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

  if (!providedToken || providedToken !== configuredToken) {
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
    body = parseRequestBody(req);
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

  const {
    prompt,
    size = "1024x1024",
    quality = "standard",
    response_format = "b64_json",
  } = body || {};

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    context.res = {
      status: 400,
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        error: {
          message: 'A non-empty "prompt" field is required in the request body.',
        },
      },
    };
    return;
  }

  if (prompt.length > 1000) {
    context.res = {
      status: 400,
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        error: {
          message: "Prompt is too long. Limit to 1000 characters.",
        },
      },
    };
    return;
  }

  const allowedSizes = new Set(["256x256", "512x512", "1024x1024"]);
  if (!allowedSizes.has(size)) {
    context.res = {
      status: 400,
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        error: {
          message: 'Invalid "size" requested.',
        },
      },
    };
    return;
  }

  const allowedQualities = new Set(["standard", "hd"]);
  if (!allowedQualities.has(quality)) {
    context.res = {
      status: 400,
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        error: {
          message: 'Invalid "quality" requested.',
        },
      },
    };
    return;
  }

  if (response_format !== "b64_json") {
    context.res = {
      status: 400,
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        error: {
          message: 'Unsupported "response_format" requested.',
        },
      },
    };
    return;
  }

  try {
    const payload = {
      model: "gpt-image-1",
      prompt: prompt.trim(),
      size,
      quality,
      response_format,
    };

    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    let data;
    try {
      data = await response.json();
    } catch (error) {
      context.log.error("Image API did not return JSON.", error);
      context.res = {
        status: 502,
        headers: {
          "Content-Type": "application/json",
        },
        body: {
          error: {
            message: "Unexpected response from the OpenAI image service.",
          },
        },
      };
      return;
    }

    if (!response.ok) {
      context.log.warn("OpenAI image generation failed.", data);
      context.res = {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
        },
        body: data,
      };
      return;
    }

    const image = Array.isArray(data?.data) ? data.data[0] : undefined;
    if (!image) {
      context.log.error("OpenAI response missing image payload.", data);
      context.res = {
        status: 502,
        headers: {
          "Content-Type": "application/json",
        },
        body: {
          error: {
            message: "No image returned by OpenAI.",
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
        prompt: payload.prompt,
        size: payload.size,
        quality: payload.quality,
        response_format: payload.response_format,
        data: image,
      },
    };
  } catch (error) {
    context.log.error("Failed to generate image via OpenAI.", error);
    context.res = {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        error: {
          message: "Unable to contact the image generation service right now.",
        },
      },
    };
  }
};
