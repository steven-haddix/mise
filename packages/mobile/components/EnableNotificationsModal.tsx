import { View } from "react-native";
import { Dialog, Button } from "heroui-native";
import { Bell } from "lucide-react-native";
import { Display, tokens } from "./ui";

interface Props {
  visible: boolean;
  onEnable: () => void;
  onDismiss: () => void;
}

export function EnableNotificationsModal({ visible, onEnable, onDismiss }: Props) {
  return (
    <Dialog
      isOpen={visible}
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content className="bg-card rounded-2xl">
          <View className="items-center mb-2">
            <View className="rounded-full bg-[#F3DDCC] h-12 w-12 items-center justify-center">
              <Bell size={22} color={tokens.accent} strokeWidth={2.2} />
            </View>
          </View>
          <Display size="sm" italic className="text-center">
            Reminders for each step?
          </Display>
          <Dialog.Description
            className="text-[#6B635A] text-[14px] text-center leading-5 mt-2"
            style={{ fontFamily: "Geist_400Regular" }}
          >
            Mise can ping you when it's time for the next step in your cook.
          </Dialog.Description>
          <View className="flex-row gap-2.5 mt-5">
            <Button variant="tertiary" onPress={onDismiss} className="flex-1 rounded-xl h-11">
              <Button.Label>Not now</Button.Label>
            </Button>
            <Button
              variant="primary"
              onPress={onEnable}
              className="flex-1 rounded-xl h-11 bg-accent"
            >
              <Button.Label className="text-white">Enable</Button.Label>
            </Button>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
