import { MEMORY_TYPES, REMINDER_ACTIONS, TIME_SCOPES } from "../constants/memory";

export type ApiError = {
  code: string;
  message: string;
};

export type ApiResponse<T> = {
  success: boolean;
  requestId: string;
  data?: T;
  error?: ApiError;
};

export type MemoryType = (typeof MEMORY_TYPES)[number];
export type TimeScope = (typeof TIME_SCOPES)[number];
export type ReminderAction = (typeof REMINDER_ACTIONS)[number];

export type User = {
  _id: string;
  openid: string;
  nickname: string;
  seniorMode: boolean;
  fontScale: "medium" | "large" | "xlarge";
  voiceReplyEnabled: boolean;
  ttsSpeed: 0.75 | 0.85 | 1;
  dailyDigestTime: string;
  createdAt: string;
  updatedAt: string;
};

export type Memory = {
  _id: string;
  userId: string;
  sourceType: "voice" | "text";
  audioFileId?: string;
  contentRaw: string;
  summary: string;
  memoryType: MemoryType;
  lifeCategory: string;
  timeScope: TimeScope;
  tags: string[];
  importance: number;
  longTerm: boolean;
  needsReminder: boolean;
  reminderCandidate: boolean;
  embeddingStatus: "pending" | "done";
  createdAt: string;
  updatedAt: string;
};

export type Reminder = {
  _id: string;
  userId: string;
  memoryId?: string;
  title: string;
  triggerType: "explicit_time" | "ai_suggested" | "digest";
  triggerAt: string;
  status: "pending" | "done" | "snoozed";
  channel: "miniapp" | "subscribe";
  voiceText: string;
  repeatRule: string | null;
  createdBy: "user" | "ai" | "system";
  createdAt: string;
  updatedAt: string;
};

export type VoiceReply = {
  _id: string;
  userId: string;
  requestId: string;
  replyText: string;
  audioFileId?: string;
  scene: "memory_confirm" | "recall_summary" | "reminder_broadcast";
  createdAt: string;
};

export type FeedbackEvent = {
  _id: string;
  userId: string;
  targetType: "reminder" | "memory";
  targetId: string;
  action: string;
  value?: string;
  createdAt: string;
};
