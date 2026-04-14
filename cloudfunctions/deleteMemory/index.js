const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const userId = String(event.userId || "").trim();
  const memoryId = String(event.memoryId || "").trim();

  if (!userId || !memoryId) {
    return {
      success: false,
      requestId: "cf_delete_memory_invalid",
      error: {
        code: "INVALID_PARAMS",
        message: "userId and memoryId are required",
      },
    };
  }

  const memoryResult = await db.collection("memories").doc(memoryId).get();
  const memory = memoryResult.data;

  if (!memory || memory.userId !== userId) {
    return {
      success: false,
      requestId: "cf_delete_memory_missing",
      error: {
        code: "NOT_FOUND",
        message: "memory not found",
      },
    };
  }

  await db.collection("memories").doc(memoryId).remove();

  const reminderResult = await db.collection("reminders").where({ userId, memoryId }).get();
  const reminderIds = (reminderResult.data || []).map((item) => item._id).filter(Boolean);
  if (reminderIds.length) {
    await db.collection("reminders").where({ _id: _.in(reminderIds) }).remove();
  }

  const voiceReplyResult = await db
    .collection("voice_replies")
    .where({
      userId,
      requestId: `voice_${memoryId}`,
    })
    .get();
  const voiceReplyIds = (voiceReplyResult.data || []).map((item) => item._id).filter(Boolean);
  if (voiceReplyIds.length) {
    await db.collection("voice_replies").where({ _id: _.in(voiceReplyIds) }).remove();
  }

  return {
    success: true,
    requestId: "cf_delete_memory_001",
    data: {
      memoryId,
      deletedReminderCount: reminderIds.length,
      deletedReplyCount: voiceReplyIds.length,
    },
  };
};
