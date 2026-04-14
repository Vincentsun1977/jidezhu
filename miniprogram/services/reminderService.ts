import { remindersMock } from "./mock";

export async function getReminderGroups() {
  try {
    const userProfile = getApp<IAppOption>().globalData.userProfile;
    if (!userProfile?.userId) {
      return remindersMock;
    }

    const result = await wx.cloud.callFunction<{
      success: boolean;
      requestId: string;
      data?: typeof remindersMock;
    }>({
      name: "getReminderGroups",
      data: {
        userId: userProfile.userId,
      },
    });

    if (result.result?.success && result.result.data) {
      return result.result.data;
    }
  } catch (error) {
    console.warn("getReminderGroups fallback to mock", error);
  }

  return remindersMock;
}
