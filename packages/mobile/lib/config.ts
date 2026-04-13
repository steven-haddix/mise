import Constants from "expo-constants";

function trimTrailingSlash(url: string) {
  return url.replace(/\/+$/, "");
}

function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return trimTrailingSlash(process.env.EXPO_PUBLIC_API_URL);
  }

  const metroHost = Constants.expoConfig?.hostUri?.split(":")[0];
  if (metroHost) {
    return `http://${metroHost}:8090`;
  }

  return "http://localhost:8090";
}

export const API_BASE_URL = getApiBaseUrl();
