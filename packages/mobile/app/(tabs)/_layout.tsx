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
    <BlurView intensity={80} tint="systemChromeMaterialDark" style={StyleSheet.absoluteFill} />
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
          },
          tabBarBackground: () => <TabBarBackground />,
          tabBarActiveTintColor: tokens.primary,
          tabBarInactiveTintColor: tokens.mutedForeground,
        }}
      >
        <Tabs.Screen
          name="(cooks)"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => <ChefHat size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="(chat)"
          options={{
            title: "Chat",
            tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="(profile)"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
          }}
        />
      </Tabs>
    </View>
  );
}
