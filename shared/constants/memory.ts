export const MEMORY_TYPES = [
  "medicine",
  "shopping",
  "travel",
  "family",
  "appointment",
  "idea",
  "important",
  "daily",
] as const;

export const TIME_SCOPES = [
  "today",
  "today_evening",
  "yesterday",
  "last3days",
  "lastWeek",
  "thisMonth",
  "custom",
] as const;

export const REMINDER_ACTIONS = [
  "done",
  "snooze_30m",
  "snooze_tomorrow",
] as const;
