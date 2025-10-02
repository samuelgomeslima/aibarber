const API_BASE = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');
const API_TOKEN =
  process.env.EXPO_PUBLIC_API_TOKEN ?? process.env.EXPO_PUBLIC_IMAGE_API_TOKEN ?? '';

function resolveApiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = API_BASE || '';
  return `${base}${normalizedPath}`;
}

function buildErrorMessage(status: number, body: any) {
  if (body && typeof body === 'object') {
    if ('details' in body && typeof (body as any).details === 'string') {
      return (body as any).details;
    }
    if ('error' in body && typeof (body as any).error === 'string') {
      return (body as any).error;
    }
  }
  if (status >= 400 && status < 500) return `Request failed with status ${status}.`;
  if (status >= 500) return 'The assistant service is currently unavailable.';
  return 'Unexpected error calling the assistant service.';
}

async function callApi(path: string, options: RequestInit & { body?: any }) {
  const url = resolveApiUrl(path);
  const headers = new Headers(options.headers ?? {});
  headers.set('Accept', 'application/json');
  if (API_TOKEN) {
    headers.set('x-api-key', API_TOKEN);
  }

  let body = options.body;
  if (body && typeof body !== 'string' && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(body);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    body,
  });

  const text = await response.text();
  let parsed: any = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      parsed = text;
    }
  }

  if (!response.ok) {
    throw new Error(buildErrorMessage(response.status, parsed));
  }

  return parsed;
}

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export const isOpenAiConfigured = typeof API_TOKEN === 'string' && API_TOKEN.length > 0;

export async function callOpenAIChatCompletion(payload: Record<string, any>) {
  const body = await callApi('/api/chat/completions', {
    method: 'POST',
    body: payload,
  });
  if (!body) {
    throw new Error('Assistant service returned an empty response.');
  }
  return body;
}

export async function fetchAssistantReply(messages: ChatMessage[]): Promise<string> {
  const body = await callOpenAIChatCompletion({ messages });
  const content = body?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Assistant did not return any content.');
  }

  return content.trim();
}

type BlobLike = Blob & { arrayBuffer?: () => Promise<ArrayBuffer> };

type TranscribeAudioInput =
  | { uri: string; fileName?: string; mimeType?: string }
  | { blob: BlobLike; fileName?: string; mimeType?: string };

function bufferToBase64(buffer: ArrayBuffer): string {
  const globalBuffer: any = (globalThis as any)?.Buffer;
  if (globalBuffer && typeof globalBuffer.from === 'function') {
    return globalBuffer.from(buffer).toString('base64');
  }

  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  if (typeof btoa === 'function') {
    return btoa(binary);
  }
  throw new Error('Environment does not support base64 encoding.');
}

async function blobToBase64(blob: BlobLike): Promise<string> {
  if (typeof FileReader !== 'undefined') {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error ?? new Error('Failed to read audio blob.'));
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          const commaIndex = result.indexOf(',');
          resolve(commaIndex === -1 ? result : result.slice(commaIndex + 1));
          return;
        }
        reject(new Error('Unexpected FileReader result.'));
      };
      reader.readAsDataURL(blob as Blob);
    });
  }

  if (typeof blob.arrayBuffer === 'function') {
    const buffer = await blob.arrayBuffer();
    return bufferToBase64(buffer);
  }

  throw new Error('Unsupported blob input.');
}

async function uriToBase64(uri: string): Promise<{ base64: string; mimeType?: string }> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error('Failed to load audio for transcription.');
  }
  const blob = (await response.blob()) as BlobLike;
  const base64 = await blobToBase64(blob);
  return { base64, mimeType: blob.type };
}

export async function transcribeAudio(input: TranscribeAudioInput) {
  if (!isOpenAiConfigured) {
    throw new Error('Assistant service is not configured. Set EXPO_PUBLIC_API_TOKEN in your environment.');
  }

  let base64: string;
  let mimeType = input.mimeType;

  if ('blob' in input) {
    base64 = await blobToBase64(input.blob);
    mimeType = mimeType ?? (input.blob as any)?.type ?? 'audio/webm';
  } else {
    const result = await uriToBase64(input.uri);
    base64 = result.base64;
    mimeType = mimeType ?? result.mimeType ?? 'audio/webm';
  }

  const payload = {
    file: `data:${mimeType};base64,${base64}`,
    fileName: input.fileName ?? 'voice-message.webm',
    mimeType,
  };

  const body = await callApi('/api/audio/transcriptions', {
    method: 'POST',
    body: payload,
  });

  const text: unknown = body?.text ?? body?.transcript ?? null;
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('Transcription did not return any text.');
  }

  return text.trim();
}
