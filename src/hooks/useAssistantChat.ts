import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";

import { runBookingAgent } from "../lib/bookingAgent";
import { BARBERS, type Service } from "../lib/domain";
import { isOpenAiConfigured, transcribeAudio } from "../lib/openai";
import type { AssistantChatCopy } from "../locales/types";

export type DisplayMessage = {
  role: "assistant" | "user";
  content: string;
};


type UseAssistantChatOptions = {
  systemPrompt: string;
  contextSummary: string;
  services: Service[];
  copy: AssistantChatCopy;
  onBookingsMutated?: () => Promise<void> | void;
};

type UseAssistantChatResult = {
  messages: DisplayMessage[];
  input: string;
  setInput: (value: string) => void;
  pending: boolean;
  error: string | null;
  canSend: boolean;
  assistantEnabled: boolean;
  quickReplies: string[];
  suggestionsVisible: boolean;
  showSuggestions: () => void;
  hideSuggestions: () => void;
  isRecording: boolean;
  voiceTranscribing: boolean;
  voiceButtonDisabled: boolean;
  handleSend: () => void;
  handleQuickReply: (suggestion: string) => void;
  handleVoicePress: () => Promise<void>;
};

export function useAssistantChat({
  systemPrompt,
  contextSummary,
  services,
  copy,
  onBookingsMutated,
}: UseAssistantChatOptions): UseAssistantChatResult {
  const [messages, setMessages] = useState<DisplayMessage[]>([
    { role: "assistant", content: copy.initialMessage },
  ]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [voiceTranscribing, setVoiceTranscribing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestionsVisible, setSuggestionsVisible] = useState(false);

  const messagesRef = useRef(messages);
  const mediaRecorderRef = useRef<any>(null);
  const recordedChunksRef = useRef<any[]>([]);
  const lastApiWarningRef = useRef(copy.apiKeyWarning);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 0) {
        return [{ role: "assistant", content: copy.initialMessage }];
      }
      const next = [...prev];
      const first = next[0];
      if (first?.role === "assistant" && first.content !== copy.initialMessage) {
        next[0] = { role: "assistant", content: copy.initialMessage };
        return next;
      }
      return prev;
    });
  }, [copy.initialMessage]);

  const quickReplies = useMemo(() => {
    const replies = [copy.quickReplies.existingBookings, copy.quickReplies.bookService];

    services.slice(0, 2).forEach((service) => {
      replies.push(copy.quickReplies.bookSpecificService(service.name));
    });

    BARBERS.slice(0, 2).forEach((barber) => {
      replies.push(copy.quickReplies.barberAvailability(barber.name));
    });

    return replies;
  }, [copy.quickReplies, services]);

  useEffect(() => {
    const trimmed = contextSummary.trim();
    setMessages((prev) => {
      const contextPrefix = copy.contextPrefix;
      const existingIndex = prev.findIndex(
        (msg) => msg.role === "assistant" && msg.content.startsWith(contextPrefix),
      );

      if (!trimmed) {
        if (existingIndex === -1) return prev;
        const next = [...prev];
        next.splice(existingIndex, 1);
        return next;
      }

      const contextContent = `${contextPrefix}\n${trimmed}`;
      if (existingIndex !== -1) {
        if (prev[existingIndex].content === contextContent) {
          return prev;
        }
        const next = [...prev];
        next[existingIndex] = { role: "assistant", content: contextContent };
        return next;
      }

      const next = [...prev];
      const insertIndex = next.length > 0 ? 1 : 0;
      next.splice(insertIndex, 0, { role: "assistant", content: contextContent });
      return next;
    });
  }, [contextSummary, copy.contextPrefix]);

  useEffect(() => {
    setMessages((prev) => {
      const filtered = prev.filter(
        (msg) =>
          !(
            msg.role === "assistant" &&
            (msg.content === lastApiWarningRef.current || msg.content === copy.apiKeyWarning)
          ),
      );

      if (isOpenAiConfigured) {
        lastApiWarningRef.current = copy.apiKeyWarning;
        return filtered;
      }

      if (
        filtered.some(
          (msg) => msg.role === "assistant" && msg.content === copy.apiKeyWarning,
        )
      ) {
        lastApiWarningRef.current = copy.apiKeyWarning;
        return filtered;
      }

      lastApiWarningRef.current = copy.apiKeyWarning;
      return [...filtered, { role: "assistant", content: copy.apiKeyWarning }];
    });
  }, [copy.apiKeyWarning, isOpenAiConfigured]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current) {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, []);

  const voiceSupported = Platform.OS === "web";

  const canSend = useMemo(() => {
    return Boolean(input.trim()) && !pending && isOpenAiConfigured && !voiceTranscribing;
  }, [input, pending, voiceTranscribing]);

  const startVoiceRecording = useCallback(async () => {
    if (!isOpenAiConfigured) {
      setError(copy.errors.missingApiKey);
      return;
    }
    const globalNavigator: any = Platform.OS === "web" ? (globalThis as any).navigator : null;
    if (!globalNavigator?.mediaDevices?.getUserMedia) {
      setError(copy.errors.voiceWebOnly);
      return;
    }

    try {
      const RecorderCtor = (globalThis as any).MediaRecorder;
      if (typeof RecorderCtor !== "function") {
        setError(copy.errors.voiceUnsupported);
        return;
      }

      const stream = await globalNavigator.mediaDevices.getUserMedia({ audio: true });
      recordedChunksRef.current = [];
      const recorder = new RecorderCtor(stream);
      recorder.ondataavailable = (event: any) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setError(null);
      setIsRecording(true);
    } catch (e: any) {
      const message = e?.message ? String(e.message) : copy.errors.voiceStartFailed;
      setError(message);
      setIsRecording(false);
    }
  }, [
    copy.errors.missingApiKey,
    copy.errors.voiceStartFailed,
    copy.errors.voiceUnsupported,
    copy.errors.voiceWebOnly,
    isOpenAiConfigured,
  ]);

  const stopVoiceRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return null;

    return new Promise<any>((resolve, reject) => {
      recorder.onstop = () => {
        try {
          const chunks = recordedChunksRef.current;
          const BlobCtor = (globalThis as any).Blob;
          const blob =
            chunks.length && typeof BlobCtor === "function"
              ? new BlobCtor(chunks, { type: recorder.mimeType || "audio/webm" })
              : null;
          recorder.stream.getTracks().forEach((track: any) => track.stop());
          mediaRecorderRef.current = null;
          recordedChunksRef.current = [];
          resolve(blob);
        } catch (err) {
          reject(err);
        }
      };

      try {
        recorder.stop();
      } catch (err) {
        mediaRecorderRef.current = null;
        reject(err);
      }
    });
  }, []);

  const sendMessage = useCallback(
    async (rawText: string) => {
      const trimmed = rawText.trim();
      if (!trimmed || pending) return;

      const userMessage: DisplayMessage = { role: "user", content: trimmed };
      const nextMessages = [...messagesRef.current, userMessage];
      setMessages(nextMessages);
      setPending(true);
      setError(null);

      try {
        const reply = await runBookingAgent({
          systemPrompt,
          contextSummary,
          conversation: nextMessages,
          onBookingsMutated,
          services,
        });
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      } catch (e: any) {
        const message = e?.message ? String(e.message) : copy.errors.generic;
        setError(message);
      } finally {
        setPending(false);
      }
    },
    [contextSummary, copy.errors.generic, onBookingsMutated, pending, services, systemPrompt],
  );

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput("");
    void sendMessage(trimmed);
  }, [input, sendMessage]);

  const handleQuickReply = useCallback(
    (suggestion: string) => {
      if (!suggestion) return;
      setInput("");
      setSuggestionsVisible(false);
      void sendMessage(suggestion);
    },
    [sendMessage],
  );

  const handleVoicePress = useCallback(async () => {
    if (pending || voiceTranscribing) return;

    if (isRecording) {
      setIsRecording(false);
      setVoiceTranscribing(true);
      try {
        const blob = await stopVoiceRecording();
        if (!blob) {
          setError(copy.errors.noAudio);
          return;
        }
        const mimeType = blob.type || "audio/webm";
        const extension = (() => {
          if (!mimeType) return "webm";
          if (mimeType.includes("mp4") || mimeType.includes("m4a")) {
            return "m4a";
          }
          if (mimeType.includes("ogg")) {
            return "ogg";
          }
          if (mimeType.includes("wav")) {
            return "wav";
          }
          if (mimeType.includes("mp3")) {
            return "mp3";
          }
          if (mimeType.includes("webm")) {
            return "webm";
          }
          return "webm";
        })();
        const transcript = await transcribeAudio({
          blob,
          fileName: `voice-message.${extension}`,
          mimeType,
        });
        await sendMessage(transcript);
      } catch (e: any) {
        const message = e?.message ? String(e.message) : copy.errors.processFailed;
        setError(message);
      } finally {
        setVoiceTranscribing(false);
      }
    } else {
      await startVoiceRecording();
    }
  }, [
    copy.errors.noAudio,
    copy.errors.processFailed,
    isRecording,
    pending,
    sendMessage,
    startVoiceRecording,
    stopVoiceRecording,
    voiceTranscribing,
  ]);

  const showSuggestions = useCallback(() => setSuggestionsVisible(true), []);
  const hideSuggestions = useCallback(() => setSuggestionsVisible(false), []);

  return {
    messages,
    input,
    setInput,
    pending,
    error,
    canSend,
    assistantEnabled: isOpenAiConfigured,
    quickReplies,
    suggestionsVisible,
    showSuggestions,
    hideSuggestions,
    isRecording,
    voiceTranscribing,
    voiceButtonDisabled:
      !isOpenAiConfigured || pending || voiceTranscribing || (!voiceSupported && !isRecording),
    handleSend,
    handleQuickReply,
    handleVoicePress,
  };
}
