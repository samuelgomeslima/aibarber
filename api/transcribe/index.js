const OPENAI_URL = "https://api.openai.com/v1/audio/transcriptions";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

module.exports = async function (context, req) {
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

  const contentType = req.headers["content-type"] || req.headers["Content-Type"];
  if (!contentType || !contentType.toLowerCase().startsWith("multipart/form-data")) {
    context.res = {
      status: 400,
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        error: {
          message: "Requests must be sent as multipart/form-data.",
        },
      },
    };
    return;
  }

  try {
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : typeof req.rawBody === "string"
        ? Buffer.from(req.rawBody)
        : null;

    if (!rawBody) {
      context.res = {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
        body: {
          error: {
            message: "Request body is missing or invalid.",
          },
        },
      };
      return;
    }

    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": contentType,
      },
      body: rawBody,
    });

    const data = await response.json();

    if (!response.ok) {
      context.log.warn("OpenAI transcription failed.", data);
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
    context.log.error("Unexpected error calling OpenAI transcription.", error);
    context.res = {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        error: {
          message: "Unable to contact the transcription service right now.",
        },
      },
    };
  }
};
