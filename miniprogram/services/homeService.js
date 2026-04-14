import { homeSummaryMock } from "./mock";

export async function getHomeSummary() {
  try {
    const result = await wx.cloud.callFunction({
      name: "getHomeSummary",
      data: {
        userId: (getApp().globalData.userProfile && getApp().globalData.userProfile.userId) || "",
      },
    });

    const data = result.result && result.result.data;
    if (!data) {
      return homeSummaryMock;
    }

    const recentImportantMemories =
      (data.todayImportantMemories || []).map((summary, index) => ({
        id: `cloud_mem_${index}`,
        summary,
        timeText: "今天",
      })) || homeSummaryMock.recentImportantMemories;

    return {
      greetingText: data.greetingText || data.greeting || homeSummaryMock.greetingText,
      todayReminderCount:
        typeof data.todayReminderCount === "number"
          ? data.todayReminderCount
          : homeSummaryMock.todayReminderCount,
      todayReminderSummary: data.todayReminderSummary || homeSummaryMock.todayReminderSummary,
      promptText: data.promptText || homeSummaryMock.promptText,
      recentImportantMemories:
        recentImportantMemories.length > 0 ? recentImportantMemories : homeSummaryMock.recentImportantMemories,
    };
  } catch (error) {
    console.warn("getHomeSummary fallback to mock", error);
    return homeSummaryMock;
  }
}
