import { View, Text } from "react-native";
import { Button } from "heroui-native";
import { authClient } from "../../lib/auth";
import { Screen } from "../../components/ui";

export default function LoginScreen() {
  const handleGoogleLogin = async () => {
    await authClient.signIn.social({ provider: "google", callbackURL: "/" });
  };

  return (
    <Screen>
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-primary text-5xl font-bold mb-2">Mise</Text>
        <Text className="text-muted-foreground text-base text-center mb-12">
          Your AI kitchen chemist.{"\n"}Every cook, perfectly timed.
        </Text>

        <Button variant="secondary" onPress={handleGoogleLogin} className="w-full">
          <Button.Label>Continue with Google</Button.Label>
        </Button>
      </View>
    </Screen>
  );
}
