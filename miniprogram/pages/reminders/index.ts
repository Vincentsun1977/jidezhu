import { updateReminderAction } from "../../services/reminderActionService";
import { getReminderGroups } from "../../services/reminderService";

Page({
  data: {
    dueNow: [] as Array<{ id: string; title: string; timeText: string }>,
    laterToday: [] as Array<{ id: string; title: string; timeText: string }>,
    upcoming: [] as Array<{ id: string; title: string; timeText: string }>,
    loading: false,
    errorMessage: "",
  },
  async onShow() {
    await this.loadReminderGroups();
  },
  async loadReminderGroups() {
    this.setData({ loading: true, errorMessage: "" });
    try {
      const result = await getReminderGroups();
      this.setData({
        ...result,
        loading: false,
      });
    } catch (error) {
      console.error(error);
      this.setData({
        dueNow: [],
        laterToday: [],
        upcoming: [],
        loading: false,
        errorMessage: "提醒加载失败，请稍后再试",
      });
    }
  },
  async handleAction(
    event: WechatMiniprogram.BaseEvent & {
      currentTarget: {
        dataset: {
          reminderId: string;
          action: "done" | "snooze_30m";
        };
      };
    }
  ) {
    const { reminderId, action } = event.currentTarget.dataset;
    const userProfile = getApp<IAppOption>().globalData.userProfile;

    if (!userProfile?.userId) {
      wx.showToast({
        title: "还没拿到用户信息",
        icon: "none",
      });
      return;
    }

    try {
      const result = await updateReminderAction({
        userId: userProfile.userId,
        reminderId,
        action,
      });

      if (result?.success) {
        wx.showToast({
          title: action === "done" ? "已完成" : "已稍后提醒",
          icon: "success",
        });
        await this.loadReminderGroups();
      } else {
        wx.showToast({
          title: "操作失败",
          icon: "none",
        });
      }
    } catch (error) {
      console.error(error);
      wx.showToast({
        title: "操作失败",
        icon: "none",
      });
    }
  },
});
