import { useState } from "react";
import { View, Text, TextInput, Pressable, Modal, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { FlaskConical, X } from "lucide-react-native";

interface NewCookSheetProps {
  visible: boolean;
  onDismiss: () => void;
  onSubmit: (description: string, targetTime: string) => void;
}

export function NewCookSheet({ visible, onDismiss, onSubmit }: NewCookSheetProps) {
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000)); // tomorrow
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleSubmit = () => {
    if (!description.trim()) return;
    onSubmit(description.trim(), targetDate.toISOString());
    setDescription("");
    setTargetDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

  const formatTime = (date: Date) =>
    date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }} onPress={onDismiss} />
      <View
        style={{
          backgroundColor: "#1a1a2e",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: 24,
          paddingBottom: Platform.OS === "ios" ? 48 : 24,
        }}
      >
        {/* Handle bar */}
        <View
          style={{
            width: 40,
            height: 4,
            backgroundColor: "#555",
            borderRadius: 2,
            alignSelf: "center",
            marginBottom: 20,
          }}
        />

        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <FlaskConical size={20} color="#c9a0dc" />
            <Text style={{ fontSize: 18, fontWeight: "bold", color: "#c9a0dc" }}>
              New Experiment
            </Text>
          </View>
          <Pressable onPress={onDismiss} hitSlop={8}>
            <X size={20} color="#888" />
          </Pressable>
        </View>

        {/* Description */}
        <Text
          style={{
            fontSize: 11,
            color: "#888",
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 6,
          }}
        >
          What are we cooking?
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder='e.g., "Neapolitan pizza dough for a party"'
          placeholderTextColor="#555"
          multiline
          style={{
            backgroundColor: "#2a2a3a",
            borderWidth: 1,
            borderColor: "#444",
            borderRadius: 10,
            padding: 14,
            color: "#fff",
            fontSize: 15,
            minHeight: 70,
            marginBottom: 16,
            textAlignVertical: "top",
          }}
        />

        {/* Date & Time */}
        <Text
          style={{
            fontSize: 11,
            color: "#888",
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 6,
          }}
        >
          When do you want to eat?
        </Text>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={{
              flex: 1,
              backgroundColor: "#2a2a3a",
              borderWidth: 1,
              borderColor: "#444",
              borderRadius: 10,
              padding: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 14 }}>📅 {formatDate(targetDate)}</Text>
          </Pressable>
          <Pressable
            onPress={() => setShowTimePicker(true)}
            style={{
              flex: 1,
              backgroundColor: "#2a2a3a",
              borderWidth: 1,
              borderColor: "#444",
              borderRadius: 10,
              padding: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 14 }}>🕐 {formatTime(targetDate)}</Text>
          </Pressable>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={targetDate}
            mode="date"
            display="spinner"
            minimumDate={new Date()}
            onChange={(_, date) => {
              setShowDatePicker(false);
              if (date) {
                const updated = new Date(targetDate);
                updated.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                setTargetDate(updated);
              }
            }}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={targetDate}
            mode="time"
            display="spinner"
            onChange={(_, date) => {
              setShowTimePicker(false);
              if (date) {
                const updated = new Date(targetDate);
                updated.setHours(date.getHours(), date.getMinutes());
                setTargetDate(updated);
              }
            }}
          />
        )}

        {/* Submit */}
        <Pressable
          onPress={handleSubmit}
          disabled={!description.trim()}
          style={{
            backgroundColor: description.trim() ? "#6b3fa0" : "#333",
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>Start Cooking 🔬</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
