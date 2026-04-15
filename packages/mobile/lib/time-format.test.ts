import { describe, it, expect } from "bun:test";
import { formatStepTimestamps } from "./time-format";

const now = new Date("2026-04-14T14:00:00"); // local time

describe("formatStepTimestamps", () => {
  it("labels first entry and flips only on day boundary", () => {
    const dates = [
      new Date("2026-04-14T14:00:00"),
      new Date("2026-04-14T15:30:00"),
      new Date("2026-04-14T22:30:00"),
      new Date("2026-04-14T23:00:00"),
      new Date("2026-04-15T00:00:00"),
      new Date("2026-04-15T00:30:00"),
    ];
    const stamps = formatStepTimestamps(dates, now);
    const labels = stamps.map((s) => s?.dayLabel);
    expect(labels).toEqual(["TODAY", null, null, null, "TOMORROW", null]);
  });

  it("uses short weekday for days beyond tomorrow", () => {
    const dates = [
      new Date("2026-04-16T08:00:00"),
      new Date("2026-04-17T09:00:00"),
    ];
    const stamps = formatStepTimestamps(dates, now);
    expect(stamps[0]?.dayLabel).toBe("THU");
    expect(stamps[1]?.dayLabel).toBe("FRI");
  });

  it("keeps all nulls aligned and preserves tracking across invalid entries", () => {
    const dates: Array<Date | null> = [
      new Date("2026-04-14T08:00:00"),
      null,
      new Date("2026-04-14T12:00:00"),
      new Date("2026-04-15T08:00:00"),
    ];
    const stamps = formatStepTimestamps(dates, now);
    expect(stamps[0]?.dayLabel).toBe("TODAY");
    expect(stamps[1]).toBeNull();
    expect(stamps[2]?.dayLabel).toBeNull();
    expect(stamps[3]?.dayLabel).toBe("TOMORROW");
  });

  it("single-day cook returns label only on first entry", () => {
    const dates = [
      new Date("2026-04-14T08:00:00"),
      new Date("2026-04-14T10:00:00"),
      new Date("2026-04-14T12:00:00"),
    ];
    const stamps = formatStepTimestamps(dates, now);
    expect(stamps.map((s) => s?.dayLabel)).toEqual(["TODAY", null, null]);
  });
});
