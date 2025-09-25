import React, { useEffect, useMemo, useRef, useState } from "react";
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

import {
  ChatMessage,
  fetchAssistantReply,
  isOpenAiConfigured as checkOpenAiConfigured,
} from "../lib/openai";

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
};

const INITIAL_ASSISTANT_MESSAGE =
  "Hi! I'm your AIBarber assistant. Ask me about availability, services, or to plan new bookings.";

export default function AssistantChat({ colors, systemPrompt, contextSummary }: AssistantChatProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([
    { role: "assistant", content: INITIAL_ASSISTANT_MESSAGE },
  ]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openAiConfigured, setOpenAiConfigured] = useState(true);

  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  useEffect(() => {
    let active = true;
    checkOpenAiConfigured()
      .then((configured) => {
        if (active) setOpenAiConfigured(configured);
      })
      .catch(() => {
        if (active) setOpenAiConfigured(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const canSend = useMemo(() => {
    return Boolean(input.trim()) && !pending && openAiConfigured;
  }, [input, pending, openAiConfigured]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMessage: DisplayMessage = { role: "user", content: trimmed };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setPending(true);
    setError(null);

    try {
      const payload: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        ...nextMessages.map((m) => ({ role: m.role, content: m.content })),
      ];
      const reply = await fetchAssistantReply(payload);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e: any) {
      const message = e?.message ? String(e.message) : "Something went wrong.";
      setError(message);
    } finally {
      setPending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={[styles.summaryCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>Booking context</Text>
          <Text style={[styles.summaryText, { color: colors.subtext }]}>{contextSummary}</Text>
          {!openAiConfigured && (
            <Text style={[styles.warningText, { color: colors.danger }]}>Set OPENAI_API_KEY to enable the assistant.</Text>
          )}
        </View>

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

        <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask about bookings..."
            placeholderTextColor={colors.subtext}
            multiline
            style={[styles.input, { color: colors.text }]}
            editable={!pending && openAiConfigured}
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
  summaryCard: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 8 },
  summaryTitle: { fontSize: 16, fontWeight: "800" },
  summaryText: { fontSize: 13, lineHeight: 18 },
  warningText: { marginTop: 8, fontSize: 12, fontWeight: "700" },
  messages: { flex: 1 },
  bubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  messageText: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
  errorText: { fontSize: 12, fontWeight: "700" },
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
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
});
