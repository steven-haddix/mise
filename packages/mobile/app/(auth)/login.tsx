import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { authClient } from "../../lib/auth";

export default function LoginScreen() {
  const handleGoogleLogin = async () => {
    await authClient.signIn.social({ provider: "google", callbackURL: "/" });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 32,
        }}
      >
        <Text style={{ fontSize: 48, color: "#c9a0dc", fontWeight: "bold", marginBottom: 8 }}>
          Mise
        </Text>
        <Text style={{ fontSize: 16, color: "#888", textAlign: "center", marginBottom: 48 }}>
          Your AI kitchen chemist.{"\n"}Every cook, perfectly timed.
        </Text>

        <Pressable
          onPress={handleGoogleLogin}
          style={{
            backgroundColor: "#ffffff",
            paddingVertical: 14,
            paddingHorizontal: 32,
            borderRadius: 12,
            width: "100%",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#000", fontSize: 16, fontWeight: "600" }}>
            Continue with Google
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
