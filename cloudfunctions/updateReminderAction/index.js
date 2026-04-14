const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

function buildNextTrigger(action) {
  const now = Date.now();
  if (action === "snooze_30m") {
    return new Date(now + 30 * 60 * 1000).toISOString();
  }
  if (action === "snooze_tomorrow") {
    return new Date(now + 24 * 60 * 60 * 1000).toISOString();
  }
  return new Date(now).toISOString();
}

exports.main = async (event) => {
  const reminderId = String(event.reminderId || "").trim();
  const action = String(event.action || "done").trim();

  if (!reminderId) {
    return {
      success: false,
      requestId: "cf_reminder_action_invalid",
      error: {
        code: "INVALID_REMINDER",
        message: "reminderId is required",
      },
    };
  }

  const status = action === "done" ? "done" : "snoozed";
  const nextTriggerAt = buildNextTrigger(action);

  await db.collection("reminders").doc(reminderId).update({
    data: {
      status,
      triggerAt: nextTriggerAt,
      updatedAt: new Date().toISOString(),
    },
  });

  await db.collection("feedback_events").add({
    data: {
      userId: String(event.userId || ""),
      targetType: "reminder",
      targetId: reminderId,
      action,
      value: action,
      createdAt: new Date().toISOString(),
    },
  });

  return {
    success: true,
    requestId: "cf_reminder_action_001",
    data: {
      reminderId,
      action,
      status,
      triggerAt: nextTriggerAt,
    },
  };
};
