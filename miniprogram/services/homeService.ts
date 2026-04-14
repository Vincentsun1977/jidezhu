import { homeSummaryMock } from "./mock";

type HomeSummaryCloudResult = {
  success: boolean;
  requestId: string;
  data: {
    greeting?: string;
    greetingText?: string;
    todayReminderCount: number;
    todayReminderSummary?: string;
    todayImportantMemories?: string[];
    promptText?: string;
    replyAudioFileId?: string;
  };
};

export async function getHomeSummary() {
  try {
    const result = await wx.cloud.callFunction<HomeSummaryCloudResult>({
      name: "getHomeSummary",
      data: {
        userId: getApp<IAppOption>().globalData.userProfile?.userId || "",
      },
    });

    const data = result.result?.data;
    if (!data) {
      return homeSummaryMock;
    }

    const recentImportantMemories =
      data.todayImportantMemories?.map((summary, index) => ({
        id: `cloud_mem_${index}`,
        summary,
        timeText: "今天",
      })) || homeSummaryMock.recentImportantMemories;

    return {
      greetingText: data.greetingText || data.greeting || homeSummaryMock.greetingText,
      todayReminderCount: data.todayReminderCount ?? homeSummaryMock.todayReminderCount,
      todayReminderSummary: data.todayReminderSummary || homeSummaryMock.todayReminderSummary,
      promptText: data.promptText || homeSummaryMock.promptText,
      recentImportantMemories,
    };
  } catch (error) {
    console.warn("getHomeSummary fallback to mock", error);
    return homeSummaryMock;
  }
}
