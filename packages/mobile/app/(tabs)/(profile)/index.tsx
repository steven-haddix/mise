import { useCallback, useEffect, useState } from "react";
import { View, Text, Linking } from "react-native";
import { Card } from "heroui-native";
import { LogOut, Bell } from "lucide-react-native";
import { authClient } from "../../../lib/auth";
import {
  getPermissionState,
  requestPermissionAndRegister,
  type PermissionState,
} from "../../../lib/push-permissions";
import { Screen, AppHeader, ListRow, tokens } from "../../../components/ui";

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
  };

  const notifValue = permission === "granted" ? "On" : permission === "denied" ? "Off" : "Not set";

  return (
    <Screen edges={["top"]}>
      <AppHeader title="Profile" />

      <View className="p-4 gap-6">
        <Card>
          <Card.Body>
            <Text className="text-foreground text-lg font-semibold">
              {session?.user?.name || "User"}
            </Text>
            <Text className="text-muted-foreground text-sm mt-1">{session?.user?.email}</Text>
          </Card.Body>
        </Card>

        <ListRow
          icon={<Bell size={18} color={tokens.primary} />}
          title="Step reminders"
          value={notifValue}
          onPress={handleNotificationsTap}
        />

        <Card>
          <Card.Body>
            <Text className="text-foreground text-base font-semibold">About Mise</Text>
            <Text className="text-muted-foreground text-sm mt-2 leading-5">
              Your warm cooking companion. Tell Mise what you want to cook and when — we'll build
              the timing plan.
            </Text>
            <Text className="text-muted-foreground text-xs mt-2 opacity-60">v1.0.0</Text>
          </Card.Body>
        </Card>

        <ListRow
          icon={<LogOut size={18} color={tokens.danger} />}
          title="Sign Out"
          destructive
          onPress={handleSignOut}
        />
      </View>
    </Screen>
  );
}
