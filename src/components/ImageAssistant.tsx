import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
} from "react-native";

import {
  generateImage,
  isImageApiConfigured,
  type GenerateImageResponse,
} from "../lib/imageApi";
import { defaultComponentCopy } from "../locales/componentCopy";
import type { ImageAssistantCopy } from "../locales/types";

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
  copy?: ImageAssistantCopy;
};

type HistoryEntry = {
  id: string;
  response: GenerateImageResponse;
  imageUri: string;
  createdAt: number;
};

type ClientPhoto = {
  uri: string;
  name: string;
  sizeKb?: number;
};

function toDataUri(image: GenerateImageResponse["data"]): string {
  if (image.b64_json) {
    return `data:image/png;base64,${image.b64_json}`;
  }
  if (image.url) return image.url;
  throw new Error("The image response did not include any renderable data.");
}

export default function ImageAssistant({
  colors,
  copy = defaultComponentCopy.imageAssistant,
}: ImageAssistantProps) {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<"256x256" | "512x512" | "1024x1024">("1024x1024");
  const [quality, setQuality] = useState<"standard" | "hd">("standard");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [clientPhoto, setClientPhoto] = useState<ClientPhoto | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const sizeOptions = copy.sizeOptions;
  const qualityOptions = copy.qualityOptions;

  const canGenerate = useMemo(() => {
    return Boolean(prompt.trim()) && !pending && isImageApiConfigured;
  }, [prompt, pending]);

  const helperMessage = isImageApiConfigured ? null : copy.helperMessage;

  const handleUploadPress = () => {
    if (Platform.OS === "web") {
      fileInputRef.current?.click();
    }
  };

  const handleRemovePhoto = () => {
    setClientPhoto(null);
    setPhotoError(null);
    if (Platform.OS === "web" && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleWebFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError(copy.upload.invalidType);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (!result) {
        setPhotoError(copy.upload.readError);
        return;
      }

      setClientPhoto({
        uri: result,
        name: file.name,
        sizeKb: Math.round(file.size / 102.4) / 10,
      });
      setPhotoError(null);
    };
    reader.onerror = () => {
      setPhotoError(copy.upload.readError);
    };
    reader.readAsDataURL(file);
  };

  const haircutSuggestion = useMemo(() => {
    if (!clientPhoto) return null;

    const normalizedPrompt = prompt.toLowerCase();
    const { options } = copy.recommendation;

    if (/(female|woman|lady|girl|feminine)/i.test(normalizedPrompt)) {
      return options.feminine;
    }

    if (/(curl|wave|coil|kink|texture|afro)/i.test(normalizedPrompt)) {
      return options.curls;
    }

    if (/(volume|pompadour|quiff|lift|flow|layered)/i.test(normalizedPrompt)) {
      return options.volume;
    }

    if (/(business|professional|corporate|office|executive|formal)/i.test(normalizedPrompt)) {
      return options.corporate;
    }

    return options.default;
  }, [clientPhoto, prompt, copy.recommendation]);

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
      setError(e?.message ?? copy.errors.generateFailed);
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
        <Text style={[styles.title, { color: colors.text }]}>{copy.title}</Text>
        <Text style={[styles.subtitle, { color: colors.subtext }]}>
          {copy.subtitle.before}
          <Text style={{ fontWeight: "700", color: colors.text }}>{copy.subtitle.highlight}</Text>
          {copy.subtitle.after}
        </Text>

        {helperMessage ? (
          <View style={[styles.banner, { borderColor: colors.danger, backgroundColor: "rgba(239,68,68,0.12)" }]}>
            <Text style={[styles.bannerText, { color: colors.danger }]}>{helperMessage}</Text>
          </View>
        ) : null}

        <View style={{ gap: 12 }}>
          <View>
            <Text style={[styles.label, { color: colors.subtext }]}>{copy.upload.label}</Text>
            {Platform.OS === "web" ? (
              <View style={{ gap: 10 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleWebFileChange}
                />
                <Pressable
                  onPress={handleUploadPress}
                  style={[styles.optionChip, { borderColor: colors.border, backgroundColor: colors.bg }]}
                  accessibilityRole="button"
                  accessibilityLabel={copy.upload.accessibility}
                >
                  <Text style={[styles.optionText, { color: colors.text }]}>
                    {clientPhoto ? copy.upload.changeButton : copy.upload.button}
                  </Text>
                </Pressable>
                <Text style={[styles.helperText, { color: colors.subtext }]}>{copy.upload.helper}</Text>
                {clientPhoto ? (
                  <View style={[styles.photoPreview, { borderColor: colors.border, backgroundColor: colors.bg }]}>
                    <Text style={[styles.photoPreviewLabel, { color: colors.subtext }]}>{copy.upload.previewLabel}</Text>
                    <Image
                      source={{ uri: clientPhoto.uri }}
                      style={styles.clientPhoto}
                      resizeMode="cover"
                      accessibilityLabel={copy.upload.previewLabel}
                    />
                    <View style={styles.photoMetaRow}>
                      <Text style={[styles.photoMeta, { color: colors.subtext }]}>
                        {copy.upload.fileNameLabel}: {clientPhoto.name}
                      </Text>
                      <Text style={[styles.photoMeta, { color: colors.subtext }]}>
                        {copy.upload.fileSizeLabel}: {clientPhoto.sizeKb ? `${clientPhoto.sizeKb.toFixed(1)} KB` : copy.upload.unknownSize}
                      </Text>
                    </View>
                    <Pressable
                      onPress={handleRemovePhoto}
                      style={[styles.clearHistoryButton, { borderColor: colors.border }]}
                      accessibilityRole="button"
                      accessibilityLabel={copy.upload.removeAccessibility}
                    >
                      <Text style={[styles.clearHistoryText, { color: colors.subtext }]}>{copy.upload.removeButton}</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ) : (
              <Text style={[styles.helperText, { color: colors.subtext }]}>{copy.upload.unsupported}</Text>
            )}
            {photoError ? <Text style={[styles.errorText, { color: colors.danger }]}>{photoError}</Text> : null}
          </View>

          <View>
            <Text style={[styles.label, { color: colors.subtext }]}>{copy.promptLabel}</Text>
            <TextInput
              multiline
              value={prompt}
              onChangeText={setPrompt}
              placeholder={copy.promptPlaceholder}
              placeholderTextColor={"rgba(255,255,255,0.4)"}
              style={[styles.promptInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
            />
          </View>

          <View>
            <Text style={[styles.label, { color: colors.subtext }]}>{copy.sizeLabel}</Text>
            <View style={styles.optionRow}>
              {sizeOptions.map((option) => {
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
                    accessibilityLabel={copy.optionAccessibility.size(option.label)}
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
            <Text style={[styles.label, { color: colors.subtext }]}>{copy.qualityLabel}</Text>
            <View style={styles.optionRow}>
              {qualityOptions.map((option) => {
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
                    accessibilityLabel={copy.optionAccessibility.quality(option.label)}
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
            accessibilityLabel={copy.generateAccessibility}
          >
            {pending ? (
              <ActivityIndicator color={colors.accentFgOn} />
            ) : (
              <Text style={[styles.generateButtonText, { color: colors.accentFgOn }]}>{copy.generateButton}</Text>
            )}
          </Pressable>

          {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}
        </View>
      </View>

      {history.length > 0 ? (
        <View style={{ gap: 16 }}>
          <View style={[styles.historyHeader, { borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text, flex: 1 }]}>{copy.history.title}</Text>
            <Pressable
              onPress={clearHistory}
              style={[styles.clearHistoryButton, { borderColor: colors.border }]}
              accessibilityRole="button"
              accessibilityLabel={copy.history.clearAccessibility}
            >
              <Text style={[styles.clearHistoryText, { color: colors.subtext }]}>{copy.history.clearLabel}</Text>
            </Pressable>
          </View>

          {history.map((entry) => {
            const { response } = entry;
            return (
              <View
                key={entry.id}
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, gap: 12 }]}
              >
                <Text style={[styles.historyMeta, { color: colors.subtext }]}>{copy.history.promptLabel}</Text>
                <Text style={[styles.historyPrompt, { color: colors.text }]}>{response.prompt}</Text>
                {response.data.revised_prompt ? (
                  <Text style={[styles.historyRevised, { color: colors.subtext }]}>
                    {copy.history.revisedPrefix} {response.data.revised_prompt}
                  </Text>
                ) : null}
                <Image source={{ uri: entry.imageUri }} style={styles.previewImage} resizeMode="contain" />
                <Text style={[styles.historyMeta, { color: colors.subtext }]}>
                  {copy.history.meta(response.size, response.quality)}
                </Text>
                <Text style={[styles.historyTimestamp, { color: colors.subtext }]}>
                  {copy.history.generatedAt(
                    new Date(entry.createdAt).toLocaleString(undefined, {
                      dateStyle: "short",
                      timeStyle: "short",
                    }),
                  )}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>{copy.recommendation.title}</Text>
        <Text style={[styles.helperText, { color: colors.subtext }]}>{copy.recommendation.helper}</Text>
        {clientPhoto && haircutSuggestion ? (
          <View style={{ gap: 12 }}>
            <Text style={[styles.suggestionTitle, { color: colors.text }]}>{haircutSuggestion.style}</Text>
            <Text style={[styles.suggestionDescription, { color: colors.subtext }]}>
              {haircutSuggestion.description}
            </Text>
            <View style={{ gap: 6 }}>
              <Text style={[styles.sectionSubtitle, { color: colors.text }]}>{copy.recommendation.maintenanceTitle}</Text>
              {haircutSuggestion.maintenance.map((tip, index) => (
                <View key={`${haircutSuggestion.style}-maintenance-${index}`} style={styles.bulletRow}>
                  <Text style={[styles.bulletSymbol, { color: colors.accent }]}>•</Text>
                  <Text style={[styles.bulletText, { color: colors.text }]}>{tip}</Text>
                </View>
              ))}
            </View>
            <View style={{ gap: 6 }}>
              <Text style={[styles.sectionSubtitle, { color: colors.text }]}>{copy.recommendation.finishTitle}</Text>
              <Text style={[styles.bulletText, { color: colors.text }]}>{haircutSuggestion.finish}</Text>
            </View>
          </View>
        ) : (
          <Text style={[styles.helperText, { color: colors.subtext }]}>{copy.recommendation.empty}</Text>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>{copy.guidelines.title}</Text>
        <Text style={[styles.helperText, { color: colors.subtext }]}>{copy.guidelines.intro}</Text>
        <View style={{ gap: 6 }}>
          {copy.guidelines.items.map((item, index) => (
            <View key={`guideline-${index}`} style={styles.bulletRow}>
              <Text style={[styles.bulletSymbol, { color: colors.accent }]}>•</Text>
              <Text style={[styles.bulletText, { color: colors.text }]}>{item}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>{copy.model.title}</Text>
        <Text style={[styles.modelName, { color: colors.text }]}>{copy.model.name}</Text>
        <Text style={[styles.helperText, { color: colors.subtext }]}>{copy.model.description}</Text>
      </View>
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
  helperText: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  promptInput: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
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
  photoPreview: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  photoPreviewLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  clientPhoto: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  photoMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  photoMeta: {
    fontSize: 12,
    fontWeight: "600",
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
  suggestionTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  suggestionDescription: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  bulletRow: {
    flexDirection: "row",
    gap: 8,
  },
  bulletSymbol: {
    fontSize: 18,
    lineHeight: 20,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  modelName: {
    fontSize: 16,
    fontWeight: "800",
  },
});
