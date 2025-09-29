const RAW_ASSISTANT_API_URL = process.env.EXPO_PUBLIC_ASSISTANT_API_URL;

const ASSISTANT_API_URL =
  typeof RAW_ASSISTANT_API_URL === "string"
    ? RAW_ASSISTANT_API_URL.replace(/\/+$/, "")
    : "";

const CHAT_COMPLETIONS_PATH = "/assistant/chat-completions";
const AUDIO_TRANSCRIPTION_PATH = "/assistant/audio-transcriptions";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export const isOpenAiConfigured =
  typeof ASSISTANT_API_URL === "string" && ASSISTANT_API_URL.length > 0;

function getAssistantApiUrl(): string {
  if (!isOpenAiConfigured) {
    throw new Error(
      "Assistant backend is not configured. Set EXPO_PUBLIC_ASSISTANT_API_URL in your environment.",
    );
  }

  return ASSISTANT_API_URL;
}

function buildErrorMessage(status: number, body: any) {
  if (body && typeof body === "object" && "error" in body) {
    const err = (body as any).error;
    if (err && typeof err === "object" && "message" in err) {
      return String(err.message);
    }
  }
  if (status >= 400 && status < 500) return `Request failed with status ${status}.`;
  if (status >= 500) return "Assistant service is currently unavailable.";
  return "Unexpected error calling the assistant service.";
}

export async function callOpenAIChatCompletion(payload: Record<string, any>) {
  const baseUrl = getAssistantApiUrl();

  const bodyPayload = {
    model: "gpt-4o-mini",
    temperature: 0.7,
    ...payload,
  };

  const response = await fetch(`${baseUrl}${CHAT_COMPLETIONS_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(bodyPayload),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(buildErrorMessage(response.status, body));
  }

  return body;
}

export async function fetchAssistantReply(messages: ChatMessage[]): Promise<string> {
  const body = await callOpenAIChatCompletion({ messages });
  const content = body?.choices?.[0]?.message?.content;
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
  const baseUrl = getAssistantApiUrl();

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

  const response = await fetch(`${baseUrl}${AUDIO_TRANSCRIPTION_PATH}`, {
    method: "POST",
    body: formData,
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(buildErrorMessage(response.status, body));
  }

  const text: unknown = body?.text;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Transcription did not return any text.");
  }

  return text.trim();
}
