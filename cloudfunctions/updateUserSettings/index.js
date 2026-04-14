const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event) => {
  const userId = String(event.userId || "").trim();

  if (!userId) {
    return {
      success: false,
      requestId: "cf_update_settings_invalid_user",
      error: {
        code: "INVALID_USER",
        message: "userId is required",
      },
    };
  }

  const updates = {
    seniorMode: event.seniorMode !== false,
    fontScale: ["medium", "large", "xlarge"].includes(event.fontScale) ? event.fontScale : "large",
    voiceReplyEnabled: event.voiceReplyEnabled !== false,
    ttsSpeed: Number(event.ttsSpeed || 0.85),
    dailyDigestTime: String(event.dailyDigestTime || "19:00"),
    updatedAt: new Date().toISOString(),
  };

  await db.collection("users").doc(userId).update({
    data: updates,
  });

  return {
    success: true,
    requestId: "cf_update_settings_001",
    data: updates,
  };
};
