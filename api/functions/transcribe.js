const { app } = require("@azure/functions");

const OPENAI_URL = "https://api.openai.com/v1/audio/transcriptions";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

function buildError(message) {
  return {
    error: {
      message,
    },
  };
}

app.http("transcribe", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    if (!OPENAI_API_KEY) {
      context.warn("Missing OPENAI_API_KEY environment variable.");
      return {
        status: 500,
        jsonBody: buildError("The OpenAI API key is not configured on the server."),
      };
    }

    let incomingFormData;
    try {
      incomingFormData = await request.formData();
    } catch (error) {
      context.warn("Failed to parse request body as form-data.", error);
      return {
        status: 400,
        jsonBody: buildError("Invalid form-data payload in request body."),
      };
    }

    const file = incomingFormData.get("file");
    if (!file || typeof file === "string") {
      return {
        status: 400,
        jsonBody: buildError('The request must include a binary "file" field.'),
      };
    }

    const forwardFormData = new FormData();
    const model = incomingFormData.get("model") ?? "gpt-4o-mini-transcribe";
    forwardFormData.set("model", String(model));
    forwardFormData.set("file", file);

    for (const key of incomingFormData.keys()) {
      if (key === "file" || key === "model") continue;
      const values = incomingFormData.getAll(key);
      for (const value of values) {
        forwardFormData.append(key, value);
      }
    }

    try {
      const response = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: forwardFormData,
      });

      const data = await response.json();

      if (!response.ok) {
        context.warn("OpenAI transcription API returned an error response.", data);
        return {
          status: response.status,
          jsonBody: data,
        };
      }

      return {
        status: 200,
        jsonBody: data,
      };
    } catch (error) {
      context.error("Unexpected error calling OpenAI transcription API.", error);
      return {
        status: 500,
        jsonBody: buildError(
          "Unable to contact the transcription service right now. Please try again later.",
        ),
      };
    }
  },
});
