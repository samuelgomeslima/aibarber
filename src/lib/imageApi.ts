const API_ROUTE = "/api/images/generate";
const IMAGE_API_TOKEN =
  process.env.EXPO_PUBLIC_OPENAI_PROXY_TOKEN ?? process.env.EXPO_PUBLIC_IMAGE_API_TOKEN;

export type GenerateImageOptions = {
  prompt: string;
  size?: "256x256" | "512x512" | "1024x1024";
  quality?: "standard" | "hd";
  responseFormat?: "b64_json" | "url";
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
  response_format: string;
  data: GeneratedImagePayload;
};

export const isImageApiConfigured = typeof IMAGE_API_TOKEN === "string" && IMAGE_API_TOKEN.length > 0;

function buildErrorMessage(status: number, body: any) {
  if (body && typeof body === "object") {
    if ("error" in body && typeof (body as any).error === "string") {
      return String((body as any).error);
    }
    if ("details" in body) {
      const details = (body as any).details;
      if (typeof details === "string") return details;
    }
  }

  if (status === 401) return "Unauthorized request to the image proxy.";
  if (status >= 400 && status < 500) return `Request failed with status ${status}.`;
  if (status >= 500) return "Image service is currently unavailable.";
  return "Unexpected error contacting the image API.";
}

export async function generateImage(options: GenerateImageOptions): Promise<GenerateImageResponse> {
  const { prompt, size = "1024x1024", quality = "standard", responseFormat = "b64_json", signal } = options;

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
        response_format: responseFormat,
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
