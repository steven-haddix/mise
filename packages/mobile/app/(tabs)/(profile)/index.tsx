import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LogOut, Bell } from "lucide-react-native";
import { authClient } from "../../../lib/auth";
import {
  getPermissionState,
  requestPermissionAndRegister,
  type PermissionState,
} from "../../../lib/push-permissions";

export default function ProfileScreen() {
  const { data: session } = authClient.useSession();
  const [permission, setPermission] = useState<PermissionState>("undetermined");

  const refresh = useCallback(async () => {
    setPermission(await getPermissionState());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSignOut = async () => {
    await authClient.signOut();
  };

  const handleNotificationsTap = async () => {
    if (permission === "undetermined") {
      const next = await requestPermissionAndRegister();
      setPermission(next);
      return;
    }
    if (permission === "denied") {
      Linking.openSettings();
      return;
    }
    // granted — no-op for v1
  };

  const notifValue =
    permission === "granted" ? "On" : permission === "denied" ? "Off" : "Not set";

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

        {/* Notifications */}
        <Pressable
          onPress={handleNotificationsTap}
          style={{
            backgroundColor: "#1a1a2a",
            borderRadius: 12,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Bell size={18} color="#c9a0dc" />
            <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>Step reminders</Text>
          </View>
          <Text style={{ color: "#888", fontSize: 14 }}>{notifValue}</Text>
        </Pressable>

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
            Your warm cooking companion. Tell Mise what you want to cook and when — we'll build the timing plan.
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
