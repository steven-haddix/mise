import { Stack } from "expo-router";
import { tokens } from "../../../components/ui/tokens";

export default function CooksLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: tokens.background },
      }}
    />
  );
}
