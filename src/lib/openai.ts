const RAW_API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const API_BASE_URL = RAW_API_BASE_URL ? RAW_API_BASE_URL.replace(/\/$/, "") : "";

const CHAT_COMPLETIONS_PATH = "/api/openai-chat";
const AUDIO_TRANSCRIPTION_PATH = "/api/openai-transcribe";

function buildApiUrl(path: string) {
  if (!path.startsWith("/")) {
    throw new Error(`API paths must start with '/'. Received: ${path}`);
  }
  return `${API_BASE_URL}${path}` || path;
}

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export const isOpenAiConfigured = process.env.EXPO_PUBLIC_DISABLE_OPENAI !== "true";

function buildErrorMessage(status: number, body: any) {
  if (typeof body === "string" && body.trim()) {
    return body.trim();
  }
  if (body && typeof body === "object" && "error" in body) {
    const err = (body as any).error;
    if (err && typeof err === "object" && "message" in err) {
      return String(err.message);
    }
    if (typeof err === "string" && err.trim()) {
      return err.trim();
    }
  }
  if (body && typeof body === "object" && "message" in body && typeof body.message === "string") {
    return body.message;
  }
  if (status >= 400 && status < 500) return `Request failed with status ${status}.`;
  if (status >= 500) return "OpenAI service is currently unavailable.";
  return "Unexpected error calling OpenAI.";
}

export async function callOpenAIChatCompletion(payload: Record<string, any>) {
  if (!isOpenAiConfigured) {
    throw new Error("OpenAI assistant backend is disabled. Set EXPO_PUBLIC_DISABLE_OPENAI to 'false' or remove it.");
  }

  const bodyPayload = {
    model: "gpt-4o-mini",
    temperature: 0.7,
    ...payload,
  };

  const response = await fetch(buildApiUrl(CHAT_COMPLETIONS_PATH), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(bodyPayload),
  });

  const text = await response.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    throw new Error(buildErrorMessage(response.status, body));
  }

  return body;
}

export async function fetchAssistantReply(messages: ChatMessage[]): Promise<string> {
  const body = await callOpenAIChatCompletion({ messages });
  const content = body?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenAI assistant did not return any content.");
  }

  return content.trim();
}

type BlobLike = any;

type TranscribeAudioInput =
  | { uri: string; fileName?: string; mimeType?: string }
  | { blob: BlobLike; fileName?: string; mimeType?: string };

export async function transcribeAudio(input: TranscribeAudioInput) {
  if (!isOpenAiConfigured) {
    throw new Error("OpenAI assistant backend is disabled. Set EXPO_PUBLIC_DISABLE_OPENAI to 'false' or remove it.");
  }

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

  const response = await fetch(buildApiUrl(AUDIO_TRANSCRIPTION_PATH), {
    method: "POST",
    body: formData,
  });

  const text = await response.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    throw new Error(buildErrorMessage(response.status, body));
  }

  const transcript: unknown = body?.text;
  if (typeof transcript !== "string" || !transcript.trim()) {
    throw new Error("Transcription did not return any text.");
  }

  return transcript.trim();
}
