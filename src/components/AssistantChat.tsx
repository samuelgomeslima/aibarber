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
import { Audio } from "expo-av";

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
  const [showQuickReplies, setShowQuickReplies] = useState(true);

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
  const recordedChunksRef = useRef<Blob[]>([]);
  const nativeRecordingRef = useRef<Audio.Recording | null>(null);

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
      if (Platform.OS === "web") {
        if (mediaRecorderRef.current) {
          try {
            mediaRecorderRef.current.stop();
          } catch (e) {
            // ignore cleanup errors
          }
          mediaRecorderRef.current = null;
        }
      } else if (nativeRecordingRef.current) {
        const recording = nativeRecordingRef.current;
        nativeRecordingRef.current = null;
        void recording.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  const voiceSupported = Platform.OS === "web" || Platform.OS === "ios" || Platform.OS === "android";

  const canSend = useMemo(() => {
    return Boolean(input.trim()) && !pending && isOpenAiConfigured && !voiceTranscribing;
  }, [input, pending, voiceTranscribing]);

  const startVoiceRecording = useCallback(async () => {
    if (!isOpenAiConfigured) {
      setError("Set EXPO_PUBLIC_OPENAI_API_KEY to enable voice input.");
      return;
    }
    if (!voiceSupported) {
      setError("Voice capture is not supported on this device yet.");
      return;
    }

    if (Platform.OS === "web") {
      const globalNavigator: any = (globalThis as any).navigator;
      if (!globalNavigator?.mediaDevices?.getUserMedia) {
        setError("Voice capture is not supported in this browser.");
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
        const message = e?.message ? String(e.message) : "Unable to start voice recording.";
        setError(message);
        setIsRecording(false);
      }
      return;
    }

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setError("Microphone permission is required to use voice input.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
        shouldDuckAndroid: true,
        staysActiveInBackground: false,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      nativeRecordingRef.current = recording;
      setError(null);
      setIsRecording(true);
    } catch (e: any) {
      const message = e?.message ? String(e.message) : "Unable to start voice recording.";
      setError(message);
      setIsRecording(false);
      nativeRecordingRef.current = null;
      try {
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: false });
      } catch {
        // ignore
      }
    }
  }, [voiceSupported]);

  type VoiceRecordingResult =
    | { kind: "web"; blob: Blob; mimeType: string; fileName: string }
    | { kind: "native"; uri: string; mimeType: string; fileName: string };

  const stopVoiceRecording = useCallback(async (): Promise<VoiceRecordingResult | null> => {
    if (Platform.OS === "web") {
      const recorder = mediaRecorderRef.current;
      if (!recorder) return null;

      return new Promise<VoiceRecordingResult | null>((resolve, reject) => {
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
            if (!blob) {
              resolve(null);
              return;
            }
            resolve({ kind: "web", blob, mimeType: recorder.mimeType || "audio/webm", fileName: "voice-message.webm" });
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
    }

    const recording = nativeRecordingRef.current;
    if (!recording) return null;

    try {
      await recording.stopAndUnloadAsync();
    } catch (err) {
      nativeRecordingRef.current = null;
      throw err;
    }

    const uri = recording.getURI();
    nativeRecordingRef.current = null;

    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: false });
    } catch {
      // ignore reset errors
    }

    if (!uri) {
      return null;
    }

    const fileName = Platform.select({ ios: "voice-message.m4a", android: "voice-message.m4a", default: "voice-message.m4a" });
    return { kind: "native", uri, mimeType: "audio/m4a", fileName: fileName ?? "voice-message.m4a" };
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
        const recording = await stopVoiceRecording();
        if (!recording) {
          setError("No audio captured. Try again.");
          return;
        }
        const transcript = await transcribeAudio(
          recording.kind === "web"
            ? {
                blob: recording.blob,
                fileName: recording.fileName,
                mimeType: recording.mimeType,
              }
            : {
                uri: recording.uri,
                fileName: recording.fileName,
                mimeType: recording.mimeType,
              },
        );
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
      setShowQuickReplies(false);
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

        {quickReplies.length > 0 && (
          <View
            style={[
              styles.quickRepliesContainer,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            {showQuickReplies ? (
              <>
                <View style={styles.quickRepliesHeader}>
                  <View style={styles.quickRepliesHeaderContent}>
                    <Ionicons name="sparkles-outline" size={16} color={colors.subtext} />
                    <Text style={[styles.quickRepliesTitle, { color: colors.text }]}>Suggestions</Text>
                  </View>
                  <Pressable
                    onPress={() => setShowQuickReplies(false)}
                    accessibilityRole="button"
                    accessibilityLabel="Hide suggestions"
                  >
                    <Ionicons name="close" size={16} color={colors.subtext} />
                  </Pressable>
                </View>
                <View style={styles.quickReplyList}>
                  {quickReplies.map((suggestion) => (
                    <Pressable
                      key={suggestion}
                      onPress={() => handleQuickReply(suggestion)}
                      disabled={pending || voiceTranscribing || !isOpenAiConfigured}
                      style={[
                        styles.quickReplyChip,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.bg,
                          opacity: pending || voiceTranscribing || !isOpenAiConfigured ? 0.5 : 1,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Send quick message: ${suggestion}`}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.subtext} />
                      <Text style={[styles.quickReplyText, { color: colors.text }]}>{suggestion}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : (
              <Pressable
                style={styles.quickRepliesToggle}
                onPress={() => setShowQuickReplies(true)}
                accessibilityRole="button"
                accessibilityLabel="Show suggestions"
              >
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.subtext} />
                <Text style={[styles.quickRepliesToggleText, { color: colors.text }]}>Show suggestions</Text>
              </Pressable>
            )}
          </View>
        )}

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
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  quickRepliesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  quickRepliesHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  quickRepliesTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  quickReplyList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickReplyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  quickReplyText: {
    fontSize: 13,
    fontWeight: "600",
  },
  quickRepliesToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
  },
  quickRepliesToggleText: {
    fontSize: 13,
    fontWeight: "600",
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