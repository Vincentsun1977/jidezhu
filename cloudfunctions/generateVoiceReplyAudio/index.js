const cloud = require("wx-server-sdk");
const https = require("https");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const AI_SERVICE_BASE_URL = process.env.AI_SERVICE_BASE_URL || "";
const AI_SERVICE_TOKEN = process.env.AI_SERVICE_TOKEN || "";

function trimText(value, limit = 500) {
  return String(value || "").slice(0, limit);
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

exports.main = async (event) => {
  const requestId = String(event.requestId || "").trim();
  const userId = String(event.userId || "").trim();

  if (!requestId || !userId) {
    return {
      success: false,
      requestId: "cf_generate_voice_reply_invalid",
      error: {
        code: "INVALID_PARAMS",
        message: "requestId and userId are required",
      },
    };
  }

  const replyResult = await db
    .collection("voice_replies")
    .where({
      requestId,
      userId,
    })
    .limit(1)
    .get();

  const voiceReply = replyResult.data[0];
  if (!voiceReply) {
    return {
      success: false,
      requestId: "cf_generate_voice_reply_missing",
      error: {
        code: "NOT_FOUND",
        message: "voice reply not found",
      },
    };
  }

  if (voiceReply.audioFileId) {
    return {
      success: true,
      requestId: "cf_generate_voice_reply_cached",
      data: {
        requestId,
        replyText: voiceReply.replyText,
        audioFileId: voiceReply.audioFileId,
        provider: voiceReply.provider || "cached",
      },
    };
  }

  if (!AI_SERVICE_BASE_URL) {
    return {
      success: false,
      requestId: "cf_generate_voice_reply_no_base_url",
      error: {
        code: "MISSING_AI_SERVICE_BASE_URL",
        message: "AI_SERVICE_BASE_URL is empty",
      },
    };
  }

  try {
    const ttsResult = await requestJson(`${AI_SERVICE_BASE_URL}/api/v1/tts/synthesize`, {
      text: voiceReply.replyText,
    });

    const audioFileId = ttsResult?.data?.audioFileId || "";
    const provider = ttsResult?.data?.provider || "tts_failed";
    const debug = {
      provider,
      hasAudioFileId: Boolean(audioFileId),
      audioHost: audioFileId ? new URL(audioFileId).host : "",
    };
    const now = new Date().toISOString();

    await db.collection("voice_replies").doc(voiceReply._id).update({
      data: {
        audioFileId,
        provider,
        ttsError: audioFileId ? "" : "empty_audio_file_id",
        updatedAt: now,
      },
    });

    return {
      success: Boolean(audioFileId),
      requestId: "cf_generate_voice_reply_001",
      data: {
        requestId,
        replyText: voiceReply.replyText,
        audioFileId,
        provider,
        debug,
      },
      error: audioFileId
        ? undefined
        : {
            code: "EMPTY_AUDIO_FILE",
            message: "TTS returned no audio url",
          },
    };
  } catch (error) {
    const message = trimText(error && error.message ? error.message : error, 800);
    await db.collection("voice_replies").doc(voiceReply._id).update({
      data: {
        provider: "tts_failed",
        ttsError: message,
        updatedAt: new Date().toISOString(),
      },
    });

    return {
      success: false,
      requestId: "cf_generate_voice_reply_failed",
      error: {
        code: "TTS_REQUEST_FAILED",
        message,
      },
    };
  }
};
