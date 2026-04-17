import { describe, it, expect } from "bun:test";
import { validatePlan } from "./plan-validation.js";

const now = new Date("2026-04-12T12:00:00Z");
const tomorrow = new Date("2026-04-13T12:00:00Z");
const dayAfter = new Date("2026-04-14T12:00:00Z");
const yesterday = new Date("2026-04-11T12:00:00Z");

describe("validatePlan", () => {
  it("returns no notes for a valid plan", () => {
    const result = validatePlan(
      {
        title: "Sourdough",
        targetTime: tomorrow.toISOString(),
        steps: [
          {
            title: "Feed starter",
            description: "x",
            scheduledAt: new Date("2026-04-12T20:00:00Z").toISOString(),
          },
          {
            title: "Mix",
            description: "y",
            scheduledAt: new Date("2026-04-13T08:00:00Z").toISOString(),
          },
        ],
      },
      now,
    );
    expect(result.ok).toBe(true);
    expect(result.notes).toEqual([]);
  });

  it("rejects targetTime in the past", () => {
    const result = validatePlan(
      {
        title: "Past cook",
        targetTime: yesterday.toISOString(),
        steps: [
          {
            title: "A",
            description: "x",
            scheduledAt: new Date("2026-04-10T12:00:00Z").toISOString(),
          },
        ],
      },
      now,
    );
    expect(result.ok).toBe(false);
    expect(result.notes.join(" ")).toMatch(/targetTime.*past/i);
  });

  it("rejects empty steps array", () => {
    const result = validatePlan(
      { title: "Empty", targetTime: tomorrow.toISOString(), steps: [] },
      now,
    );
    expect(result.ok).toBe(false);
    expect(result.notes.join(" ")).toMatch(/at least one step/i);
  });

  it("rejects step with empty title", () => {
    const result = validatePlan(
      {
        title: "x",
        targetTime: tomorrow.toISOString(),
        steps: [
          {
            title: "  ",
            description: "x",
            scheduledAt: new Date("2026-04-12T20:00:00Z").toISOString(),
          },
        ],
      },
      now,
    );
    expect(result.ok).toBe(false);
    expect(result.notes.join(" ")).toMatch(/title/i);
  });

  it("rejects step with empty description", () => {
    const result = validatePlan(
      {
        title: "x",
        targetTime: tomorrow.toISOString(),
        steps: [
          {
            title: "t",
            description: "",
            scheduledAt: new Date("2026-04-12T20:00:00Z").toISOString(),
          },
        ],
      },
      now,
    );
    expect(result.ok).toBe(false);
    expect(result.notes.join(" ")).toMatch(/description/i);
  });

  it("rejects unsorted steps", () => {
    const result = validatePlan(
      {
        title: "x",
        targetTime: dayAfter.toISOString(),
        steps: [
          {
            title: "a",
            description: "x",
            scheduledAt: new Date("2026-04-13T08:00:00Z").toISOString(),
          },
          {
            title: "b",
            description: "x",
            scheduledAt: new Date("2026-04-12T20:00:00Z").toISOString(),
          },
        ],
      },
      now,
    );
    expect(result.ok).toBe(false);
    expect(result.notes.join(" ")).toMatch(/sorted/i);
  });

  it("rejects step scheduledAt after targetTime", () => {
    const result = validatePlan(
      {
        title: "x",
        targetTime: tomorrow.toISOString(),
        steps: [
          {
            title: "a",
            description: "x",
            scheduledAt: new Date("2026-04-14T00:00:00Z").toISOString(),
          },
        ],
      },
      now,
    );
    expect(result.ok).toBe(false);
    expect(result.notes.join(" ")).toMatch(/after target/i);
  });

  it("rejects duplicate consecutive step times", () => {
    const when = new Date("2026-04-12T20:00:00Z").toISOString();
    const result = validatePlan(
      {
        title: "x",
        targetTime: tomorrow.toISOString(),
        steps: [
          { title: "a", description: "x", scheduledAt: when },
          { title: "b", description: "x", scheduledAt: when },
        ],
      },
      now,
    );
    expect(result.ok).toBe(false);
    expect(result.notes.join(" ")).toMatch(/gap/i);
  });

  it("rejects non-parseable ISO dates", () => {
    const result = validatePlan(
      {
        title: "x",
        targetTime: "not-a-date",
        steps: [
          {
            title: "a",
            description: "x",
            scheduledAt: new Date("2026-04-12T20:00:00Z").toISOString(),
          },
        ],
      },
      now,
    );
    expect(result.ok).toBe(false);
    expect(result.notes.join(" ")).toMatch(/targetTime/i);
  });

  it("rejects step scheduledAt that encodes a comma-separated range", () => {
    const result = validatePlan(
      {
        title: "Sourdough",
        targetTime: tomorrow.toISOString(),
        steps: [
          {
            title: "Mix",
            description: "x",
            scheduledAt: new Date("2026-04-12T14:00:00Z").toISOString(),
          },
          {
            title: "Overnight Bulk Ferment",
            description: "y",
            scheduledAt: "2026-04-12T17:00:00Z,2026-04-13T08:00:00Z",
          },
        ],
      },
      now,
    );
    expect(result.ok).toBe(false);
    expect(result.notes.join(" ")).toMatch(/invalid scheduledAt/i);
  });
});
