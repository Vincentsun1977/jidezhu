const cloud = require("wx-server-sdk");
const https = require("https");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;
const AI_SERVICE_BASE_URL = process.env.AI_SERVICE_BASE_URL || "";
const VECTOR_SERVICE_BASE_URL = process.env.VECTOR_SERVICE_BASE_URL || AI_SERVICE_BASE_URL || "";
const AI_SERVICE_TOKEN = process.env.AI_SERVICE_TOKEN || "";

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
  const result = await requestJson(`${VECTOR_SERVICE_BASE_URL}/api/v1/vector/upsert-memory`, {
    memoryId: memory._id,
    userId: memory.userId,
    summary: memory.summary || "",
    contentRaw: memory.contentRaw || "",
    memoryType: memory.memoryType || "daily",
    createdAt: memory.createdAt || new Date().toISOString(),
    importance: memory.importance || 0,
    tags: memory.tags || [],
  });

  if (!result.success || !result.data) {
    throw new Error(JSON.stringify(result));
  }

  return result.data;
}

exports.main = async (event) => {
  if (!VECTOR_SERVICE_BASE_URL) {
    return {
      success: false,
      requestId: "cf_backfill_vectors_no_base_url",
      error: {
        code: "MISSING_VECTOR_SERVICE_BASE_URL",
        message: "VECTOR_SERVICE_BASE_URL is empty",
      },
    };
  }

  const userId = String(event.userId || "").trim();
  const onlyPending = event.onlyPending !== false;
  const limit = Math.max(1, Math.min(Number(event.limit || 20), 50));

  const where = userId ? { userId } : {};
  if (onlyPending) {
    where.embeddingStatus = _.neq("done");
  }

  const result = await db
    .collection("memories")
    .where(where)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  const memories = result.data || [];
  const synced = [];
  const failed = [];

  for (const memory of memories) {
    try {
      const vector = await syncMemoryVector(memory);
      await db.collection("memories").doc(memory._id).update({
        data: {
          embeddingStatus: "done",
          vectorDocId: vector.vectorDocId || "",
          vectorProvider: vector.provider || "",
          searchText: vector.searchText || "",
          vectorError: "",
          updatedAt: new Date().toISOString(),
        },
      });
      synced.push({
        memoryId: memory._id,
        vectorDocId: vector.vectorDocId || "",
        provider: vector.provider || "",
      });
    } catch (error) {
      const message = String(error && error.message ? error.message : error).slice(0, 500);
      await db.collection("memories").doc(memory._id).update({
        data: {
          embeddingStatus: "failed",
          vectorError: message,
          updatedAt: new Date().toISOString(),
        },
      });
      failed.push({
        memoryId: memory._id,
        error: message,
      });
    }
  }

  return {
    success: true,
    requestId: "cf_backfill_vectors_001",
    data: {
      total: memories.length,
      syncedCount: synced.length,
      failedCount: failed.length,
      synced,
      failed,
    },
  };
};
