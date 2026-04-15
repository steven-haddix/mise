import { View, Text } from "react-native";
import { Dialog, Button } from "heroui-native";

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
        <Dialog.Content>
          <Text className="text-4xl text-center mb-1">🔔</Text>
          <Dialog.Title className="text-foreground text-lg font-bold text-center">
            Want reminders for each step?
          </Dialog.Title>
          <Dialog.Description className="text-muted-foreground text-sm text-center leading-5">
            Mise can ping you when it's time for the next step in your cook.
          </Dialog.Description>
          <View className="flex-row gap-2.5 mt-4">
            <Button variant="tertiary" onPress={onDismiss} className="flex-1">
              <Button.Label>Not now</Button.Label>
            </Button>
            <Button variant="primary" onPress={onEnable} className="flex-1">
              <Button.Label>Enable</Button.Label>
            </Button>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
