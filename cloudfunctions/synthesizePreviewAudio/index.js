const https = require("https");

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
  const text = String(event.text || "").trim();

  if (!text) {
    return {
      success: false,
      requestId: "cf_synthesize_preview_invalid",
      error: {
        code: "INVALID_TEXT",
        message: "text is required",
      },
    };
  }

  if (!AI_SERVICE_BASE_URL) {
    return {
      success: false,
      requestId: "cf_synthesize_preview_no_base_url",
      error: {
        code: "MISSING_AI_SERVICE_BASE_URL",
        message: "AI_SERVICE_BASE_URL is empty",
      },
    };
  }

  try {
    const result = await requestJson(`${AI_SERVICE_BASE_URL}/api/v1/tts/synthesize`, { text });
    return {
      success: Boolean(result?.data?.audioFileId),
      requestId: "cf_synthesize_preview_001",
      data: result?.data || null,
      error:
        result?.data?.audioFileId
          ? undefined
          : {
              code: "EMPTY_AUDIO_FILE",
              message: "TTS returned no audio url",
            },
    };
  } catch (error) {
    return {
      success: false,
      requestId: "cf_synthesize_preview_failed",
      error: {
        code: "TTS_REQUEST_FAILED",
        message: String(error && error.message ? error.message : error),
      },
    };
  }
};
