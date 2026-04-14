const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event) => {
  const userId = String(event.userId || "").trim();
  const title = String(event.title || "").trim();
  const memoryId = event.memoryId || "";
  const triggerAt = event.triggerAt || new Date(Date.now() + 60 * 60 * 1000).toISOString();

  if (!userId) {
    return {
      success: false,
      requestId: "cf_reminder_invalid_user",
      error: {
        code: "INVALID_USER",
        message: "userId is required",
      },
    };
  }

  if (!title) {
    return {
      success: false,
      requestId: "cf_reminder_invalid_title",
      error: {
        code: "INVALID_TITLE",
        message: "title is required",
      },
    };
  }

  const now = new Date().toISOString();
  const createResult = await db.collection("reminders").add({
    data: {
      userId,
      memoryId,
      title,
      triggerType: "explicit_time",
      triggerAt,
      status: "pending",
      channel: "miniapp",
      voiceText: `${title}`,
      repeatRule: null,
      createdBy: "user",
      createdAt: now,
      updatedAt: now,
    },
  });

  return {
    success: true,
    requestId: "cf_reminder_001",
    data: {
      reminderId: createResult._id,
      title,
      triggerAt,
      status: "pending",
    },
  };
};
