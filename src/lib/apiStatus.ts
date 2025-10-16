import {
  OPENAI_CHAT_ENDPOINT,
  OPENAI_PROXY_AUTH_TOKEN,
  OPENAI_TRANSCRIPTION_ENDPOINT,
} from "./openai";

export type ApiServiceName = "chat" | "transcribe";
export type ApiStatusState = "available" | "unavailable" | "unauthorized";

export type ApiServiceStatus = {
  service: ApiServiceName;
  state: ApiStatusState;
  ok: boolean;
  message: string | null;
  statusCode?: number;
};

type ServiceConfig = {
  service: ApiServiceName;
  url?: string | null;
  token?: string | null | undefined;
};

const SERVICE_CONFIGS: ServiceConfig[] = [
  { service: "chat", url: OPENAI_CHAT_ENDPOINT, token: OPENAI_PROXY_AUTH_TOKEN },
  { service: "transcribe", url: OPENAI_TRANSCRIPTION_ENDPOINT, token: OPENAI_PROXY_AUTH_TOKEN },
];

function normalizeMessage(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  if ("message" in value && typeof (value as any).message === "string") {
    return (value as any).message;
  }
  if ("error" in value) {
    const error = (value as any).error;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
      return error.message;
    }
  }
  return null;
}

async function checkService(config: ServiceConfig): Promise<ApiServiceStatus> {
  if (!config.url) {
    return {
      service: config.service,
      state: "unavailable",
      ok: false,
      message: "Service endpoint is not configured.",
    };
  }

  if (!config.token) {
    return {
      service: config.service,
      state: "unauthorized",
      ok: false,
      message: "Client access token is not configured.",
    };
  }

  try {
    const response = await fetch(config.url, {
      method: "GET",
      headers: {
        "x-api-key": config.token,
      },
    });

    let body: unknown = null;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.toLowerCase().includes("application/json")) {
      try {
        body = await response.json();
      } catch {
        body = null;
      }
    }

    if (response.status === 401) {
      return {
        service: config.service,
        state: "unauthorized",
        ok: false,
        message: normalizeMessage(body) ?? "Unauthorized request.",
        statusCode: response.status,
      };
    }

    if (!response.ok) {
      return {
        service: config.service,
        state: "unavailable",
        ok: false,
        message:
          normalizeMessage(body) ?? `Request failed with status ${response.status}.`,
        statusCode: response.status,
      };
    }

    const normalizedMessage = normalizeMessage(body);
    const bodyOk =
      body && typeof body === "object" && "ok" in body ? Boolean((body as any).ok) : true;

    return {
      service: config.service,
      state: bodyOk ? "available" : "unavailable",
      ok: bodyOk,
      message: normalizedMessage,
      statusCode: response.status,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to contact the service.";
    return {
      service: config.service,
      state: "unavailable",
      ok: false,
      message,
    };
  }
}

export async function checkApiStatuses(): Promise<ApiServiceStatus[]> {
  return Promise.all(SERVICE_CONFIGS.map((config) => checkService(config)));
}
