import { View, StyleSheet, Platform } from "react-native";
import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { MessageCircle, ChefHat, User } from "lucide-react-native";
import { tokens } from "../../components/ui/tokens";

function TabBarBackground() {
  if (Platform.OS === "android") {
    return (
      <View style={[StyleSheet.absoluteFill, styles.androidTabBarBg]}>
        <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
      </View>
    );
  }

  return (
    <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
  );
}

const styles = StyleSheet.create({
  androidTabBarBg: {
    backgroundColor: tokens.tabBarBackgroundAndroid,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: tokens.hairlineBorder,
  },
});

export default function TabsLayout() {
  return (
    <View className="flex-1">
      <Tabs
        initialRouteName="(cooks)"
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "transparent",
            borderTopWidth: 0,
            elevation: 0,
            position: "absolute",
            height: Platform.OS === "ios" ? 88 : 64,
          },
          tabBarBackground: () => <TabBarBackground />,
          tabBarActiveTintColor: tokens.primary,
          tabBarInactiveTintColor: tokens.mutedForeground,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "bold",
            marginTop: -4,
            marginBottom: Platform.OS === "ios" ? 0 : 4,
          },
        }}
      >
        <Tabs.Screen
          name="(cooks)"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => <ChefHat size={size - 2} color={color} strokeWidth={2.5} />,
          }}
        />
        <Tabs.Screen
          name="(chat)"
          options={{
            title: "Chat",
            tabBarIcon: ({ color, size }) => <MessageCircle size={size - 2} color={color} strokeWidth={2.5} />,
          }}
        />
        <Tabs.Screen
          name="(profile)"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => <User size={size - 2} color={color} strokeWidth={2.5} />,
          }}
        />
      </Tabs>
    </View>
  );
}
