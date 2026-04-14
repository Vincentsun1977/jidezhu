import { appEnv } from "../config/env";
import { request } from "./api";
import { memoryFromTextMock, memoryFromVoiceMock } from "./mock";

type VoiceMemoryPayload = {
  fileId: string;
  userId: string;
  transcript?: string;
};

type TextMemoryPayload = {
  userId: string;
  text: string;
};

type MemoryCreationResult = {
  memoryId: string;
  summary: string;
  memoryType: string;
  needsReminder: boolean;
  replyText: string;
  replyAudioFileId?: string;
  replyRequestId?: string;
};

type ApiEnvelope<T> = {
  success: boolean;
  requestId: string;
  data: T;
};

export async function createMemoryFromVoice(payload: VoiceMemoryPayload) {
  if (appEnv.mode === "mock") {
    try {
      const result = await wx.cloud.callFunction<ApiEnvelope<MemoryCreationResult>>({
        name: "createMemoryFromVoice",
        data: payload,
      });

      if (result.result?.success && result.result.data) {
        return result.result.data;
      }
    } catch (error) {
      console.warn("createMemoryFromVoice fallback to mock", error);
    }

    return {
      ...memoryFromVoiceMock,
      requestUserId: payload.userId,
      requestFileId: payload.fileId,
    } as MemoryCreationResult & { requestUserId: string; requestFileId: string };
  }

  const response = await request<ApiEnvelope<MemoryCreationResult>>(
    "/api/v1/memory/from-voice",
    "POST",
    payload
  );
  return response.data;
}

export async function createMemoryFromText(payload: TextMemoryPayload) {
  if (appEnv.mode === "mock") {
    try {
      const result = await wx.cloud.callFunction<ApiEnvelope<MemoryCreationResult>>({
        name: "createMemoryFromText",
        data: payload,
      });

      if (result.result?.success && result.result.data) {
        return result.result.data;
      }
    } catch (error) {
      console.warn("createMemoryFromText fallback to mock", error);
    }

    return {
      ...memoryFromTextMock,
      contentRaw: payload.text,
    } as MemoryCreationResult & { contentRaw: string };
  }

  const response = await request<ApiEnvelope<MemoryCreationResult>>(
    "/api/v1/memory/from-text",
    "POST",
    payload
  );
  return response.data;
}

type VoiceReplyAudioPayload = {
  requestId: string;
  userId: string;
};

type VoiceReplyAudioResult = {
  success: boolean;
  requestId: string;
  data?: {
    requestId: string;
    replyText: string;
    audioFileId: string;
    provider: string;
  };
  error?: {
    code: string;
    message: string;
  };
};

export async function generateVoiceReplyAudio(payload: VoiceReplyAudioPayload) {
  const result = await wx.cloud.callFunction<VoiceReplyAudioResult>({
    name: "generateVoiceReplyAudio",
    data: payload,
  });

  return result.result || null;
}

type DeleteMemoryPayload = {
  userId: string;
  memoryId: string;
};

export async function deleteMemory(payload: DeleteMemoryPayload) {
  const result = await wx.cloud.callFunction<{
    success: boolean;
    data?: {
      memoryId: string;
    };
  }>({
    name: "deleteMemory",
    data: payload,
  });

  return result.result || null;
}
