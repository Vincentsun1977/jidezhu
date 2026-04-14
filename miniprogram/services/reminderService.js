import { remindersMock } from "./mock";

export async function getReminderGroups() {
  try {
    const userProfile = getApp().globalData.userProfile;
    if (!userProfile || !userProfile.userId) {
      return remindersMock;
    }

    const result = await wx.cloud.callFunction({
      name: "getReminderGroups",
      data: {
        userId: userProfile.userId,
      },
    });

    if (result.result && result.result.success && result.result.data) {
      return result.result.data;
    }
  } catch (error) {
    console.warn("getReminderGroups fallback to mock", error);
  }

  return remindersMock;
}
