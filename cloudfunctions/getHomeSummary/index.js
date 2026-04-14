const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) return "夜深了";
  if (hour < 12) return "早上好";
  if (hour < 18) return "下午好";
  return "晚上好";
}

function getTodayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

exports.main = async (event) => {
  const userId = String(event.userId || "").trim();
  const { start, end } = getTodayRange();

  const reminderQuery = userId
    ? {
        userId,
        status: "pending",
        triggerAt: _.gte(start).and(_.lt(end)),
      }
    : {
        status: "pending",
        triggerAt: _.gte(start).and(_.lt(end)),
      };

  const memoryQuery = userId ? { userId } : {};

  const [reminderResult, memoryResult] = await Promise.all([
    db.collection("reminders").where(reminderQuery).limit(10).get(),
    db.collection("memories").where(memoryQuery).orderBy("createdAt", "desc").limit(3).get(),
  ]);

  const todayReminderCount = reminderResult.data.length;
  const reminderSummary =
    todayReminderCount > 0
      ? `今天有 ${todayReminderCount} 条提醒。`
      : "今天暂时没有新的提醒。";

  const todayImportantMemories = memoryResult.data.map((item) => item.summary).filter(Boolean);

  return {
    success: true,
    requestId: "cf_home_001",
    data: {
      greeting: getGreeting(),
      todayReminderCount,
      todayReminderSummary: reminderSummary,
      todayImportantMemories,
      promptText:
        todayReminderCount > 0
          ? `今天有 ${todayReminderCount} 条提醒，要不要我读给你听？`
          : "今天还没有提醒，我可以继续帮你记事情。",
    },
  };
};
