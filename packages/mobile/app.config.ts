import { ExpoConfig, ConfigContext } from "expo/config";

const APP_VARIANT = process.env.APP_VARIANT ?? "local";
const IS_PROD = APP_VARIANT === "production";

const getUniqueId = () => {
  if (IS_PROD) return "app.mise.mobile";
  if (APP_VARIANT === "development") return "app.mise.mobile.dev";
  return "app.mise.mobile.local";
};

const getAppName = () => {
  if (IS_PROD) return "Mise";
  if (APP_VARIANT === "development") return "Mise (Dev)";
  return "Mise (Local)";
};

const getScheme = () => {
  if (IS_PROD) return "mise";
  if (APP_VARIANT === "development") return "mise-dev";
  return "mise-local";
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: getAppName(),
  slug: "mise",
  version: "1.0.0",
  scheme: getScheme(),
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "dark",
  // Native config hex values mirror global.css tokens (--color-background, --color-primary).
  // Keep in sync with components/ui/tokens.ts when theme changes.
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#0a0a0a",
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: getUniqueId(),
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: getUniqueId(),
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#0a0a0a",
    },
  },
  plugins: [
    "expo-router",
    [
      "expo-notifications",
      {
        icon: "./assets/icon.png",
        color: "#c9a0dc",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {},
  },
});
