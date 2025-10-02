const API_BASE = (process.env.EXPO_PUBLIC_ASSISTANT_API_BASE_URL || '').replace(/\/$/, '');
const API_TOKEN = process.env.EXPO_PUBLIC_ASSISTANT_API_TOKEN || process.env.EXPO_PUBLIC_IMAGE_API_TOKEN || '';

const ASSISTANT_ROUTE = `${API_BASE}/api/assistant`;
const CHAT_ENDPOINT = `${ASSISTANT_ROUTE}/chat`;
const TRANSCRIBE_ENDPOINT = `${ASSISTANT_ROUTE}/transcribe`;

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export const isOpenAiConfigured = typeof API_TOKEN === 'string' && API_TOKEN.length > 0;

function buildErrorMessage(status: number, body: any) {
  if (body && typeof body === 'object' && 'error' in body) {
    const err = (body as any).error;
    if (err && typeof err === 'object' && 'message' in err) {
      return String(err.message);
    }
    if (typeof err === 'string') {
      return err;
    }
  }
  if (status >= 400 && status < 500) return `Request failed with status ${status}.`;
  if (status >= 500) return 'Assistant service is currently unavailable.';
  return 'Unexpected error calling assistant API.';
}

async function callAssistant(endpoint: string, init: RequestInit) {
  if (!isOpenAiConfigured) {
    throw new Error('Assistant API token is not configured. Set EXPO_PUBLIC_ASSISTANT_API_TOKEN in your environment.');
  }

  const response = await fetch(endpoint, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_TOKEN,
      ...(init.headers || {}),
    },
  });

  const bodyText = await response.text();
  const body = bodyText ? safeJsonParse(bodyText) : undefined;
  if (!response.ok) {
    throw new Error(buildErrorMessage(response.status, body));
  }
  return body;
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch (_err) {
    return null;
  }
}

export async function callOpenAIChatCompletion(payload: Record<string, any>) {
  const body = await callAssistant(CHAT_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return body;
}

export async function fetchAssistantReply(messages: ChatMessage[]): Promise<string> {
  const body = await callOpenAIChatCompletion({ messages });
  const content = body?.reply ?? body?.choice?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Assistant did not return any content.');
  }
  return content.trim();
}

type BlobLike = any;

type TranscribeAudioInput =
  | { uri: string; fileName?: string; mimeType?: string }
  | { blob: BlobLike; fileName?: string; mimeType?: string };

export async function transcribeAudio(input: TranscribeAudioInput) {
  if (!isOpenAiConfigured) {
    throw new Error('Assistant API token is not configured. Set EXPO_PUBLIC_ASSISTANT_API_TOKEN in your environment.');
  }

  const { fileName = 'voice-message.webm', mimeType } = input as any;
  const buffer = await readAudioAsArrayBuffer(input);
  const audio = arrayBufferToBase64(buffer);

  const response = await callAssistant(TRANSCRIBE_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify({
      audio,
      fileName,
      mimeType: mimeType || inferMimeType(input) || 'audio/webm',
    }),
  });

  const text: unknown = response?.text;
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('Transcription did not return any text.');
  }

  return text.trim();
}

function inferMimeType(input: TranscribeAudioInput): string | undefined {
  if ('mimeType' in input && input.mimeType) return input.mimeType;
  if ('blob' in input && input.blob && typeof input.blob.type === 'string') {
    return input.blob.type;
  }
  return undefined;
}

async function readAudioAsArrayBuffer(input: TranscribeAudioInput): Promise<ArrayBuffer> {
  if ('blob' in input) {
    if (!input.blob) {
      throw new Error('Audio blob is empty.');
    }
    if (typeof input.blob.arrayBuffer === 'function') {
      return await input.blob.arrayBuffer();
    }
    throw new Error('Unable to read audio blob.');
  }

  if (!input.uri) {
    throw new Error('Audio URI is missing.');
  }

  const response = await fetch(input.uri);
  if (!response.ok) {
    throw new Error('Unable to read audio data from URI.');
  }
  const blob = await response.blob();
  return await blob.arrayBuffer();
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const globalBuffer = typeof (globalThis as any).Buffer !== 'undefined' ? (globalThis as any).Buffer : null;
  if (globalBuffer) {
    return globalBuffer.from(buffer).toString('base64');
  }

  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    let chunkString = '';
    for (let j = 0; j < chunk.length; j++) {
      chunkString += String.fromCharCode(chunk[j]);
    }
    binary += chunkString;
  }
  if (typeof btoa === 'function') {
    return btoa(binary);
  }
  throw new Error('Base64 encoding is not supported in this environment.');
}
