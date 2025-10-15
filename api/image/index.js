const OPENAI_URL = "https://api.openai.com/v1/images/generations";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_PROXY_TOKEN = process.env.OPENAI_PROXY_TOKEN;
const LEGACY_IMAGE_TOKEN = process.env.IMAGE_API_TOKEN;

const { jsonResponse, getProvidedToken, parseJsonBody } = require("../_shared/utils");

module.exports = async function (context, req) {
  const method = (req?.method || "GET").toUpperCase();
  const configuredToken = OPENAI_PROXY_TOKEN || LEGACY_IMAGE_TOKEN;
  const providedToken = getProvidedToken(req);

  if (method === "GET") {
    if (!OPENAI_API_KEY) {
      context.log.warn("Missing OPENAI_API_KEY environment variable.");
      context.res = jsonResponse(503, {
        ok: false,
        error: {
          message: "The OpenAI API key is not configured on the server.",
        },
      });
      return;
    }

    if (!configuredToken) {
      context.log.error("Missing OPENAI_PROXY_TOKEN (or IMAGE_API_TOKEN fallback).");
      context.res = jsonResponse(503, {
        ok: false,
        error: {
          message: "Server misconfiguration: missing OpenAI proxy token.",
        },
      });
      return;
    }

    if (!providedToken || providedToken !== configuredToken) {
      context.res = jsonResponse(401, {
        ok: false,
        error: {
          message: "Unauthorized request.",
        },
      });
      return;
    }

    context.res = jsonResponse(200, {
      ok: true,
      message: "Image generation proxy is ready.",
    });
    return;
  }

  if (method !== "POST") {
    context.res = jsonResponse(405, {
      error: {
        message: "Method not allowed.",
      },
    });
    return;
  }

  if (!OPENAI_API_KEY) {
    context.log.warn("Missing OPENAI_API_KEY environment variable.");
    context.res = jsonResponse(500, {
      error: {
        message: "The OpenAI API key is not configured on the server.",
      },
    });
    return;
  }

  if (!configuredToken) {
    context.log.error("Missing OPENAI_PROXY_TOKEN (or IMAGE_API_TOKEN fallback).");
    context.res = jsonResponse(500, {
      error: {
        message: "Server misconfiguration: missing OpenAI proxy token.",
      },
    });
    return;
  }

  if (!providedToken || providedToken !== configuredToken) {
    context.res = jsonResponse(401, {
      error: {
        message: "Unauthorized request.",
      },
    });
    return;
  }

  let body;
  try {
    body = parseJsonBody(req);
  } catch (error) {
    context.log.warn("Failed to parse request body as JSON.", error);
    context.res = jsonResponse(400, {
      error: {
        message: "Invalid JSON payload in request body.",
      },
    });
    return;
  }

  const {
    prompt,
    size = "1024x1024",
    quality = "standard",
    response_format = "b64_json",
  } = body || {};

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    context.res = jsonResponse(400, {
      error: {
        message: 'A non-empty "prompt" field is required in the request body.',
      },
    });
    return;
  }

  if (prompt.length > 1000) {
    context.res = jsonResponse(400, {
      error: {
        message: "Prompt is too long. Limit to 1000 characters.",
      },
    });
    return;
  }

  const allowedSizes = new Set(["256x256", "512x512", "1024x1024"]);
  if (!allowedSizes.has(size)) {
    context.res = jsonResponse(400, {
      error: {
        message: 'Invalid "size" requested.',
      },
    });
    return;
  }

  const allowedQualities = new Set(["standard", "hd"]);
  if (!allowedQualities.has(quality)) {
    context.res = jsonResponse(400, {
      error: {
        message: 'Invalid "quality" requested.',
      },
    });
    return;
  }

  if (response_format !== "b64_json") {
    context.res = jsonResponse(400, {
      error: {
        message: 'Unsupported "response_format" requested.',
      },
    });
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
      context.res = jsonResponse(502, {
        error: {
          message: "Unexpected response from the OpenAI image service.",
        },
      });
      return;
    }

    if (!response.ok) {
      context.log.warn("OpenAI image generation failed.", data);
      context.res = jsonResponse(response.status, data);
      return;
    }

    const image = Array.isArray(data?.data) ? data.data[0] : undefined;
    if (!image) {
      context.log.error("OpenAI response missing image payload.", data);
      context.res = jsonResponse(502, {
        error: {
          message: "No image returned by OpenAI.",
        },
      });
      return;
    }

    context.res = jsonResponse(200, {
      prompt: payload.prompt,
      size: payload.size,
      quality: payload.quality,
      response_format: payload.response_format,
      data: image,
    });
  } catch (error) {
    context.log.error("Failed to generate image via OpenAI.", error);
    context.res = jsonResponse(500, {
      error: {
        message: "Unable to contact the image generation service right now.",
      },
    });
  }
};
