import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_OPENAI_PROXY_TOKEN = process.env.EXPO_PUBLIC_OPENAI_PROXY_TOKEN;

async function importOpenAI() {
  return import("../../src/lib/openai");
}

afterEach(() => {
  vi.resetModules();
  if (typeof ORIGINAL_OPENAI_PROXY_TOKEN === "undefined") {
    delete process.env.EXPO_PUBLIC_OPENAI_PROXY_TOKEN;
  } else {
    process.env.EXPO_PUBLIC_OPENAI_PROXY_TOKEN = ORIGINAL_OPENAI_PROXY_TOKEN;
  }
});

describe("createOpenAIClient", () => {
  it("uses the provided fetch implementation for chat completions", async () => {
    process.env.EXPO_PUBLIC_OPENAI_PROXY_TOKEN = "test-token";
    const { createOpenAIClient } = await importOpenAI();

    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        id: "response-id",
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: "Hello" },
            finish_reason: null,
          },
        ],
      }),
    }));

    const client = createOpenAIClient({
      apiKey: "test-key",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const payload = { messages: [{ role: "user" as const, content: "Hi" }] };
    const response = await client.callChatCompletion(payload);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/chat",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "x-api-key": "test-token",
        }),
      }),
    );
    expect(response.choices[0]?.message.content).toBe("Hello");
  });

  it("surfaced backend errors returned by the proxy", async () => {
    process.env.EXPO_PUBLIC_OPENAI_PROXY_TOKEN = "test-token";
    const { createOpenAIClient } = await importOpenAI();

    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 503,
      json: async () => ({ error: { message: "Proxy unavailable" } }),
    }));

    const client = createOpenAIClient({
      apiKey: "test-key",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(
      client.callChatCompletion({ messages: [{ role: "user", content: "Hi" }] }),
    ).rejects.toThrowError("Proxy unavailable");
  });

  it("throws when the OpenAI proxy token is missing", async () => {
    delete process.env.EXPO_PUBLIC_OPENAI_PROXY_TOKEN;
    const { createOpenAIClient } = await importOpenAI();

    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        id: "response-id",
        choices: [],
      }),
    }));

    const client = createOpenAIClient({
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(client.isConfigured).toBe(false);
    await expect(
      client.callChatCompletion({ messages: [{ role: "user", content: "Hi" }] }),
    ).rejects.toThrowError(
      "OpenAI service is not configured. Ensure the backend has OPENAI_API_KEY and OPENAI_PROXY_TOKEN secrets set.",
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("uses the provided fetch implementation for audio transcription and handles missing text", async () => {
    process.env.EXPO_PUBLIC_OPENAI_PROXY_TOKEN = "test-token";
    const { createOpenAIClient } = await importOpenAI();

    const appendMock = vi.fn();
    const hadOriginalFormData = "FormData" in globalThis;
    const originalFormData = globalThis.FormData;
    class MockFormData {
      append = appendMock;
    }
    globalThis.FormData = MockFormData as unknown as typeof FormData;

    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ text: "  Hello world  " }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

    const client = createOpenAIClient({
      apiKey: "test-key",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    try {
      const transcript = await client.transcribeAudio({ uri: "file:///test.m4a" });

      expect(transcript).toBe("Hello world");
      expect(fetchImpl).toHaveBeenCalledTimes(1);

      const [url, requestInit] = fetchImpl.mock.calls[0] ?? [];
      expect(url).toBe("/api/transcribe");
      expect(requestInit).toEqual(
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "x-api-key": "test-token",
          }),
          body: expect.any(MockFormData),
        }),
      );

      await expect(client.transcribeAudio({ uri: "file:///missing-text.m4a" })).rejects.toThrowError(
        "Unexpected response format from OpenAI transcription.",
      );
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    } finally {
      if (hadOriginalFormData) {
        globalThis.FormData = originalFormData!;
      } else {
        delete (globalThis as { FormData?: typeof FormData }).FormData;
      }
    }
  });
});

