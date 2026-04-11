import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LogOut } from "lucide-react-native";
import { authClient } from "../../../lib/auth";

export default function ProfileScreen() {
  const { data: session } = authClient.useSession();

  const handleSignOut = async () => {
    await authClient.signOut();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0a0a0a" }} edges={["top"]}>
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: "bold", color: "#c9a0dc" }}>Profile</Text>
      </View>

      <View style={{ padding: 16, gap: 24 }}>
        {/* User info */}
        <View
          style={{
            backgroundColor: "#1a1a2a",
            borderRadius: 12,
            padding: 16,
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "600", color: "#fff" }}>
            {session?.user?.name || "User"}
          </Text>
          <Text style={{ fontSize: 14, color: "#888" }}>{session?.user?.email}</Text>
        </View>

        {/* About */}
        <View
          style={{
            backgroundColor: "#1a1a2a",
            borderRadius: 12,
            padding: 16,
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#fff" }}>About Mise</Text>
          <Text style={{ fontSize: 13, color: "#888", lineHeight: 20 }}>
            Your AI kitchen chemist. Tell me what you want to cook and when you want to eat it —
            I'll handle the timing. Every cook is an experiment, and every experiment needs precision.
          </Text>
          <Text style={{ fontSize: 12, color: "#555", marginTop: 4 }}>v1.0.0</Text>
        </View>

        {/* Sign out */}
        <Pressable
          onPress={handleSignOut}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            backgroundColor: "#2a1a1a",
            paddingVertical: 14,
            borderRadius: 12,
          }}
        >
          <LogOut size={18} color="#ef4444" />
          <Text style={{ color: "#ef4444", fontWeight: "600" }}>Sign Out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
