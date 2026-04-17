export function getGreeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return "Good morning, Chef";
  if (hour >= 12 && hour < 17) return "Good afternoon, Chef";
  if (hour >= 17 && hour < 22) return "Good evening, Chef";
  return "Up late, Chef";
}

/**
 * Humanize time until `when` from `now`. Returns "Now" for <= 1min,
 * "N minutes" / "N hours" within the day, "Tomorrow at 4:00 AM",
 * or "Thu at 4:00 AM" for >1 day out.
 */
export function formatTimeUntil(when: Date, now: Date = new Date()): string {
  const diffMs = when.getTime() - now.getTime();
  if (diffMs <= 60_000) return "Now";

  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"}`;

  const diffHr = Math.floor(diffMin / 60);
  if (isSameDay(now, when)) return `${diffHr} hour${diffHr === 1 ? "" : "s"}`;

  const tomorrow = addDays(now, 1);
  if (isSameDay(tomorrow, when)) {
    return `Tomorrow at ${formatClock(when)}`;
  }

  return `${weekdayShort(when)} at ${formatClock(when)}`;
}

export function formatStartDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatClock(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export interface StepTimestamp {
  dayLabel: string | null;
  time: string;
}

/**
 * Given ordered step start times, return parallel `{ dayLabel, time }` entries.
 * `dayLabel` is set on the first entry and whenever a step falls on a different
 * calendar day than the previous valid entry — `"TODAY"`, `"TOMORROW"`, or an
 * uppercased short weekday (`"THU"`). Invalid entries in the input (null) map
 * to null in the output and do not reset the day-change tracking.
 */
export function formatStepTimestamps(
  dates: Array<Date | null>,
  now: Date = new Date(),
): Array<StepTimestamp | null> {
  const todayKey = dayKey(now);
  const tomorrowKey = dayKey(addDays(now, 1));

  let prevDayKey: string | null = null;
  return dates.map((d) => {
    if (!d) return null;
    const thisDayKey = dayKey(d);
    const time = formatClock(d);
    if (thisDayKey === prevDayKey) {
      return { dayLabel: null, time };
    }
    let label: string;
    if (thisDayKey === todayKey) label = "TODAY";
    else if (thisDayKey === tomorrowKey) label = "TOMORROW";
    else label = weekdayShort(d).toUpperCase();
    prevDayKey = thisDayKey;
    return { dayLabel: label, time };
  });
}

/**
 * Formats a duration in seconds as "~N hours" or "~N minutes". Designed
 * for the "Total time" meta row on the plan preview.
 */
export function formatTotalDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `~${mins} minutes`;
  const hours = Math.round(mins / 60);
  return `~${hours} hour${hours === 1 ? "" : "s"}`;
}

/**
 * Compute day-of-cook from a list of step dates. Returns { x, y, label }.
 * - y = count of unique calendar days across all steps (min 1)
 * - x = count of unique days from firstStepDay through today (clamped [1, y])
 * - If today is before firstStepDay, label is "Starts tomorrow" etc. and x/y reflect future start.
 */
export function computeDayOfCook(
  stepDates: Date[],
  now: Date = new Date(),
): { x: number; y: number; label: string; startsInFuture: boolean } {
  if (stepDates.length === 0) return { x: 1, y: 1, label: "Day 1 of 1", startsInFuture: false };

  const dayKeys = Array.from(new Set(stepDates.map((d) => dayKey(d)))).sort();
  const firstDayKey = dayKeys[0];
  const y = dayKeys.length;
  const todayKey = dayKey(now);

  if (todayKey < firstDayKey) {
    const first = parseDayKey(firstDayKey);
    const daysTil = Math.round((first.getTime() - startOfDay(now).getTime()) / 86_400_000);
    const label = daysTil === 1 ? "Starts tomorrow" : `Starts in ${daysTil} days`;
    return { x: 0, y, label, startsInFuture: true };
  }

  // Count unique days from firstDayKey through todayKey (inclusive), clamped to y.
  const first = parseDayKey(firstDayKey);
  const today = startOfDay(now);
  const daysSinceStart = Math.max(
    1,
    Math.min(y, Math.round((today.getTime() - first.getTime()) / 86_400_000) + 1),
  );
  return { x: daysSinceStart, y, label: `Day ${daysSinceStart} of ${y}`, startsInFuture: false };
}

function isSameDay(a: Date, b: Date): boolean {
  return dayKey(a) === dayKey(b);
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseDayKey(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function weekdayShort(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

/**
 * Splits a localized clock string like "2:00 PM" into time + meridiem.
 * Handles the narrow non-breaking space (U+202F) and NBSP (U+00A0) that
 * modern ICU inserts before AM/PM in many locales — a plain `.split(" ")`
 * misses those and leaves "2:00\u202FPM" whole, which blows out narrow
 * columns. 24-hour locales return `{ time, meridiem: undefined }`.
 */
export function splitClock(full: string): { time: string; meridiem?: string } {
  const parts = full.split(/[\s\u00A0\u202F]+/).filter(Boolean);
  if (parts.length >= 2) return { time: parts[0], meridiem: parts[1] };
  return { time: full };
}

/**
 * Formats a seconds duration for the live countdown on HappeningNowCard.
 * `mm:ss` below an hour, `HH:MM:SS` at or above an hour. Negative clamps to 00:00.
 */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (hh > 0) return `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
  return `${pad(mm)}:${pad(ss)}`;
}
