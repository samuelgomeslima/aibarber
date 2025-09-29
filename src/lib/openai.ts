const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || "/api").replace(/\/$/, "");

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export const isOpenAiConfigured = true;

type JsonLike = Record<string, any>;

type MinimalChatChoice = {
  index?: number;
  finish_reason?: string | null;
  message?: {
    role?: string;
    content?: string | null;
    tool_calls?:
      | {
          id?: string;
          type?: string;
          function?: { name?: string; arguments?: string };
        }[]
      | null;
  };
};

type BackendChatResponse = {
  choices?: MinimalChatChoice[];
  usage?: JsonLike | null;
  quota?: JsonLike | null;
};

function buildErrorMessage(status: number, body: unknown) {
  if (body && typeof body === "object" && "error" in body) {
    const err = (body as any).error;
    if (err && typeof err === "object" && "message" in err) {
      return String(err.message);
    }
    if (typeof err === "string") return err;
  }
  if (status === 401 || status === 403) {
    return "You are not authorized to use the assistant.";
  }
  if (status === 429) {
    return "Daily usage limit reached. Try again later.";
  }
  if (status >= 400 && status < 500) return `Request failed with status ${status}.`;
  if (status >= 500) return "Service is currently unavailable.";
  return "Unexpected error calling assistant service.";
}

async function requestJson<T>(path: string, payload: JsonLike): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  let body: any = null;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    body = await response.json();
  } else {
    body = await response.text();
    try {
      body = JSON.parse(body);
    } catch {
      body = { error: body };
    }
  }

  if (!response.ok) {
    throw new Error(buildErrorMessage(response.status, body));
  }

  return body as T;
}

export async function callOpenAIChatCompletion(
  payload: Record<string, any>,
): Promise<BackendChatResponse> {
  const body = await requestJson<BackendChatResponse>("/openai-chat", {
    payload,
  });
  return body;
}

export async function fetchAssistantReply(messages: ChatMessage[]): Promise<string> {
  const body = await requestJson<BackendChatResponse>("/openai-chat", {
    payload: { messages },
  });

  const choice = body?.choices?.[0];
  const content = choice?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Assistant did not return any content.");
  }

  return content.trim();
}

type BlobLike = any;

type TranscribeAudioInput =
  | { uri: string; fileName?: string; mimeType?: string }
  | { blob: BlobLike; fileName?: string; mimeType?: string };

export async function transcribeAudio(input: TranscribeAudioInput) {
  const formData = new FormData();
  formData.append("model", "gpt-4o-mini-transcribe");

  if ("blob" in input) {
    const { blob, fileName = "voice-message.webm", mimeType } = input;
    const typedBlob =
      mimeType && blob && typeof blob.slice === "function"
        ? blob.slice(0, blob.size ?? undefined, mimeType)
        : blob;
    formData.append("file", typedBlob as any, fileName);
  } else {
    const { uri, fileName = "voice-message.m4a", mimeType = "audio/m4a" } = input;
    formData.append(
      "file",
      {
        uri,
        name: fileName,
        type: mimeType,
      } as any,
    );
  }

  const response = await fetch(`${API_BASE_URL}/openai-transcribe`, {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
    body: formData,
  });

  const contentType = response.headers.get("content-type");
  let body: any = null;
  if (contentType && contentType.includes("application/json")) {
    body = await response.json();
  } else {
    body = await response.text();
    try {
      body = JSON.parse(body);
    } catch {
      body = { error: body };
    }
  }

  if (!response.ok) {
    throw new Error(buildErrorMessage(response.status, body));
  }

  const text: unknown = body?.text;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Transcription did not return any text.");
  }

  return text.trim();
}
