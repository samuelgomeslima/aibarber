const CHAT_API_URL = process.env.EXPO_PUBLIC_OPENAI_PROXY_URL ?? "/api/chat";
const AUDIO_TRANSCRIPTION_URL =
  process.env.EXPO_PUBLIC_OPENAI_TRANSCRIBE_URL ?? "/api/transcribe";

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

type BlobLike = Blob & { size?: number };

type ReactNativeFileLike = {
  uri: string;
  name: string;
  type: string;
};

type TranscribeAudioInput =
  | { uri: string; fileName?: string; mimeType?: string }
  | { blob: BlobLike; fileName?: string; mimeType?: string };

export type OpenAIClientConfig = {
  fetchImpl?: typeof fetch;
  chatUrl?: string;
  transcriptionUrl?: string;
};

export type OpenAIClient = {
  isConfigured: boolean;
  callChatCompletion(payload: ChatCompletionPayload): Promise<ChatCompletionResponseBody>;
  fetchAssistantReply(messages: ChatMessage[]): Promise<string>;
  transcribeAudio(input: TranscribeAudioInput): Promise<string>;
};

export function createOpenAIClient(config: OpenAIClientConfig): OpenAIClient {
  const apiUrl = config.chatUrl ?? CHAT_API_URL;
  const transcriptionUrl = config.transcriptionUrl ?? AUDIO_TRANSCRIPTION_URL;
  const fetchImpl = config.fetchImpl ?? fetch;
  const isConfigured =
    typeof apiUrl === "string" && apiUrl.length > 0 && typeof transcriptionUrl === "string" && transcriptionUrl.length > 0;

  const ensureConfigured = () => {
    if (!isConfigured) {
      throw new Error(
        "OpenAI service is not configured. Ensure the backend has an OPENAI_API_KEY secret set.",
      );
    }
  };

  async function callChatCompletion(payload: ChatCompletionPayload): Promise<ChatCompletionResponseBody> {
    ensureConfigured();

    const bodyPayload = {
      model: "gpt-4o-mini",
      temperature: 0.7,
      ...payload,
    };

    const response = await fetchImpl(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyPayload),
    });

    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    if (!response.ok) {
      throw new Error(buildErrorMessage(response.status, body));
    }

    if (!body || typeof body !== "object" || !Array.isArray((body as ChatCompletionResponseBody).choices)) {
      throw new Error("Unexpected response format from OpenAI chat completion.");
    }

    return body as ChatCompletionResponseBody;
  }

  async function fetchAssistantReply(messages: ChatMessage[]): Promise<string> {
    const body = await callChatCompletion({ messages });
    const content = body?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("OpenAI assistant did not return any content.");
    }

    return content.trim();
  }

  async function transcribeAudio(input: TranscribeAudioInput) {
    ensureConfigured();

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

    const response = await fetchImpl(transcriptionUrl, {
      method: "POST",
      body: formData,
    });

    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
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

  return {
    isConfigured,
    callChatCompletion,
    fetchAssistantReply,
    transcribeAudio,
  };
}

const defaultClient = createOpenAIClient({});

export const isOpenAiConfigured = defaultClient.isConfigured;
export const callOpenAIChatCompletion = defaultClient.callChatCompletion;
export const fetchAssistantReply = defaultClient.fetchAssistantReply;
export const transcribeAudio = defaultClient.transcribeAudio;

