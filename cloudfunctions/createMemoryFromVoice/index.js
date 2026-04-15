const cloud = require("wx-server-sdk");
const https = require("https");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const AI_SERVICE_BASE_URL = process.env.AI_SERVICE_BASE_URL || "";
const VECTOR_SERVICE_BASE_URL = process.env.VECTOR_SERVICE_BASE_URL || AI_SERVICE_BASE_URL || "";
const AI_SERVICE_TOKEN = process.env.AI_SERVICE_TOKEN || "";

function guessTranscript(fileId) {
  const value = String(fileId || "");
  if (value.includes("medicine")) return "我晚上要吃降压药";
  if (value.includes("shopping")) return "记一下，我想买鸡蛋和牛奶";
  if (value.includes("travel")) return "下个月我想去苏州旅游";
  return "我刚刚说了一件重要的事情";
}

function detectMemoryType(text) {
  if (text.includes("药")) return "medicine";
  if (text.includes("买")) return "shopping";
  if (text.includes("旅游") || text.includes("出行")) return "travel";
  return "daily";
}

function requestJson(url, payload) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const request = https.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || (target.protocol === "https:" ? 443 : 80),
        path: `${target.pathname}${target.search}`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: AI_SERVICE_TOKEN ? `Bearer ${AI_SERVICE_TOKEN}` : "",
        },
      },
      (response) => {
        let body = "";
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          try {
            resolve(JSON.parse(body || "{}"));
          } catch (error) {
            reject(error);
          }
        });
      }
    );

    request.on("error", reject);
    request.write(JSON.stringify(payload));
    request.end();
  });
}

async function processVoiceWithAIService(fileId, userId, transcriptHint) {
  if (!AI_SERVICE_BASE_URL) {
    return {
      ok: false,
      stage: "missing_base_url",
      error: "AI_SERVICE_BASE_URL is empty",
    };
  }

  try {
    const downloadResult = await cloud.downloadFile({
      fileID: fileId,
    });
    const audioBase64 = downloadResult.fileContent.toString("base64");
    const audioFormat = fileId.split(".").pop() || "mp3";

    const result = await requestJson(`${AI_SERVICE_BASE_URL}/api/v1/memory/from-voice`, {
      fileId,
      userId,
      transcript: transcriptHint || "",
      audioBase64,
      audioFormat,
      skipTts: true,
    });

    if (result.success && result.data) {
      return {
        ok: true,
        data: result.data,
      };
    }
    return {
      ok: false,
      stage: "ai_service_response",
      error: JSON.stringify(result),
    };
  } catch (error) {
    console.warn("AI voice service unavailable, fallback to local parser", error);
    return {
      ok: false,
      stage: "ai_service_request",
      error: String(error && error.message ? error.message : error),
    };
  }
}

async function maybeCreateReminder({ userId, memoryId, contentRaw, summary, suggestion }) {
  if (!suggestion || !suggestion.shouldCreate || !suggestion.triggerAt) {
    return null;
  }

  const now = new Date().toISOString();
  const createResult = await db.collection("reminders").add({
    data: {
      userId,
      memoryId,
      title: suggestion.title || summary || contentRaw,
      triggerType: "explicit_time",
      triggerAt: suggestion.triggerAt,
      status: "pending",
      channel: "miniapp",
      voiceText: suggestion.title || summary || contentRaw,
      repeatRule: null,
      createdBy: "ai",
      createdAt: now,
      updatedAt: now,
    },
  });

  return {
    reminderId: createResult._id,
    triggerAt: suggestion.triggerAt,
  };
}

async function syncMemoryVector(memory) {
  if (!VECTOR_SERVICE_BASE_URL) {
    return {
      ok: false,
      error: "VECTOR_SERVICE_BASE_URL is empty",
      status: "pending",
    };
  }

  try {
    const result = await requestJson(`${VECTOR_SERVICE_BASE_URL}/api/v1/vector/upsert-memory`, {
      memoryId: memory.memoryId,
      userId: memory.userId,
      summary: memory.summary,
      contentRaw: memory.contentRaw,
      memoryType: memory.memoryType,
      createdAt: memory.createdAt,
      importance: memory.importance,
      tags: memory.tags || [],
    });
    if (result.success && result.data) {
      return {
        ok: true,
        status: "done",
        data: result.data,
      };
    }
    return {
      ok: false,
      status: "failed",
      error: JSON.stringify(result),
    };
  } catch (error) {
    return {
      ok: false,
      status: "failed",
      error: String(error && error.message ? error.message : error),
    };
  }
}

exports.main = async (event) => {
  const userId = String(event.userId || "").trim();
  const fileId = String(event.fileId || "").trim();

  if (!userId) {
    return {
      success: false,
      requestId: "cf_voice_invalid_user",
      error: {
        code: "INVALID_USER",
        message: "userId is required",
      },
    };
  }

  if (!fileId) {
    return {
      success: false,
      requestId: "cf_voice_invalid_file",
      error: {
        code: "INVALID_FILE",
        message: "fileId is required",
      },
    };
  }

  const aiResult = await processVoiceWithAIService(fileId, userId, event.transcript);
  const aiData = aiResult && aiResult.ok ? aiResult.data : null;
  const aiDebug = aiResult && !aiResult.ok ? aiResult : null;
  const asrDebug = aiData?.asrDebug || null;
  const reminderSuggestion = aiData?.reminderSuggestion || null;

  const contentRaw = String(aiData?.contentRaw || event.transcript || "").trim() || guessTranscript(fileId);
  const summary = aiData?.summary || (contentRaw.length > 18 ? `${contentRaw.slice(0, 18)}...` : contentRaw);
  const memoryType = aiData?.memoryType || detectMemoryType(contentRaw);
  const needsReminder =
    typeof aiData?.needsReminder === "boolean"
      ? aiData.needsReminder
      : contentRaw.includes("药") || contentRaw.includes("记得") || contentRaw.includes("晚上");
  const now = new Date().toISOString();

  const memoryPayload = {
    userId,
    sourceType: "voice",
    audioFileId: fileId,
    contentRaw,
    summary,
    memoryType,
    lifeCategory: memoryType === "medicine" ? "health" : "daily",
    timeScope: "custom",
    tags: [],
    importance: memoryType === "medicine" ? 0.92 : 0.75,
    longTerm: memoryType !== "daily",
    needsReminder,
    reminderCandidate: needsReminder,
    embeddingStatus: "pending",
    aiProvider: aiData?.provider || "fallback",
    asrDebug,
    aiDebug,
    createdAt: now,
    updatedAt: now,
  };

  const memoryResult = await db.collection("memories").add({
    data: {
      ...memoryPayload,
    },
  });

  const vectorSync = await syncMemoryVector({
    memoryId: memoryResult._id,
    ...memoryPayload,
  });

  await db.collection("memories").doc(memoryResult._id).update({
    data: {
      embeddingStatus: vectorSync.status,
      vectorDocId: vectorSync.data?.vectorDocId || "",
      vectorProvider: vectorSync.data?.provider || "",
      searchText: vectorSync.data?.searchText || "",
      vectorError: vectorSync.ok ? "" : String(vectorSync.error || "").slice(0, 500),
      updatedAt: new Date().toISOString(),
    },
  });

  const reminderResult = await maybeCreateReminder({
    userId,
    memoryId: memoryResult._id,
    contentRaw,
    summary,
    suggestion: reminderSuggestion,
  });

  const replyText = aiData?.replyText || `我记住了，${summary}`;
  const replyAudioFileId = aiData?.replyAudioFileId || "";
  const ttsProvider = aiData?.ttsProvider || aiData?.provider || "fallback";
  const ttsError = aiData?.ttsError || "";

  await db.collection("voice_replies").add({
    data: {
      userId,
      requestId: `voice_${memoryResult._id}`,
      replyText,
      audioFileId: replyAudioFileId,
      scene: "memory_confirm",
      provider: ttsProvider,
      debug: aiDebug,
      asrDebug,
      ttsError,
      createdAt: now,
    },
  });

  return {
    success: true,
    requestId: "cf_voice_001",
    data: {
      memoryId: memoryResult._id,
      summary,
      memoryType,
      needsReminder,
      replyText,
      replyAudioFileId,
      replyRequestId: `voice_${memoryResult._id}`,
      provider: aiData?.provider || "fallback",
      asrDebug,
      reminderSuggestion,
      autoReminder: reminderResult,
      vectorSync: vectorSync.ok ? vectorSync.data : { error: vectorSync.error },
      ttsProvider,
      ttsError,
      debug: aiDebug,
    },
  };
};
