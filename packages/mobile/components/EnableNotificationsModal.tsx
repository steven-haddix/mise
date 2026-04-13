import { Modal, View, Text, Pressable } from "react-native";

interface Props {
  visible: boolean;
  onEnable: () => void;
  onDismiss: () => void;
}

export function EnableNotificationsModal({ visible, onEnable, onDismiss }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.65)",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <View
          style={{
            backgroundColor: "#1a1a2a",
            borderRadius: 18,
            padding: 22,
            width: "100%",
            maxWidth: 340,
            gap: 10,
          }}
        >
          <Text style={{ fontSize: 40, textAlign: "center", marginBottom: 4 }}>🔔</Text>
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", textAlign: "center" }}>
            Want reminders for each step?
          </Text>
          <Text style={{ color: "#aaa", fontSize: 14, textAlign: "center", lineHeight: 20 }}>
            Mise can ping you when it's time for the next step in your cook.
          </Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <Pressable
              onPress={onDismiss}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 10,
                backgroundColor: "#2a2a3a",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#aaa", fontWeight: "600" }}>Not now</Text>
            </Pressable>
            <Pressable
              onPress={onEnable}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 10,
                backgroundColor: "#c9a0dc",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#0a0a0a", fontWeight: "700" }}>Enable</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
