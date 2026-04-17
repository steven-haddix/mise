import { forwardRef } from "react";
import { View, type TextInput as RNTextInput } from "react-native";
import { Input, Button } from "heroui-native";
import { Send } from "lucide-react-native";
import { tokens } from "./ui/tokens";

interface ChatComposerProps {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ChatComposer = forwardRef<RNTextInput, ChatComposerProps>(
  function ChatComposer(
    { value, onChangeText, onSend, disabled, placeholder = "What are you cooking?" },
    ref,
  ) {
    return (
      <View className="flex-row items-end gap-3">
        <Input
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          multiline
          className="flex-1 max-h-40 text-[16px] leading-5 rounded-2xl px-5 py-4 bg-[#FBF6EC] border border-[#E4DBC9] shadow-none"
          style={{ fontFamily: "Geist_400Regular" }}
          onSubmitEditing={onSend}
        />
        <Button
          isIconOnly
          variant="primary"
          size="lg"
          className="rounded-2xl h-14 w-14 bg-accent"
          onPress={onSend}
          isDisabled={!value.trim() || disabled}
        >
          <Send color={tokens.accentForeground} size={22} strokeWidth={2.2} />
        </Button>
      </View>
    );
  },
);
