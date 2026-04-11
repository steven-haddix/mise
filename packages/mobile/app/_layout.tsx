import { ActivityIndicator, View } from "react-native";
import "../global.css";
import { Stack, Redirect } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ScopedTheme } from "uniwind";
import { HeroUINativeProvider } from "heroui-native/provider";
import { authClient } from "../lib/auth";

export default function RootLayout() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0a0a0a",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color="#c9a0dc" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#0a0a0a" }}>
      <ScopedTheme theme="dark">
        <HeroUINativeProvider>
          <SafeAreaProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: "#0a0a0a" },
              }}
            >
              {session ? <Stack.Screen name="(tabs)" /> : <Stack.Screen name="(auth)" />}
            </Stack>
            {!session && <Redirect href="/(auth)/login" />}
          </SafeAreaProvider>
        </HeroUINativeProvider>
      </ScopedTheme>
    </GestureHandlerRootView>
  );
}
