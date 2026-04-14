import { appEnv } from "../config/env";
import { request } from "./api";
import { memoryFromTextMock, memoryFromVoiceMock } from "./mock";

export async function createMemoryFromVoice(payload) {
  if (appEnv.mode === "mock") {
    try {
      const result = await wx.cloud.callFunction({
        name: "createMemoryFromVoice",
        data: payload,
      });

      if (result.result && result.result.success && result.result.data) {
        return result.result.data;
      }
    } catch (error) {
      console.warn("createMemoryFromVoice fallback to mock", error);
    }

    return {
      ...memoryFromVoiceMock,
      requestUserId: payload.userId,
      requestFileId: payload.fileId,
    };
  }

  const response = await request("/api/v1/memory/from-voice", "POST", payload);
  return response.data;
}

export async function generateVoiceReplyAudio(payload) {
  const result = await wx.cloud.callFunction({
    name: "generateVoiceReplyAudio",
    data: payload,
  });

  return result.result || null;
}

export async function deleteMemory(payload) {
  const result = await wx.cloud.callFunction({
    name: "deleteMemory",
    data: payload,
  });

  return result.result || null;
}

export async function createMemoryFromText(payload) {
  if (appEnv.mode === "mock") {
    try {
      const result = await wx.cloud.callFunction({
        name: "createMemoryFromText",
        data: payload,
      });

      if (result.result && result.result.success && result.result.data) {
        return result.result.data;
      }
    } catch (error) {
      console.warn("createMemoryFromText fallback to mock", error);
    }

    return {
      ...memoryFromTextMock,
      contentRaw: payload.text,
    };
  }

  const response = await request("/api/v1/memory/from-text", "POST", payload);
  return response.data;
}
