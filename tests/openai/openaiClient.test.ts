import { describe, expect, it, vi } from "vitest";
import { createOpenAIClient } from "../../src/lib/openai";

describe("createOpenAIClient", () => {
  it("uses the provided fetch implementation for chat completions", async () => {
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
      apiUrl: "/api/chat",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const payload = { messages: [{ role: "user" as const, content: "Hi" }] };
    const response = await client.callChatCompletion(payload);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/chat",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      }),
    );
    expect(response.choices[0]?.message.content).toBe("Hello");
  });

  it("throws a configuration error when the chat API route is missing", async () => {
    const client = createOpenAIClient({ apiUrl: "" });
    await expect(
      client.callChatCompletion({ messages: [{ role: "user", content: "" }] }),
    ).rejects.toThrowError(/chat assistant API is not configured/);
  });
});

