const API_ROUTE = "/api/images/generate";
const IMAGE_API_TOKEN =
  process.env.EXPO_PUBLIC_OPENAI_PROXY_TOKEN ?? process.env.EXPO_PUBLIC_IMAGE_API_TOKEN;

export type GenerateImageOptions = {
  prompt: string;
  size?: "256x256" | "512x512" | "1024x1024";
  quality?: "standard" | "hd";
  signal?: AbortSignal;
};

export type GeneratedImagePayload = {
  b64_json?: string;
  url?: string;
  revised_prompt?: string;
};

export type GenerateImageResponse = {
  prompt: string;
  size: string;
  quality: string;
  data: GeneratedImagePayload;
};

export const isImageApiConfigured = typeof IMAGE_API_TOKEN === "string" && IMAGE_API_TOKEN.length > 0;

function extractErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;

  if ("error" in body) {
    const errorValue = (body as any).error;

    if (typeof errorValue === "string" && errorValue.trim().length > 0) {
      return errorValue;
    }

    if (errorValue && typeof errorValue === "object") {
      if ("message" in errorValue && typeof (errorValue as any).message === "string") {
        const message = String((errorValue as any).message).trim();
        if (message.length > 0) {
          return message;
        }
      }

      if ("error" in errorValue && typeof (errorValue as any).error === "string") {
        const nestedError = String((errorValue as any).error).trim();
        if (nestedError.length > 0) {
          return nestedError;
        }
      }
    }
  }

  if ("details" in body && typeof (body as any).details === "string") {
    const details = String((body as any).details).trim();
    if (details.length > 0) {
      return details;
    }
  }

  if ("message" in body && typeof (body as any).message === "string") {
    const message = String((body as any).message).trim();
    if (message.length > 0) {
      return message;
    }
  }

  return null;
}

function buildErrorMessage(status: number, body: any) {
  const extractedMessage = extractErrorMessage(body);
  if (extractedMessage) {
    return extractedMessage;
  }

  if (status === 401) return "Unauthorized request to the image proxy.";
  if (status >= 400 && status < 500) return `Request failed with status ${status}.`;
  if (status >= 500) return "Image service is currently unavailable.";
  return "Unexpected error contacting the image API.";
}

export const __internal = { extractErrorMessage };

export async function generateImage(options: GenerateImageOptions): Promise<GenerateImageResponse> {
  const { prompt, size = "1024x1024", quality = "standard", signal } = options;

  if (!prompt || !prompt.trim()) {
    throw new Error("A prompt is required to generate an image.");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (IMAGE_API_TOKEN) {
    headers["x-api-key"] = IMAGE_API_TOKEN;
  }

  let response: Response;
  try {
    response = await fetch(API_ROUTE, {
      method: "POST",
      headers,
      body: JSON.stringify({
        prompt: prompt.trim(),
        size,
        quality,
      }),
      signal,
    });
  } catch (error: any) {
    throw new Error(error?.message ?? "Unable to reach the image API.");
  }

  let body: any = null;
  try {
    body = await response.json();
  } catch (error) {
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}.`);
    }
    throw new Error("Image API did not return a JSON payload.");
  }

  if (!response.ok) {
    throw new Error(buildErrorMessage(response.status, body));
  }

  if (!body || typeof body !== "object" || !body.data) {
    throw new Error("Image API response was missing the generated image.");
  }

  return body as GenerateImageResponse;
}

export const IMAGE_API_ENDPOINT = API_ROUTE;
export const IMAGE_API_AUTH_TOKEN = IMAGE_API_TOKEN;
