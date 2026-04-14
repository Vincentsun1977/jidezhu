const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

function toTimeText(isoString) {
  if (!isoString) {
    return "时间待定";
  }

  const date = new Date(isoString);
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hour = `${date.getHours()}`.padStart(2, "0");
  const minute = `${date.getMinutes()}`.padStart(2, "0");
  return `${month}-${day} ${hour}:${minute}`;
}

function groupReminders(reminders) {
  const now = Date.now();
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const todayEndTs = endOfToday.getTime();
  const threeDaysLater = now + 3 * 24 * 60 * 60 * 1000;

  const groups = {
    dueNow: [],
    laterToday: [],
    upcoming: [],
  };

  reminders.forEach((item) => {
    const triggerTs = new Date(item.triggerAt).getTime();
    const normalized = {
      reminderId: item._id,
      title: item.title,
      timeText: triggerTs <= now ? "现在" : toTimeText(item.triggerAt),
      status: item.status,
      voiceText: item.voiceText || item.title,
      canPlay: true,
    };

    if (triggerTs <= now) {
      groups.dueNow.push(normalized);
    } else if (triggerTs <= todayEndTs) {
      groups.laterToday.push(normalized);
    } else if (triggerTs <= threeDaysLater) {
      groups.upcoming.push(normalized);
    }
  });

  return groups;
}

exports.main = async (event) => {
  const userId = String(event.userId || "").trim();

  if (!userId) {
    return {
      success: false,
      requestId: "cf_reminder_groups_invalid_user",
      error: {
        code: "INVALID_USER",
        message: "userId is required",
      },
    };
  }

  const result = await db
    .collection("reminders")
    .where({
      userId,
      status: _.in(["pending", "snoozed"]),
    })
    .orderBy("triggerAt", "asc")
    .limit(50)
    .get();

  return {
    success: true,
    requestId: "cf_reminder_groups_001",
    data: groupReminders(result.data),
  };
};
