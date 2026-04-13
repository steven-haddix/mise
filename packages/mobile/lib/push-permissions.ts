import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Linking } from "react-native";
import { registerPushToken } from "./api";

export type PermissionState = "granted" | "denied" | "undetermined";

export async function getPermissionState(): Promise<PermissionState> {
  const { status } = await Notifications.getPermissionsAsync();
  if (status === "granted") return "granted";
  if (status === "denied") return "denied";
  return "undetermined";
}

export async function requestPermissionAndRegister(): Promise<PermissionState> {
  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== "granted") return status === "denied" ? "denied" : "undetermined";

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    if (tokenData?.data) {
      const deviceId = Constants.sessionId ?? "unknown-device";
      await registerPushToken(tokenData.data, deviceId);
    }
  } catch (err) {
    console.warn("[push] failed to get/register token:", err);
  }
  return "granted";
}

export function openSettings(): Promise<void> {
  return Linking.openSettings();
}
