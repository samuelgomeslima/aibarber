import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  generateImage,
  isImageApiConfigured,
  type GenerateImageResponse,
} from "../lib/imageApi";

const SIZE_OPTIONS: Array<{ label: string; value: "256x256" | "512x512" | "1024x1024" }> = [
  { label: "Square • 256px", value: "256x256" },
  { label: "Detailed • 512px", value: "512x512" },
  { label: "Showcase • 1024px", value: "1024x1024" },
];

const QUALITY_OPTIONS: Array<{ label: string; value: "standard" | "hd"; helper: string }> = [
  { label: "Standard", value: "standard", helper: "Fastest option for quick previews." },
  { label: "HD", value: "hd", helper: "Sharper output, slightly slower." },
];

const API_WARNING_MESSAGE =
  "Set EXPO_PUBLIC_IMAGE_API_TOKEN to authenticate requests to the GenerateImage function.";

const PLACEHOLDER_PROMPT =
  "Create a premium hero image for a barber shop website featuring a modern haircut session.";

type ImageAssistantProps = {
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
};

type HistoryEntry = {
  id: string;
  response: GenerateImageResponse;
  imageUri: string;
  createdAt: number;
};

function toDataUri(image: GenerateImageResponse["data"]): string {
  if (image.b64_json) {
    return `data:image/png;base64,${image.b64_json}`;
  }
  if (image.url) return image.url;
  throw new Error("The image response did not include any renderable data.");
}

export default function ImageAssistant({ colors }: ImageAssistantProps) {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<"256x256" | "512x512" | "1024x1024">("1024x1024");
  const [quality, setQuality] = useState<"standard" | "hd">("standard");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const canGenerate = useMemo(() => {
    return Boolean(prompt.trim()) && !pending && isImageApiConfigured;
  }, [prompt, pending]);

  const helperMessage = isImageApiConfigured ? null : API_WARNING_MESSAGE;

  const handleGenerate = async () => {
    if (!prompt.trim() || pending) return;

    setPending(true);
    setError(null);

    try {
      const response = await generateImage({ prompt, size, quality });
      const uri = toDataUri(response.data);
      setHistory((prev) => [
        { id: `${Date.now()}-${Math.random()}`, response, imageUri: uri, createdAt: Date.now() },
        ...prev,
      ]);
    } catch (e: any) {
      setError(e?.message ?? "Unable to generate image.");
    } finally {
      setPending(false);
    }
  };

  const clearHistory = () => {
    setHistory([]);
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Image assistant</Text>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>Generate marketing visuals for your shop using the OpenAI image API deployed under <Text style={{ fontWeight: "700", color: colors.text }}>/api/GenerateImage</Text>.</Text>

        {helperMessage ? (
          <View style={[styles.banner, { borderColor: colors.danger, backgroundColor: "rgba(239,68,68,0.12)" }]}>
            <Text style={[styles.bannerText, { color: colors.danger }]}>{helperMessage}</Text>
          </View>
        ) : null}

        <View style={{ gap: 12 }}>
          <View>
            <Text style={[styles.label, { color: colors.subtext }]}>Prompt</Text>
            <TextInput
              multiline
              value={prompt}
              onChangeText={setPrompt}
              placeholder={PLACEHOLDER_PROMPT}
              placeholderTextColor={"rgba(255,255,255,0.4)"}
              style={[styles.promptInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
            />
          </View>

          <View>
            <Text style={[styles.label, { color: colors.subtext }]}>Size</Text>
            <View style={styles.optionRow}>
              {SIZE_OPTIONS.map((option) => {
                const active = option.value === size;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setSize(option.value)}
                    style={[
                      styles.optionChip,
                      { borderColor: colors.border },
                      active && { backgroundColor: colors.accent, borderColor: colors.accent },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${option.label}`}
                  >
                    <Text style={[styles.optionText, { color: active ? colors.accentFgOn : colors.subtext }]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View>
            <Text style={[styles.label, { color: colors.subtext }]}>Quality</Text>
            <View style={styles.optionRow}>
              {QUALITY_OPTIONS.map((option) => {
                const active = option.value === quality;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setQuality(option.value)}
                    style={[
                      styles.optionChip,
                      { borderColor: colors.border },
                      active && { backgroundColor: colors.accent, borderColor: colors.accent },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Use ${option.label} quality`}
                  >
                    <View style={{ alignItems: "center" }}>
                      <Text style={[styles.optionText, { color: active ? colors.accentFgOn : colors.subtext }]}>
                        {option.label}
                      </Text>
                      <Text style={[styles.optionHelper, { color: active ? colors.accentFgOn : colors.subtext }]}>
                        {option.helper}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable
            onPress={handleGenerate}
            style={[styles.generateButton, { backgroundColor: canGenerate ? colors.accent : colors.border }]}
            disabled={!canGenerate}
            accessibilityRole="button"
            accessibilityLabel="Generate marketing image"
          >
            {pending ? (
              <ActivityIndicator color={colors.accentFgOn} />
            ) : (
              <Text style={[styles.generateButtonText, { color: colors.accentFgOn }]}>Generate image</Text>
            )}
          </Pressable>

          {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}
        </View>
      </View>

      {history.length > 0 ? (
        <View style={{ gap: 16 }}>
          <View style={[styles.historyHeader, { borderColor: colors.border }]}> 
            <Text style={[styles.title, { color: colors.text, flex: 1 }]}>Recent results</Text>
            <Pressable
              onPress={clearHistory}
              style={[styles.clearHistoryButton, { borderColor: colors.border }]}
              accessibilityRole="button"
              accessibilityLabel="Clear generated images"
            >
              <Text style={[styles.clearHistoryText, { color: colors.subtext }]}>Clear</Text>
            </Pressable>
          </View>

          {history.map((entry) => {
            const { response } = entry;
            return (
              <View
                key={entry.id}
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, gap: 12 }]}
              >
                <Text style={[styles.historyMeta, { color: colors.subtext }]}>Prompt:</Text>
                <Text style={[styles.historyPrompt, { color: colors.text }]}>{response.prompt}</Text>
                {response.data.revised_prompt ? (
                  <Text style={[styles.historyRevised, { color: colors.subtext }]}>Revised prompt: {response.data.revised_prompt}</Text>
                ) : null}
                <Image source={{ uri: entry.imageUri }} style={styles.previewImage} resizeMode="contain" />
                <Text style={[styles.historyMeta, { color: colors.subtext }]}>Size: {response.size} • Quality: {response.quality}</Text>
                <Text style={[styles.historyTimestamp, { color: colors.subtext }]}>
                  Generated {new Date(entry.createdAt).toLocaleString()}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    gap: 20,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  banner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  bannerText: {
    fontSize: 13,
    fontWeight: "700",
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  promptInput: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    fontWeight: "500",
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  optionChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  optionText: {
    fontSize: 14,
    fontWeight: "700",
  },
  optionHelper: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  generateButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  generateButtonText: {
    fontSize: 15,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  errorText: {
    fontSize: 13,
    fontWeight: "700",
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  clearHistoryButton: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  clearHistoryText: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  historyMeta: {
    fontSize: 12,
    fontWeight: "700",
  },
  historyPrompt: {
    fontSize: 15,
    fontWeight: "700",
  },
  historyRevised: {
    fontSize: 13,
    fontWeight: "600",
  },
  previewImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  historyTimestamp: {
    fontSize: 12,
    fontWeight: "600",
  },
});
