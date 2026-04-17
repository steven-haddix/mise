import { View, ActivityIndicator } from "react-native";
import "../global.css";
import { Stack, Redirect } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ScopedTheme } from "uniwind";
import { HeroUINativeProvider } from "heroui-native/provider";
import { Spinner } from "heroui-native";
import {
  useFonts as useNewsreader,
  Newsreader_400Regular,
  Newsreader_500Medium,
  Newsreader_600SemiBold,
  Newsreader_400Regular_Italic,
  Newsreader_600SemiBold_Italic,
} from "@expo-google-fonts/newsreader";
import { Geist_400Regular, Geist_500Medium, Geist_700Bold } from "@expo-google-fonts/geist";
import { IBMPlexMono_400Regular, IBMPlexMono_500Medium } from "@expo-google-fonts/ibm-plex-mono";
import { authClient } from "../lib/auth";
import { tokens } from "../components/ui/tokens";

export default function RootLayout() {
  const [fontsLoaded] = useNewsreader({
    Newsreader_400Regular,
    Newsreader_500Medium,
    Newsreader_600SemiBold,
    Newsreader_400Regular_Italic,
    Newsreader_600SemiBold_Italic,
    Geist_400Regular,
    Geist_500Medium,
    Geist_700Bold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
  });

  if (!fontsLoaded) {
    // Render a provider-free splash — heroui-native's Spinner depends on
    // HeroUINativeProvider (Reanimated context), which isn't mounted yet.
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: tokens.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={tokens.accent} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: tokens.background }}>
      <SafeAreaProvider>
        <ScopedTheme theme="light">
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
        <Spinner color={tokens.accent} />
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
        {session ? <Stack.Screen name="(tabs)" /> : <Stack.Screen name="(auth)" />}
      </Stack>
      {!session && <Redirect href="/(auth)/login" />}
    </>
  );
}
