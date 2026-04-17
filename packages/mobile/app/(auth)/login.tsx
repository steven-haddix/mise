import { View, Text } from "react-native";
import { Button } from "heroui-native";
import { authClient } from "../../lib/auth";
import { Screen, Eyebrow, Display } from "../../components/ui";

export default function LoginScreen() {
  const handleGoogleLogin = async () => {
    await authClient.signIn.social({ provider: "google", callbackURL: "/" });
  };

  return (
    <Screen>
      <View className="flex-1 px-8">
        <View className="pt-14 pl-2">
          <Text
            className="text-foreground text-[40px]"
            style={{ fontFamily: "Newsreader_600SemiBold" }}
          >
            mise.
          </Text>
        </View>

        <View className="flex-1 items-center justify-center">
          <Eyebrow>WELCOME</Eyebrow>
          <Display size="md" italic className="mt-2 text-center">
            Good to meet you.
          </Display>
          <Text
            className="text-[#6B635A] text-[14px] text-center mt-4 max-w-[280px]"
            style={{ fontFamily: "Geist_400Regular" }}
          >
            Your AI kitchen chemist. Every cook, perfectly timed.
          </Text>
        </View>

        <View className="pb-12">
          <Button
            variant="primary"
            onPress={handleGoogleLogin}
            className="w-full rounded-xl h-12 bg-primary"
          >
            <Button.Label className="text-[#F4EDE1] font-semibold">
              Continue with Google
            </Button.Label>
          </Button>
        </View>
      </View>
    </Screen>
  );
}
