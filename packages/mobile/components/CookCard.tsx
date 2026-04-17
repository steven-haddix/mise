import { View, Text } from "react-native";
import { Card, Chip } from "heroui-native";
import type { CookWithSteps } from "@mise/shared";
import { computeDayOfCook, formatStartDate, formatTimeUntil } from "../lib/time-format";
import { Display, Eyebrow } from "./ui";

interface CookCardProps {
  cook: CookWithSteps;
}

export function CookCard({ cook }: CookCardProps) {
  const isActive = cook.status === "planning" || cook.status === "active";
  const completedSteps = cook.steps.filter((s) => s.status === "completed").length;
  const total = cook.steps.length;
  const progress = total > 0 ? completedSteps / total : 0;

  const now = new Date();
  const nextStep = cook.steps.find((s) => s.status === "pending" || s.status === "notified");
  const stepDates = cook.steps.map((s) => new Date(s.scheduledAt));
  const dayInfo = computeDayOfCook(stepDates, now);
  const firstStepDate = stepDates.length > 0 ? stepDates[0] : null;

  return (
    <Card className="rounded-2xl border border-[#E4DBC9] bg-card shadow-none">
      <Card.Body className="p-5">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Eyebrow color="ink-tertiary">{dayInfo.label}</Eyebrow>
            <Display size="sm" italic className="mt-1">
              {cook.title}
            </Display>
            {firstStepDate && (
              <Text
                className="text-[#6B635A] text-[13px] mt-1"
                style={{ fontFamily: "Geist_400Regular" }}
              >
                Started {formatStartDate(firstStepDate)}
              </Text>
            )}
          </View>
          {isActive ? (
            <Chip
              size="sm"
              color="success"
              variant="soft"
              className="rounded-md h-6 px-2 bg-[#DDE5D2] border-0"
            >
              <Chip.Label className="text-[11px] text-[#2F3D2A]">Active</Chip.Label>
            </Chip>
          ) : (
            <Chip size="sm" variant="soft" className="rounded-md h-6 px-2 bg-[#EDE5D3] border-0">
              <Chip.Label className="text-[11px] text-[#9E9488]">
                {cook.status === "completed" ? "Complete" : "Cancelled"}
              </Chip.Label>
            </Chip>
          )}
        </View>

        {total > 0 && (
          <View className="mt-4">
            <View className="h-[2px] bg-[#EDE5D3] rounded-full overflow-hidden">
              <View
                style={{ width: `${Math.round(progress * 100)}%` }}
                className="h-full bg-accent rounded-full"
              />
            </View>
            <Text
              className="text-[#9E9488] text-[11px] mt-2"
              style={{ fontFamily: "IBMPlexMono_400Regular" }}
            >
              {completedSteps} / {total} · {Math.round(progress * 100)}%
            </Text>
          </View>
        )}

        {isActive && nextStep && (
          <View className="mt-4 bg-[#FBF6EC] border border-[#EDE5D3] rounded-xl p-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Eyebrow color="ink-tertiary">Next</Eyebrow>
                <Text
                  className="text-foreground text-[15px] mt-1"
                  style={{ fontFamily: "Newsreader_400Regular_Italic" }}
                  numberOfLines={1}
                >
                  {nextStep.title}
                </Text>
              </View>
              <Text
                className="text-accent text-[13px]"
                style={{ fontFamily: "IBMPlexMono_500Medium" }}
              >
                {formatTimeUntil(new Date(nextStep.scheduledAt), now)}
              </Text>
            </View>
          </View>
        )}
      </Card.Body>
    </Card>
  );
}
