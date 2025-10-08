import React, { useMemo, useState } from "react";
import {
  View,
  TextInput,
  Pressable,
  Modal,
  Text,
  StyleSheet,
  Platform,
  StyleProp,
  TextStyle,
  ViewStyle,
  TextInputProps,
} from "react-native";
import DateTimePicker, {
  AndroidNativeProps,
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type ColorScheme = {
  text: string;
  subtext: string;
  border: string;
  surface: string;
  accent: string;
  accentFgOn: string;
  bg?: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  placeholderTextColor?: string;
  mode: "date" | "time";
  colors: ColorScheme;
  accessibilityLabel?: string;
  inputStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  textInputProps?: Omit<TextInputProps, "value" | "onChangeText" | "placeholder" | "style">;
  confirmLabel: string;
  cancelLabel: string;
};

type NativeMode = AndroidNativeProps["mode"];

const pad = (n: number) => n.toString().padStart(2, "0");

const parseDateValue = (raw: string | undefined | null): Date => {
  if (!raw) {
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    return now;
  }
  const [year, month, day] = raw.split("-").map((part) => Number(part));
  if (
    Number.isFinite(year) &&
    Number.isFinite(month) &&
    Number.isFinite(day) &&
    year >= 1970 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= 31
  ) {
    const parsed = new Date();
    parsed.setFullYear(year, month - 1, day);
    parsed.setHours(12, 0, 0, 0);
    return parsed;
  }
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  return now;
};

const parseTimeValue = (raw: string | undefined | null): Date => {
  const base = new Date();
  base.setSeconds(0, 0);
  if (!raw) {
    return base;
  }
  const [hours, minutes] = raw.split(":").map((part) => Number(part));
  if (
    Number.isFinite(hours) &&
    Number.isFinite(minutes) &&
    hours >= 0 &&
    hours <= 23 &&
    minutes >= 0 &&
    minutes <= 59
  ) {
    base.setHours(hours, minutes, 0, 0);
    return base;
  }
  return base;
};

const formatDateValue = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const formatTimeValue = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

export default function DateTimeInput({
  value,
  onChange,
  placeholder,
  placeholderTextColor,
  mode,
  colors,
  accessibilityLabel,
  inputStyle,
  containerStyle,
  textInputProps,
  confirmLabel,
  cancelLabel,
}: Props) {
  const [pickerVisible, setPickerVisible] = useState(false);
  const [tempValue, setTempValue] = useState<Date>(() =>
    mode === "date" ? parseDateValue(value) : parseTimeValue(value),
  );

  const iconName = mode === "date" ? "calendar" : "clock-time-four-outline";

  const initialDate = useMemo(() => {
    return mode === "date" ? parseDateValue(value) : parseTimeValue(value);
  }, [mode, value]);

  const openPicker = () => {
    setTempValue(initialDate);
    setPickerVisible(true);
  };

  const closePicker = () => {
    setPickerVisible(false);
  };

  const handlePickerChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (selected) {
      setTempValue(selected);
      if (Platform.OS === "android") {
        const formatted = mode === "date" ? formatDateValue(selected) : formatTimeValue(selected);
        onChange(formatted);
        setPickerVisible(false);
      }
    }
  };

  const applyPickerValue = () => {
    const formatted = mode === "date" ? formatDateValue(tempValue) : formatTimeValue(tempValue);
    onChange(formatted);
    setPickerVisible(false);
  };

  return (
    <View style={containerStyle}>
      <View style={styles.inputWrapper}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor}
          style={[styles.input, inputStyle]}
          {...textInputProps}
        />
        <Pressable
          onPress={openPicker}
          style={[styles.iconButton, { borderLeftColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? placeholder ?? "Open picker"}
        >
          <MaterialCommunityIcons name={iconName} size={18} color={colors.subtext} />
        </Pressable>
      </View>
      {pickerVisible ? (
        <Modal transparent animationType="fade" onRequestClose={closePicker}>
          <Pressable style={styles.modalBackdrop} onPress={closePicker}>
            <View />
          </Pressable>
          <View style={styles.modalContainer}>
            <View
              style={[
                styles.modalContent,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <DateTimePicker
                value={tempValue}
                mode={mode as NativeMode}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handlePickerChange}
                style={styles.picker}
              />
              {Platform.OS === "ios" ? (
                <View style={styles.modalActions}>
                  <Pressable
                    onPress={closePicker}
                    style={[styles.modalButton, { borderColor: colors.border }]}
                  >
                    <Text style={[styles.modalButtonText, { color: colors.subtext }]}>
                      {cancelLabel}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={applyPickerValue}
                    style={[styles.modalButton, { borderColor: colors.accent, backgroundColor: colors.accent }]}
                  >
                    <Text style={[styles.modalButtonText, { color: colors.accentFgOn }]}>
                      {confirmLabel}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  inputWrapper: {
    position: "relative",
  },
  input: {
    width: "100%",
    paddingRight: 44,
  },
  iconButton: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
    borderLeftWidth: 1,
    backgroundColor: "transparent",
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 16,
    width: "100%",
    maxWidth: 360,
  },
  picker: {
    alignSelf: "stretch",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  modalButtonText: {
    fontWeight: "700",
  },
});
