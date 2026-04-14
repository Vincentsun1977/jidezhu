const cloud = require("wx-server-sdk");
const https = require("https");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const AI_SERVICE_BASE_URL = process.env.AI_SERVICE_BASE_URL || "";
const AI_SERVICE_TOKEN = process.env.AI_SERVICE_TOKEN || "";

function buildSummary(text) {
  const cleanText = String(text || "").trim();
  if (!cleanText) {
    return "";
  }

  if (cleanText.length <= 18) {
    return cleanText;
  }

  return `${cleanText.slice(0, 18)}...`;
}

function detectMemoryType(text) {
  const content = String(text || "");
  if (content.includes("药")) return "medicine";
  if (content.includes("买")) return "shopping";
  if (content.includes("旅游") || content.includes("出行")) return "travel";
  if (content.includes("家")) return "family";
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

async function syncMemoryVector(memory) {
  if (!AI_SERVICE_BASE_URL) {
    return {
      ok: false,
      error: "AI_SERVICE_BASE_URL is empty",
      status: "pending",
    };
  }

  try {
    const result = await requestJson(`${AI_SERVICE_BASE_URL}/api/v1/vector/upsert-memory`, {
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
  const text = String(event.text || "").trim();
  const userId = String(event.userId || "").trim();

  if (!text) {
    return {
      success: false,
      requestId: "cf_text_invalid",
      error: {
        code: "INVALID_TEXT",
        message: "text is required",
      },
    };
  }

  if (!userId) {
    return {
      success: false,
      requestId: "cf_text_invalid_user",
      error: {
        code: "INVALID_USER",
        message: "userId is required",
      },
    };
  }

  const now = new Date().toISOString();
  const summary = buildSummary(text);
  const memoryType = detectMemoryType(text);
  const needsReminder = text.includes("提醒") || text.includes("记得") || text.includes("晚上");

  const memoryPayload = {
    userId,
    sourceType: "text",
    contentRaw: text,
    summary,
    memoryType,
    lifeCategory: memoryType === "medicine" ? "health" : "daily",
    timeScope: "custom",
    tags: [],
    importance: memoryType === "medicine" ? 0.9 : 0.7,
    longTerm: memoryType !== "daily",
    needsReminder,
    reminderCandidate: needsReminder,
    embeddingStatus: "pending",
    createdAt: now,
    updatedAt: now,
  };

  const createResult = await db.collection("memories").add({
    data: {
      ...memoryPayload,
    },
  });

  const vectorSync = await syncMemoryVector({
    memoryId: createResult._id,
    ...memoryPayload,
  });

  await db.collection("memories").doc(createResult._id).update({
    data: {
      embeddingStatus: vectorSync.status,
      vectorDocId: vectorSync.data?.vectorDocId || "",
      vectorProvider: vectorSync.data?.provider || "",
      searchText: vectorSync.data?.searchText || "",
      vectorError: vectorSync.ok ? "" : String(vectorSync.error || "").slice(0, 500),
      updatedAt: new Date().toISOString(),
    },
  });

  return {
    success: true,
    requestId: "cf_text_001",
    data: {
      memoryId: createResult._id,
      summary,
      memoryType,
      needsReminder,
      vectorSync: vectorSync.ok ? vectorSync.data : { error: vectorSync.error },
      replyText: `我帮你记下了，${summary}`,
    },
  };
};
