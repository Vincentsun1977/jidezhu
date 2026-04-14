const cloud = require("wx-server-sdk");
const https = require("https");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const AI_SERVICE_BASE_URL = process.env.AI_SERVICE_BASE_URL || "";
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

exports.main = async (event) => {
  const fileId = String(event.fileId || "").trim();
  const userId = String(event.userId || "").trim();

  if (!fileId || !userId) {
    return {
      success: false,
      requestId: "cf_transcribe_voice_query_invalid",
      error: {
        code: "INVALID_PARAMS",
        message: "fileId and userId are required",
      },
    };
  }

  if (!AI_SERVICE_BASE_URL) {
    return {
      success: false,
      requestId: "cf_transcribe_voice_query_no_base_url",
      error: {
        code: "MISSING_AI_SERVICE_BASE_URL",
        message: "AI_SERVICE_BASE_URL is empty",
      },
    };
  }

  try {
    const downloadResult = await cloud.downloadFile({
      fileID: fileId,
    });
    const audioBase64 = downloadResult.fileContent.toString("base64");
    const audioFormat = fileId.split(".").pop() || "mp3";

    const result = await requestJson(`${AI_SERVICE_BASE_URL}/api/v1/voice/intent`, {
      fileId,
      userId,
      audioBase64,
      audioFormat,
    });

    const queryText = String(result?.data?.queryText || "").trim();
    return {
      success: Boolean(queryText),
      requestId: "cf_transcribe_voice_query_001",
      data: {
        queryText,
        provider: result?.data?.provider || "unknown",
        intent: result?.data?.intent || "unknown",
        confidence: result?.data?.confidence || 0,
        reason: result?.data?.reason || "",
      },
      error: queryText
        ? undefined
        : {
            code: "EMPTY_QUERY_TEXT",
            message: "No query text extracted",
          },
    };
  } catch (error) {
    return {
      success: false,
      requestId: "cf_transcribe_voice_query_failed",
      error: {
        code: "TRANSCRIBE_FAILED",
        message: String(error && error.message ? error.message : error),
      },
    };
  }
};
