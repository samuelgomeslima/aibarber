import React, { useEffect, useMemo, useRef } from "react";
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
  useAssistantChat,
  type AgentRunner,
  type QuickReplyFactory,
} from "../hooks/useAssistantChat";
import { defaultComponentCopy } from "../locales/componentCopy";
import type { AssistantChatCopy } from "../locales/types";
import { runSupportAgent } from "../lib/supportAgent";

const supportAgentRunner: AgentRunner = ({ systemPrompt, contextSummary, conversation }) =>
  runSupportAgent({ systemPrompt, contextSummary, conversation });

const buildSupportQuickReplyFactory = (replies: string[]): QuickReplyFactory =>
  ({ copy }: { copy: AssistantChatCopy }) => {
    if (replies.length > 0) {
      return replies;
    }
    const suggestions = new Set<string>();
    suggestions.add(copy.quickReplies.existingBookings);
    suggestions.add(copy.quickReplies.bookService);
    suggestions.add(copy.quickReplies.bookSpecificService("support request"));
    suggestions.add(copy.quickReplies.barberAvailability("support team"));
    return Array.from(suggestions);
  };

type SupportChatProps = {
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
  title: string;
  subtitle?: string;
  copy?: AssistantChatCopy;
  quickReplies?: string[];
};

export default function SupportChat({
  colors,
  systemPrompt,
  contextSummary,
  title,
  subtitle,
  copy = defaultComponentCopy.supportChat,
  quickReplies = [],
}: SupportChatProps) {
  const scrollRef = useRef<ScrollView>(null);

  const quickReplyFactory = useMemo(
    () => buildSupportQuickReplyFactory(quickReplies),
    [quickReplies],
  );

  const {
    messages,
    input,
    setInput,
    pending,
    error,
    canSend,
    assistantEnabled,
    quickReplies: suggestions,
    suggestionsVisible,
    showSuggestions,
    hideSuggestions,
    isRecording,
    voiceTranscribing,
    voiceButtonDisabled,
    handleSend,
    handleQuickReply,
    handleVoicePress,
  } = useAssistantChat({
    systemPrompt,
    contextSummary,
    services: [],
    copy,
    agentRunner: supportAgentRunner,
    quickReplyFactory,
  });

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={[styles.headerCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <View style={[styles.headerIcon, { backgroundColor: colors.accent }]}> 
            <Ionicons name="life-buoy-outline" size={20} color={colors.accentFgOn} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
            {subtitle ? (
              <Text style={[styles.headerSubtitle, { color: colors.subtext }]}>{subtitle}</Text>
            ) : null}
          </View>
        </View>

        <View style={[styles.chatPanel, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <ScrollView
            ref={scrollRef}
            style={styles.messages}
            contentContainerStyle={{ gap: 12, paddingBottom: 16 }}
          >
            {messages.map((msg, index) => {
              const fromAssistant = msg.role === "assistant";
              return (
                <View
                  key={`msg-${index}`}
                  style={[
                    styles.bubble,
                    {
                      alignSelf: fromAssistant ? "flex-start" : "flex-end",
                      backgroundColor: fromAssistant ? colors.bg : colors.accent,
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
              <View
                style={[
                  styles.bubble,
                  {
                    alignSelf: "flex-start",
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.typingRow}>
                  <ActivityIndicator size="small" color={colors.subtext} />
                  <Text style={[styles.typingText, { color: colors.subtext }]}>{copy.typingIndicator}</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}

          {suggestions.length > 0 && suggestionsVisible ? (
            <View
              style={[styles.quickRepliesContainer, { borderColor: colors.border, backgroundColor: colors.bg }]}
            >
              <View style={styles.quickRepliesHeader}>
                <Text style={[styles.quickRepliesTitle, { color: colors.subtext }]}>
                  {copy.quickRepliesTitle}
                </Text>
                <Pressable
                  onPress={hideSuggestions}
                  accessibilityRole="button"
                  accessibilityLabel={copy.suggestionsAccessibility.hide}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={18} color={colors.subtext} />
                </Pressable>
              </View>
              <View style={styles.quickRepliesList}>
                {suggestions.map((suggestion) => (
                  <Pressable
                    key={suggestion}
                    onPress={() => handleQuickReply(suggestion)}
                    disabled={pending || voiceTranscribing || !assistantEnabled}
                    style={[
                      styles.quickReplyPill,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                        opacity: pending || voiceTranscribing || !assistantEnabled ? 0.5 : 1,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={copy.quickReplyAccessibility(suggestion)}
                  >
                    <Text style={[styles.quickReplyText, { color: colors.text }]}>{suggestion}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : suggestions.length > 0 ? (
            <Pressable
              onPress={showSuggestions}
              style={[styles.quickRepliesToggle, { borderColor: colors.border, backgroundColor: colors.bg }]}
              accessibilityRole="button"
              accessibilityLabel={copy.suggestionsAccessibility.show}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.subtext} />
              <Text style={[styles.quickRepliesToggleText, { color: colors.subtext }]}>
                {copy.quickRepliesToggleShow}
              </Text>
            </Pressable>
          ) : null}

          <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.bg }]}> 
            <Pressable
              onPress={handleVoicePress}
              disabled={voiceButtonDisabled}
              style={({ pressed }) => [
                styles.voiceButton,
                {
                  backgroundColor: pressed || isRecording ? colors.accent : "transparent",
                  borderColor: colors.accent,
                  opacity: voiceButtonDisabled ? 0.5 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                isRecording
                  ? copy.voiceButtonAccessibility.stop
                  : copy.voiceButtonAccessibility.start
              }
            >
              {voiceTranscribing ? (
                <ActivityIndicator size="small" color={colors.accentFgOn} />
              ) : (
                <Ionicons
                  name={isRecording ? "stop-circle" : "mic-outline"}
                  size={18}
                  color={isRecording ? colors.accentFgOn : colors.accent}
                />
              )}
            </Pressable>

            <TextInput
              value={input}
              onChangeText={setInput}
              style={[styles.input, { color: colors.text }]}
              placeholder={copy.inputPlaceholder}
              placeholderTextColor={colors.subtext}
              onFocus={showSuggestions}
              editable={!pending && assistantEnabled && !voiceTranscribing}
              multiline
              accessibilityLabel={copy.inputPlaceholder}
            />

            <Pressable
              onPress={handleSend}
              disabled={!canSend}
              style={({ pressed }) => [
                styles.sendButton,
                {
                  backgroundColor: pressed || !canSend ? colors.accent : colors.accent,
                  opacity: !canSend ? 0.6 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={copy.sendAccessibility}
            >
              {pending ? (
                <ActivityIndicator size="small" color={colors.accentFgOn} />
              ) : (
                <Ionicons name="send" size={18} color={colors.accentFgOn} />
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  chatPanel: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  messages: {
    flex: 1,
  },
  bubble: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    maxWidth: "85%",
  },
  messageText: {
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 20,
  },
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  typingText: {
    fontSize: 13,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  quickRepliesContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  quickRepliesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  quickRepliesTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  quickRepliesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickReplyPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  quickReplyText: {
    fontSize: 13,
    fontWeight: "600",
  },
  quickRepliesToggle: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  quickRepliesToggleText: {
    fontSize: 12,
    fontWeight: "700",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  voiceButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 120,
    fontSize: 15,
    fontWeight: "500",
  },
  sendButton: {
    width: 44,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
