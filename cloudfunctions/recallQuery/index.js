const cloud = require("wx-server-sdk");
const https = require("https");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;
const AI_SERVICE_BASE_URL = process.env.AI_SERVICE_BASE_URL || "";
const AI_SERVICE_TOKEN = process.env.AI_SERVICE_TOKEN || "";

function buildDisplaySummary(item) {
  const summary = String(item.summary || "").trim();
  const raw = String(item.contentRaw || "").trim();
  const source = summary || raw;

  if (!source) {
    return "一条记忆";
  }

  let cleaned = source
    .replace(/^帮我(记录|记一下|记个|记一条|记住)(一下)?[，,\s]*/g, "")
    .replace(/^记一下[，,\s]*/g, "")
    .replace(/[，,。\s]*帮我提醒一下(我)?$/g, "")
    .replace(/[，,。\s]*帮我记一下$/g, "")
    .trim();

  if (cleaned.length > 24) {
    cleaned = `${cleaned.slice(0, 24)}...`;
  }

  return cleaned || source;
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

function resolveRange(query, scope) {
  const now = new Date();
  const end = now.toISOString();
  const text = String(query || "");
  const normalizedScope = String(scope || "").trim();

  if (normalizedScope === "all") {
    const start = new Date(now.getFullYear() - 5, 0, 1);
    return { label: "这段时间", start: start.toISOString(), end };
  }

  if (normalizedScope === "lastYear" || text.includes("去年")) {
    const start = new Date(now.getFullYear() - 1, 0, 1);
    const lastYearEnd = new Date(now.getFullYear(), 0, 1);
    return { label: "去年", start: start.toISOString(), end: lastYearEnd.toISOString() };
  }

  if (normalizedScope === "today" || text.includes("今天")) {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { label: "今天", start: start.toISOString(), end };
  }

  if (normalizedScope === "yesterday" || text.includes("昨天")) {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { label: "昨天", start: start.toISOString(), end: next.toISOString() };
  }

  if (normalizedScope === "last3days" || text.includes("最近三天") || text.includes("最近3天")) {
    const start = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    return { label: "最近三天", start: start.toISOString(), end };
  }

  if (normalizedScope === "thisMonth" || text.includes("本月")) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { label: "本月", start: start.toISOString(), end };
  }

  const day = now.getDay() || 7;
  const lastWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day - 6);
  const lastWeekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
  return { label: "上周", start: lastWeekStart.toISOString(), end: lastWeekEnd.toISOString() };
}

function matchesKeywords(item, keywords, memoryTypes) {
  const normalizedKeywords = Array.isArray(keywords) ? keywords.filter(Boolean) : [];
  const normalizedTypes = Array.isArray(memoryTypes) ? memoryTypes.filter(Boolean) : [];

  if (!normalizedKeywords.length && !normalizedTypes.length) {
    return true;
  }

  const text = `${item.summary || ""} ${item.contentRaw || ""} ${item.memoryType || ""}`;
  const keywordMatched = !normalizedKeywords.length || normalizedKeywords.some((keyword) => text.includes(keyword));
  const typeMatched = !normalizedTypes.length || normalizedTypes.includes(item.memoryType) || normalizedTypes.includes("important");
  return keywordMatched && typeMatched;
}

function buildScoreMap(vectorHits) {
  const scoreMap = new Map();
  for (const item of vectorHits || []) {
    const memoryId = String(item.memoryId || "").trim();
    if (!memoryId) {
      continue;
    }
    const score = Number(item.score || 0);
    scoreMap.set(memoryId, Number.isFinite(score) ? score : 0);
  }
  return scoreMap;
}

function rankCandidateItems(items, scoreMap, queryMeta) {
  const keywordSet = new Set((queryMeta.keywords || []).filter(Boolean));
  const typeSet = new Set((queryMeta.memoryTypes || []).filter(Boolean));

  return [...items].sort((a, b) => {
    const aVector = scoreMap.get(a.memoryId) || 0;
    const bVector = scoreMap.get(b.memoryId) || 0;
    const aKeyword = [...keywordSet].reduce((sum, keyword) => sum + (a.sourceText.includes(keyword) ? 1 : 0), 0);
    const bKeyword = [...keywordSet].reduce((sum, keyword) => sum + (b.sourceText.includes(keyword) ? 1 : 0), 0);
    const aType = typeSet.has(a.memoryType) ? 1 : 0;
    const bType = typeSet.has(b.memoryType) ? 1 : 0;
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();

    if (bVector !== aVector) return bVector - aVector;
    if (bKeyword !== aKeyword) return bKeyword - aKeyword;
    if (bType !== aType) return bType - aType;
    return bTime - aTime;
  });
}

function withinDateRange(item, range) {
  const createdAt = String(item.createdAt || "");
  return createdAt >= range.start && createdAt < range.end;
}

function formatTimeText(isoString) {
  const date = new Date(isoString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = `${date.getHours()}`.padStart(2, "0");
  const minute = `${date.getMinutes()}`.padStart(2, "0");
  return `${month}月${day}日 ${hour}:${minute}`;
}

exports.main = async (event) => {
  const userId = String(event.userId || "").trim();
  const query = String(event.query || "上周我说了什么").trim();

  if (!userId) {
    return {
      success: false,
      requestId: "cf_recall_invalid_user",
      error: {
        code: "INVALID_USER",
        message: "userId is required",
      },
    };
  }

  let queryMeta = {
    timeScope: "",
    keywords: [],
    memoryTypes: [],
  };
  let vectorHits = [];

  if (AI_SERVICE_BASE_URL) {
    try {
      const assist = await requestJson(`${AI_SERVICE_BASE_URL}/api/v1/recall/assist`, {
        query,
        items: [],
      });
      queryMeta = assist?.data?.queryMeta || queryMeta;
    } catch (error) {
      console.warn("recallQuery AI queryMeta fallback", error);
    }
  }

  const range = resolveRange(query, queryMeta.timeScope);
  const vectorScoreMap = buildScoreMap(vectorHits);
  if (AI_SERVICE_BASE_URL) {
    try {
      const vectorResult = await requestJson(`${AI_SERVICE_BASE_URL}/api/v1/vector/search-memories`, {
        userId,
        query,
        limit: 12,
        memoryTypes: queryMeta.memoryTypes || [],
      });
      vectorHits = vectorResult?.data?.hits || [];
    } catch (error) {
      console.warn("recallQuery vector search fallback", error);
    }
  }

  const result = await db
    .collection("memories")
    .where({
      userId,
      createdAt: _.gte(range.start).and(_.lt(range.end)),
    })
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();
  const existingIds = new Set(result.data.map((item) => item._id));
  let mergedMemories = [...result.data];

  const vectorIds = vectorHits
    .map((item) => String(item.memoryId || "").trim())
    .filter((item) => item && !existingIds.has(item));

  if (vectorIds.length) {
    const vectorResult = await db
      .collection("memories")
      .where({
        userId,
        _id: _.in(vectorIds),
      })
      .get();
    mergedMemories = mergedMemories.concat(vectorResult.data.filter((item) => withinDateRange(item, range)));
  }

  let candidateItems = mergedMemories
    .filter((item) => matchesKeywords(item, queryMeta.keywords, queryMeta.memoryTypes))
    .map((item) => ({
      memoryId: item._id,
      summary: buildDisplaySummary(item),
      timeText: formatTimeText(item.createdAt),
      sourceText: item.summary || item.contentRaw || "一条记忆",
      memoryType: item.memoryType || "daily",
      contentRaw: item.contentRaw || "",
      createdAt: item.createdAt,
      vectorScore: vectorScoreMap.get(item._id) || 0,
    }));

  if (!candidateItems.length && vectorHits.length) {
    candidateItems = mergedMemories
      .filter((item) => vectorScoreMap.has(item._id))
      .map((item) => ({
        memoryId: item._id,
        summary: buildDisplaySummary(item),
        timeText: formatTimeText(item.createdAt),
        sourceText: item.summary || item.contentRaw || "一条记忆",
        memoryType: item.memoryType || "daily",
        contentRaw: item.contentRaw || "",
        createdAt: item.createdAt,
        vectorScore: vectorScoreMap.get(item._id) || 0,
      }));
  }

  candidateItems = rankCandidateItems(candidateItems, vectorScoreMap, queryMeta);

  let items = candidateItems;
  let summary =
    candidateItems.length > 0
      ? `${range.label}你记录了 ${candidateItems.length} 件相关的事。`
      : `${range.label}你还没有找到相关记录。`;

  if (AI_SERVICE_BASE_URL && candidateItems.length > 0) {
    try {
      const assist = await requestJson(`${AI_SERVICE_BASE_URL}/api/v1/recall/assist`, {
        query,
        items: candidateItems,
      });
      const selectedIds = assist?.data?.selectedMemoryIds || [];
      const selectedSet = new Set(selectedIds);
      const rankedItems = selectedIds.length
        ? candidateItems
            .filter((item) => selectedSet.has(item.memoryId))
            .sort((a, b) => selectedIds.indexOf(a.memoryId) - selectedIds.indexOf(b.memoryId))
        : candidateItems;
      items = rankedItems.map((item) => ({
        memoryId: item.memoryId,
        summary: item.summary,
        timeText: item.timeText,
        sourceText: item.sourceText,
      }));
      summary = assist?.data?.summary || summary;
    } catch (error) {
      console.warn("recallQuery AI summary fallback", error);
      items = candidateItems.map((item) => ({
        memoryId: item.memoryId,
        summary: item.summary,
        timeText: item.timeText,
        sourceText: item.sourceText,
      }));
    }
  } else {
    items = candidateItems.map((item) => ({
      memoryId: item.memoryId,
      summary: item.summary,
      timeText: item.timeText,
      sourceText: item.sourceText,
    }));
  }

  return {
    success: true,
    requestId: "cf_recall_001",
    data: {
      summary,
      items,
      replyAudioFileId: "",
    },
  };
};
