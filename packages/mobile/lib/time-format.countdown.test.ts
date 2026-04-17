import { describe, it, expect } from "bun:test";
import { formatCountdown } from "./time-format";

describe("formatCountdown", () => {
  it("formats seconds as mm:ss with zero padding", () => {
    expect(formatCountdown(24 * 60 + 12)).toBe("24:12");
    expect(formatCountdown(5)).toBe("00:05");
    expect(formatCountdown(65)).toBe("01:05");
  });

  it("clamps negative durations to 00:00", () => {
    expect(formatCountdown(-30)).toBe("00:00");
    expect(formatCountdown(0)).toBe("00:00");
  });

  it("collapses hours into minutes for under-an-hour values", () => {
    expect(formatCountdown(59 * 60 + 59)).toBe("59:59");
  });

  it("shows HH:MM:SS when >= 1 hour", () => {
    expect(formatCountdown(60 * 60)).toBe("01:00:00");
    expect(formatCountdown(2 * 3600 + 15 * 60 + 3)).toBe("02:15:03");
  });
});
