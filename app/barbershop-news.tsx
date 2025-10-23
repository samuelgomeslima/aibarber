import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";

const NEWS_ITEMS = [
  {
    id: "launch",
    title: "AI consultations go live",
    date: "March 4, 2025",
    summary:
      "We are piloting a guided consultation flow that captures style preferences before the appointment and syncs with the booking assistant.",
  },
  {
    id: "partnership",
    title: "Partnership with Fade Supply Co.",
    date: "February 18, 2025",
    summary:
      "A merchandising partnership that unlocks co-branded drops for barbershops, paired with unified stock tracking in AIBarber.",
  },
  {
    id: "events",
    title: "Regional education tour",
    date: "January 27, 2025",
    summary:
      "Hands-on workshops focused on retention tactics, omnichannel sales, and AI-driven scheduling automations.",
  },
];

const UPCOMING_UPDATES = [
  "Self-serve education hub with regional best practices",
  "Opt-in beta program for experimental AI assistants",
  "Monthly industry pulse digest tailored to your city",
];

export default function BarbershopNews(): React.ReactElement {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Barbershop news</Text>
      <Text style={styles.lead}>
        Track platform announcements and partnerships that impact barbershop owners. These notes
        live alongside the legacy dashboard while we transition to the new navigation.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Latest stories</Text>
        {NEWS_ITEMS.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cardEyebrow}>{item.date}</Text>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardDescription}>{item.summary}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What's next</Text>
        {UPCOMING_UPDATES.map((update) => (
          <View key={update} style={styles.listItem}>
            <View style={styles.bullet} />
            <Text style={styles.listItemText}>{update}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingVertical: 40,
    paddingHorizontal: 32,
    gap: 24,
    backgroundColor: "#0B0F1A",
  },
  header: {
    fontSize: 28,
    fontWeight: "700",
    color: "#F8F9FF",
  },
  lead: {
    fontSize: 16,
    lineHeight: 22,
    color: "#B9C2D8",
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#F1F4FF",
  },
  card: {
    backgroundColor: "#131A2C",
    borderRadius: 16,
    padding: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: "#1F2B47",
  },
  cardEyebrow: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#8593B0",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F8F9FF",
  },
  cardDescription: {
    fontSize: 15,
    lineHeight: 20,
    color: "#A7B4CE",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  bullet: {
    width: 8,
    height: 8,
    marginTop: 8,
    borderRadius: 4,
    backgroundColor: "#5E77FF",
  },
  listItemText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    color: "#A7B4CE",
  },
});
