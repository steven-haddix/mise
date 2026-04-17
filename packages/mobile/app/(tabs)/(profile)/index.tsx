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
import { Screen, AppHeader, ListRow, Display, Eyebrow, tokens } from "../../../components/ui";

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
      <AppHeader eyebrow="SETTINGS" title="Profile" italic />

      <View className="p-6 gap-5">
        <Card className="rounded-2xl border border-[#E4DBC9] bg-card">
          <Card.Body className="p-5">
            <Display size="sm" italic>
              {session?.user?.name || "User"}
            </Display>
            <Text
              className="text-[#6B635A] text-[13px] mt-1"
              style={{ fontFamily: "Geist_400Regular" }}
            >
              {session?.user?.email}
            </Text>
          </Card.Body>
        </Card>

        <View>
          <Eyebrow color="ink-tertiary">NOTIFICATIONS</Eyebrow>
          <View className="mt-2">
            <ListRow
              icon={<Bell size={18} color={tokens.accent} strokeWidth={2} />}
              title="Step reminders"
              value={notifValue}
              onPress={handleNotificationsTap}
            />
          </View>
        </View>

        <Card className="rounded-2xl border border-[#E4DBC9] bg-card">
          <Card.Body className="p-5">
            <Eyebrow color="ink-tertiary">ABOUT</Eyebrow>
            <Text
              className="text-foreground text-[14px] mt-3 leading-5"
              style={{ fontFamily: "Geist_400Regular" }}
            >
              Your warm cooking companion. Tell Mise what you want to cook and when — we'll build
              the timing plan.
            </Text>
            <Text
              className="text-[#9E9488] text-[11px] mt-3"
              style={{ fontFamily: "IBMPlexMono_400Regular" }}
            >
              v1.0.0
            </Text>
          </Card.Body>
        </Card>

        <ListRow
          icon={<LogOut size={18} color={tokens.danger} strokeWidth={2} />}
          title="Sign out"
          destructive
          onPress={handleSignOut}
        />
      </View>
    </Screen>
  );
}
