import { View } from "react-native";
import "../global.css";
import { Stack, Redirect } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ScopedTheme } from "uniwind";
import { HeroUINativeProvider } from "heroui-native/provider";
import { Spinner } from "heroui-native";
import { authClient } from "../lib/auth";
import { tokens } from "../components/ui/tokens";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: tokens.background }}>
      <SafeAreaProvider>
        <ScopedTheme theme="dark">
          <HeroUINativeProvider>
            <SessionGate />
          </HeroUINativeProvider>
        </ScopedTheme>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function SessionGate() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <Spinner color={tokens.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: tokens.background },
        }}
      >
        {session ? (
          <Stack.Screen name="(tabs)" />
        ) : (
          <Stack.Screen name="(auth)" />
        )}
      </Stack>
      {!session && <Redirect href="/(auth)/login" />}
    </>
  );
}
