import { useEffect, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import type { Tables } from "../types/database";
import { getSupabaseClient } from "../lib/supabase";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  userId?: number;
};

type Customer = Tables<"customers">;

type CustomerForm = Pick<
  Customer,
  "first_name" | "last_name" | "email" | "phone" | "notes"
>;

const emptyForm: CustomerForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  notes: "",
};

export function UserForm({ visible, onClose, onSave, userId }: Props) {
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setForm(emptyForm);
      return;
    }

    if (!userId) {
      setForm(emptyForm);
      return;
    }

    let isMounted = true;

    (async () => {
      try {
        setLoading(true);
        const supabase = await getSupabaseClient();
        const { data, error } = await supabase
          .from("customers")
          .select("id, first_name, last_name, email, phone, notes")
          .eq("id", userId)
          .single();

        if (error) {
          throw error;
        }

        if (data && isMounted) {
          setForm({
            first_name: data.first_name ?? "",
            last_name: data.last_name ?? "",
            email: data.email ?? "",
            phone: data.phone ?? "",
            notes: data.notes ?? "",
          });
        }
      } catch (error) {
        console.error("Failed to load customer", error);
        Alert.alert("Error", "Failed to load the customer. Please try again.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [visible, userId]);

  const handleSave = async () => {
    try {
      setLoading(true);
      const supabase = await getSupabaseClient();

      if (userId) {
        const { error } = await supabase
          .from("customers")
          .update(form)
          .eq("id", userId);

        if (error) {
          throw error;
        }
      } else {
        const { error } = await supabase.from("customers").insert(form);

        if (error) {
          throw error;
        }
      }

      Alert.alert("Success", `Customer ${userId ? "updated" : "created"} successfully.`);
      onSave();
      onClose();
    } catch (error) {
      console.error("Failed to save customer", error);
      Alert.alert("Error", "Failed to save the customer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal animationType="slide" transparent={false} visible={visible} onRequestClose={onClose}>
      <View style={styles.container}>
        <Text style={styles.heading}>{userId ? "Edit Customer" : "New Customer"}</Text>

        <TextInput
          style={styles.input}
          value={form.first_name}
          onChangeText={(text) => setForm((prev) => ({ ...prev, first_name: text }))}
          placeholder="First Name"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          value={form.last_name}
          onChangeText={(text) => setForm((prev) => ({ ...prev, last_name: text }))}
          placeholder="Last Name"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          value={form.email}
          onChangeText={(text) => setForm((prev) => ({ ...prev, email: text }))}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          value={form.phone}
          onChangeText={(text) => setForm((prev) => ({ ...prev, phone: text }))}
          placeholder="Phone"
          keyboardType="phone-pad"
          editable={!loading}
        />

        <TextInput
          style={[styles.input, styles.notes]}
          value={form.notes}
          onChangeText={(text) => setForm((prev) => ({ ...prev, notes: text }))}
          placeholder="Notes"
          multiline
          numberOfLines={3}
          editable={!loading}
        />

        <View style={styles.buttonRow}>
          <Pressable style={[styles.button, styles.cancelButton]} onPress={onClose} disabled={loading}>
            <Text style={styles.buttonText}>Cancel</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.saveButton]} onPress={handleSave} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? "Saving..." : "Save"}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  heading: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
  },
  notes: {
    height: 100,
    textAlignVertical: "top",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: "#ccc",
  },
  saveButton: {
    backgroundColor: "#4CAF50",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
