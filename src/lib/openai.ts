const API_URL = "https://api.openai.com/v1/chat/completions";
const AUDIO_TRANSCRIPTION_URL = "https://api.openai.com/v1/audio/transcriptions";
const API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

export type ChatCompletionToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

type OpenAIErrorBody = {
  error?: {
    message?: string;
  };
};

export type ChatMessage =
  | {
      role: "system" | "user";
      content: string;
    }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: ChatCompletionToolCall[];
    }
  | {
      role: "tool";
      content: string;
      tool_call_id: string;
    };

type ChatCompletionMessage = Extract<ChatMessage, { role: "assistant" }>;

type ChatCompletionChoice = {
  index: number;
  message: ChatCompletionMessage;
  finish_reason: string | null;
};

type ChatCompletionResponseBody = {
  id: string;
  choices: ChatCompletionChoice[];
};

type ChatCompletionToolDefinition = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: unknown;
  };
};

type ChatCompletionPayload = {
  model?: string;
  temperature?: number;
  messages: ChatMessage[];
  tools?: ChatCompletionToolDefinition[];
};

export const isOpenAiConfigured = typeof API_KEY === "string" && API_KEY.length > 0;

function buildErrorMessage(status: number, body: unknown) {
  if (body && typeof body === "object" && "error" in body) {
    const err = (body as OpenAIErrorBody).error;
    if (err && typeof err === "object" && "message" in err) {
      return String(err.message);
    }
  }
  if (status >= 400 && status < 500) return `Request failed with status ${status}.`;
  if (status >= 500) return "OpenAI service is currently unavailable.";
  return "Unexpected error calling OpenAI.";
}

export async function callOpenAIChatCompletion(
  payload: ChatCompletionPayload,
): Promise<ChatCompletionResponseBody> {
  if (!isOpenAiConfigured) {
    throw new Error("OpenAI API key is not configured. Set EXPO_PUBLIC_OPENAI_API_KEY in your environment.");
  }

  const bodyPayload = {
    model: "gpt-4o-mini",
    temperature: 0.7,
    ...payload,
  };

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(bodyPayload),
  });

  const body: unknown = await response.json();
  if (!response.ok) {
    throw new Error(buildErrorMessage(response.status, body));
  }

  if (!body || typeof body !== "object" || !Array.isArray((body as ChatCompletionResponseBody).choices)) {
    throw new Error("Unexpected response format from OpenAI chat completion.");
  }

  return body as ChatCompletionResponseBody;
}

export async function fetchAssistantReply(messages: ChatMessage[]): Promise<string> {
  const body = await callOpenAIChatCompletion({ messages });
  const content = body?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenAI assistant did not return any content.");
  }

  return content.trim();
}

type BlobLike = Blob & { size?: number };

type ReactNativeFileLike = {
  uri: string;
  name: string;
  type: string;
};

type TranscribeAudioInput =
  | { uri: string; fileName?: string; mimeType?: string }
  | { blob: BlobLike; fileName?: string; mimeType?: string };

export async function transcribeAudio(input: TranscribeAudioInput) {
  if (!isOpenAiConfigured) {
    throw new Error("OpenAI API key is not configured. Set EXPO_PUBLIC_OPENAI_API_KEY in your environment.");
  }

  const formData = new FormData();
  formData.append("model", "gpt-4o-mini-transcribe");

  if ("blob" in input) {
    const { blob, fileName = "voice-message.webm", mimeType } = input;
    const typedBlob =
      mimeType && blob && typeof blob.slice === "function"
        ? blob.slice(0, blob.size ?? undefined, mimeType)
        : blob;
    formData.append("file", typedBlob as Blob, fileName);
  } else {
    const { uri, fileName = "voice-message.m4a", mimeType = "audio/m4a" } = input;
    formData.append(
      "file",
      {
        uri,
        name: fileName,
        type: mimeType,
      } as ReactNativeFileLike,
    );
  }

  const response = await fetch(AUDIO_TRANSCRIPTION_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
    body: formData,
  });

  const body: unknown = await response.json();
  if (!response.ok) {
    throw new Error(buildErrorMessage(response.status, body));
  }

  if (!body || typeof body !== "object" || !("text" in body)) {
    throw new Error("Unexpected response format from OpenAI transcription.");
  }

  const text: unknown = (body as { text?: unknown }).text;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Transcription did not return any text.");
  }

  return text.trim();
}
