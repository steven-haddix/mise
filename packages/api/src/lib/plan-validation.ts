export interface ProposePlanInput {
  title: string;
  targetTime: string;
  steps: Array<{
    title: string;
    description: string;
    scheduledAt: string;
  }>;
}

export interface ValidationResult {
  ok: boolean;
  notes: string[];
}

function parseDate(s: string): Date | null {
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function validatePlan(input: ProposePlanInput, now: Date = new Date()): ValidationResult {
  const notes: string[] = [];

  if (!input.title || !input.title.trim()) {
    notes.push("Plan title is required.");
  }

  const target = parseDate(input.targetTime);
  if (!target) {
    notes.push("targetTime must be a valid ISO 8601 timestamp.");
  } else if (target.getTime() <= now.getTime()) {
    notes.push("targetTime is in the past — the plan cannot be scheduled.");
  }

  if (!Array.isArray(input.steps) || input.steps.length === 0) {
    notes.push("Plan must have at least one step.");
    return { ok: notes.length === 0, notes };
  }

  const parsedSteps: { scheduledAt: Date; step: typeof input.steps[number] }[] = [];

  for (let i = 0; i < input.steps.length; i++) {
    const step = input.steps[i];
    if (!step.title || !step.title.trim()) {
      notes.push(`Step ${i + 1} is missing a title.`);
    }
    if (!step.description || !step.description.trim()) {
      notes.push(`Step ${i + 1} is missing a description.`);
    }
    const when = parseDate(step.scheduledAt);
    if (!when) {
      notes.push(`Step ${i + 1} has an invalid scheduledAt.`);
      continue;
    }
    if (target && when.getTime() > target.getTime()) {
      notes.push(`Step ${i + 1} is scheduled after targetTime.`);
    }
    parsedSteps.push({ scheduledAt: when, step });
  }

  for (let i = 1; i < parsedSteps.length; i++) {
    const prev = parsedSteps[i - 1].scheduledAt.getTime();
    const curr = parsedSteps[i].scheduledAt.getTime();
    if (curr < prev) {
      notes.push("Steps must be sorted by scheduledAt ascending.");
      break;
    }
    if (curr === prev) {
      notes.push(`Consecutive steps have a zero gap at step ${i + 1}.`);
    }
  }

  return { ok: notes.length === 0, notes };
}
