const { getAuthenticatedUser, getHeader } = require("../_shared/auth");
const { getConfig } = require("../_shared/config");
const { consumeQuota } = require("../_shared/quota");
const { jsonResponse, errorResponse } = require("../_shared/http");

const OPENAI_TRANSCRIBE_URL = "https://api.openai.com/v1/audio/transcriptions";

module.exports = async function (context, req) {
  try {
    const user = getAuthenticatedUser(req);
    if (!user) {
      return errorResponse(401, "Authentication required.");
    }

    const config = getConfig();
    const contentType = getHeader(req, "content-type");
    if (!contentType || !contentType.includes("multipart/form-data")) {
      return errorResponse(400, "Request must be multipart/form-data.");
    }

    if (!req.body || (!(req.body instanceof Buffer) && !(req.body instanceof Uint8Array))) {
      return errorResponse(400, "Audio payload is missing.");
    }

    const payloadBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body);

    const quota = await consumeQuota(user.id, config.transcriptionCost);
    if (!quota.allowed) {
      return errorResponse(429, "Daily request limit reached.", { quota });
    }

    const response = await fetch(OPENAI_TRANSCRIBE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.openAiApiKey}`,
        "Content-Type": contentType,
      },
      body: payloadBuffer,
    });

    const bodyText = await response.text();
    let body;
    try {
      body = bodyText ? JSON.parse(bodyText) : null;
    } catch (err) {
      body = null;
    }

    if (!response.ok) {
      const message =
        (body && typeof body === "object" && body.error && body.error.message) ||
        response.statusText ||
        "Failed to transcribe audio.";
      return errorResponse(response.status, message, { quota });
    }

    const text = typeof body?.text === "string" ? body.text : null;
    if (!text) {
      return errorResponse(502, "Transcription did not return any text.", { quota });
    }

    return jsonResponse(200, {
      text,
      quota,
    });
  } catch (err) {
    context.log("openai-transcribe error", err);
    return errorResponse(500, "Failed to transcribe audio.");
  }
};
