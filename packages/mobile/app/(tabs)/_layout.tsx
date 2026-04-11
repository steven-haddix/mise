import { View, StyleSheet, Platform } from "react-native";
import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { MessageCircle, ChefHat, User } from "lucide-react-native";

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
    backgroundColor: "rgba(10, 10, 10, 0.8)",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
});

export default function TabsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "transparent",
            borderTopWidth: 0,
            elevation: 0,
            position: "absolute",
          },
          tabBarBackground: () => <TabBarBackground />,
          tabBarActiveTintColor: "#c9a0dc",
          tabBarInactiveTintColor: "rgba(255,255,255,0.45)",
        }}
      >
        <Tabs.Screen
          name="(chat)"
          options={{
            title: "Chat",
            tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="(cooks)"
          options={{
            title: "Cooks",
            tabBarIcon: ({ color, size }) => <ChefHat size={size} color={color} />,
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
