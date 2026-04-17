import { describe, it, expect } from "bun:test";
import { splitClock } from "./time-format";

describe("splitClock", () => {
  it("splits a plain-space AM/PM clock", () => {
    expect(splitClock("2:00 PM")).toEqual({ time: "2:00", meridiem: "PM" });
    expect(splitClock("10:30 AM")).toEqual({ time: "10:30", meridiem: "AM" });
  });

  it("splits across a narrow non-breaking space (U+202F)", () => {
    // ICU emits this in modern en-US. A naive split(" ") keeps it whole.
    expect(splitClock("2:00\u202FPM")).toEqual({ time: "2:00", meridiem: "PM" });
  });

  it("splits across a non-breaking space (U+00A0)", () => {
    expect(splitClock("2:00\u00A0PM")).toEqual({ time: "2:00", meridiem: "PM" });
  });

  it("returns just the time for 24-hour locales", () => {
    expect(splitClock("14:00")).toEqual({ time: "14:00" });
  });
});
