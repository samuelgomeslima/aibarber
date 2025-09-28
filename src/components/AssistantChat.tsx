import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { isOpenAiConfigured, transcribeAudio } from "../lib/openai";
import { runBookingAgent } from "../lib/bookingAgent";
import { BARBERS, type Service } from "../lib/domain";

type DisplayMessage = {
  role: "assistant" | "user";
  content: string;
};

type AssistantChatProps = {
  colors: {
    text: string;
    subtext: string;
    surface: string;
    border: string;
    accent: string;
    accentFgOn: string;
    danger: string;
    bg: string;
  };
  systemPrompt: string;
  contextSummary: string;
  onBookingsMutated?: () => Promise<void> | void;
  services: Service[];
};

const INITIAL_ASSISTANT_MESSAGE =
  "Hi! I'm your AIBarber agent. I can check availability, book services, and cancel existing appointments for you.";
const API_KEY_WARNING_MESSAGE = "Set EXPO_PUBLIC_OPENAI_API_KEY to enable the assistant.";

export default function AssistantChat({ colors, systemPrompt, contextSummary, onBookingsMutated, services }: AssistantChatProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([
    { role: "assistant", content: INITIAL_ASSISTANT_MESSAGE },
  ]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [voiceTranscribing, setVoiceTranscribing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestionsVisible, setSuggestionsVisible] = useState(true);

  const quickReplies = useMemo(() => {
    const replies = [
      "Show my existing bookings",
      "Help me book a service",
    ];

    services.slice(0, 2).forEach((service) => {
      replies.push(`Book a ${service.name}`);
    });

    BARBERS.slice(0, 2).forEach((barber) => {
      replies.push(`Available hours for ${barber.name}`);
    });

    return replies;
  }, [services]);

  const scrollRef = useRef<ScrollView>(null);
  const messagesRef = useRef(messages);
  const mediaRecorderRef = useRef<any>(null);
  const recordedChunksRef = useRef<any[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    const trimmed = contextSummary.trim();
    setMessages((prev) => {
      const contextPrefix = "Booking context:";
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
  }, [contextSummary]);
  useEffect(() => {
    if (isOpenAiConfigured) {
      setMessages((prev) => {
        const index = prev.findIndex(
          (msg) => msg.role === "assistant" && msg.content === API_KEY_WARNING_MESSAGE,
        );
        if (index === -1) return prev;
        const next = [...prev];
        next.splice(index, 1);
        return next;
      });
      return;
    }

    setMessages((prev) => {
      if (prev.some((msg) => msg.role === "assistant" && msg.content === API_KEY_WARNING_MESSAGE)) {
        return prev;
      }
      return [...prev, { role: "assistant", content: API_KEY_WARNING_MESSAGE }];
    });
  }, [isOpenAiConfigured]);
  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current) {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
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
      setError("Set EXPO_PUBLIC_OPENAI_API_KEY to enable voice input.");
      return;
    }
    const globalNavigator: any = Platform.OS === "web" ? (globalThis as any).navigator : null;
    if (!globalNavigator?.mediaDevices?.getUserMedia) {
      setError("Voice capture is currently supported on the web experience only.");
      return;
    }

    try {
      const RecorderCtor = (globalThis as any).MediaRecorder;
      if (typeof RecorderCtor !== "function") {
        setError("Voice capture is not supported in this browser.");
        return;
      }

      const stream = await globalNavigator.mediaDevices.getUserMedia({ audio: true });
      recordedChunksRef.current = [];
      const recorder = new RecorderCtor(stream);
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setError(null);
      setIsRecording(true);
    } catch (e: any) {
      const message = e?.message ? String(e.message) : "Unable to start voice recording.";
      setError(message);
      setIsRecording(false);
    }
  }, []);

  const stopVoiceRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return null;

    return new Promise<any>((resolve, reject) => {
      recorder.onstop = () => {
        try {
          const chunks = recordedChunksRef.current;
          const BlobCtor = (globalThis as any).Blob;
          const blob = chunks.length && typeof BlobCtor === "function"
            ? new BlobCtor(chunks, { type: recorder.mimeType || "audio/webm" })
            : null;
          recorder.stream.getTracks().forEach((track) => track.stop());
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
        const message = e?.message ? String(e.message) : "Something went wrong.";
        setError(message);
      } finally {
        setPending(false);
      }
    },
    [contextSummary, onBookingsMutated, pending, services, systemPrompt],
  );

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput("");
    void sendMessage(trimmed);
  }, [input, sendMessage]);

  const handleVoicePress = useCallback(async () => {
    if (pending || voiceTranscribing) return;

    if (isRecording) {
      setIsRecording(false);
      setVoiceTranscribing(true);
      try {
        const blob = await stopVoiceRecording();
        if (!blob) {
          setError("No audio captured. Try again.");
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
        const message = e?.message ? String(e.message) : "Failed to process voice message.";
        setError(message);
      } finally {
        setVoiceTranscribing(false);
      }
    } else {
      await startVoiceRecording();
    }
  }, [isRecording, pending, sendMessage, startVoiceRecording, stopVoiceRecording, voiceTranscribing]);

  const voiceButtonDisabled =
    !isOpenAiConfigured || pending || voiceTranscribing || (!voiceSupported && !isRecording);

  const handleQuickReply = useCallback(
    (suggestion: string) => {
      if (!suggestion) return;
      setInput("");
      setSuggestionsVisible(false);
      void sendMessage(suggestion);
    },
    [sendMessage],
  );

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={{ gap: 12, paddingBottom: 16 }}>
          {messages.map((msg, index) => {
            const fromAssistant = msg.role === "assistant";
            return (
              <View
                key={`msg-${index}`}
                style={[
                  styles.bubble,
                  {
                    alignSelf: fromAssistant ? "flex-start" : "flex-end",
                    backgroundColor: fromAssistant ? colors.surface : colors.accent,
                    borderColor: fromAssistant ? colors.border : colors.accent,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    { color: fromAssistant ? colors.text : colors.accentFgOn },
                  ]}
                >
                  {msg.content}
                </Text>
              </View>
            );
          })}
          {pending && (
            <View style={[styles.bubble, { alignSelf: "flex-start", backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ActivityIndicator size="small" color={colors.subtext} />
            </View>
          )}
        </ScrollView>

        {error ? (
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        ) : null}

        {quickReplies.length > 0 && suggestionsVisible ? (
          <View
            style={[styles.quickRepliesContainer, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <View style={styles.quickRepliesHeader}>
              <Text style={[styles.quickRepliesTitle, { color: colors.subtext }]}>Suggested prompts</Text>
              <Pressable
                onPress={() => setSuggestionsVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Hide quick suggestions"
                hitSlop={8}
              >
                <Ionicons name="close" size={18} color={colors.subtext} />
              </Pressable>
            </View>
            <View style={styles.quickRepliesGrid}>
              {quickReplies.map((suggestion) => (
                <Pressable
                  key={suggestion}
                  onPress={() => handleQuickReply(suggestion)}
                  disabled={pending || voiceTranscribing || !isOpenAiConfigured}
                  style={[
                    styles.quickReplyCard,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                      opacity: pending || voiceTranscribing || !isOpenAiConfigured ? 0.5 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Send quick message: ${suggestion}`}
                >
                  <View style={[styles.quickReplyIcon, { backgroundColor: colors.accent }]}>
                    <Ionicons name="sparkles-outline" size={16} color={colors.accentFgOn} />
                  </View>
                  <Text style={[styles.quickReplyText, { color: colors.text }]}>{suggestion}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : quickReplies.length > 0 ? (
          <Pressable
            onPress={() => setSuggestionsVisible(true)}
            style={[styles.quickRepliesToggle, { borderColor: colors.border, backgroundColor: colors.surface }]}
            accessibilityRole="button"
            accessibilityLabel="Show quick suggestions"
          >
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.subtext} />
            <Text style={[styles.quickRepliesToggleText, { color: colors.subtext }]}>Show suggestions</Text>
          </Pressable>
        ) : null}

        <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Pressable
            onPress={handleVoicePress}
            disabled={voiceButtonDisabled}
            style={[
              styles.voiceButton,
              {
                borderColor: isRecording ? colors.danger : colors.border,
                backgroundColor: isRecording ? colors.danger : colors.surface,
                opacity: voiceButtonDisabled ? 0.4 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={isRecording ? "Stop voice input" : "Start voice input"}
          >
            {voiceTranscribing ? (
              <ActivityIndicator size="small" color={isRecording ? colors.surface : colors.subtext} />
            ) : (
              <Ionicons
                name={isRecording ? "stop" : "mic"}
                size={18}
                color={isRecording ? colors.surface : colors.subtext}
              />
            )}
          </Pressable>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask about bookings..."
            placeholderTextColor={colors.subtext}
            multiline
            style={[styles.input, { color: colors.text }]}
            editable={!pending && isOpenAiConfigured && !voiceTranscribing}
          />
          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            style={[styles.sendButton, { backgroundColor: canSend ? colors.accent : colors.border }]}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            {pending ? (
              <ActivityIndicator color={colors.accentFgOn} />
            ) : (
              <Ionicons name="send" size={18} color={colors.accentFgOn} />
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, padding: 16, gap: 16 },
  messages: { flex: 1 },
  bubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  messageText: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
  errorText: { fontSize: 12, fontWeight: "700" },
  quickRepliesContainer: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  quickRepliesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  quickRepliesTitle: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  quickRepliesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  quickReplyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    flexShrink: 1,
    minWidth: 160,
  },
  quickReplyIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  quickReplyText: {
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 1,
  },
  quickRepliesToggle: {
    marginTop: 4,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  quickRepliesToggleText: {
    fontSize: 13,
    fontWeight: "700",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    maxHeight: 100,
  },
  voiceButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
});