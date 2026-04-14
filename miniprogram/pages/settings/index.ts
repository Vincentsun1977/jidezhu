import { saveUserSettings } from "../../services/settingsService";
import { getSettings, setSettings } from "../../stores/settingsStore";

Page({
  data: {
    settings: getSettings(),
    saving: false,
    statusText: "",
    fontScaleOptions: ["medium", "large", "xlarge"],
  },
  onShow() {
    this.setData({
      settings: getSettings(),
    });
  },
  handleSwitchChange(event: WechatMiniprogram.SwitchChange) {
    const { field } = event.currentTarget.dataset as { field: string };
    const nextSettings = {
      ...this.data.settings,
      [field]: event.detail.value,
    };
    this.setData({ settings: nextSettings });
  },
  handleFontScaleChange(event: WechatMiniprogram.PickerChange) {
    const fontScale = this.data.fontScaleOptions[event.detail.value];
    this.setData({
      settings: {
        ...this.data.settings,
        fontScale,
      },
    });
  },
  handleSpeedChange(event: WechatMiniprogram.SliderChange) {
    this.setData({
      settings: {
        ...this.data.settings,
        ttsSpeed: Number(event.detail.value),
      },
    });
  },
  handleDigestTimeInput(event: WechatMiniprogram.Input) {
    this.setData({
      settings: {
        ...this.data.settings,
        dailyDigestTime: event.detail.value,
      },
    });
  },
  async handleSave() {
    const userProfile = getApp<IAppOption>().globalData.userProfile;
    if (!userProfile?.userId) {
      wx.showToast({
        title: "还没拿到用户信息",
        icon: "none",
      });
      return;
    }

    this.setData({
      saving: true,
      statusText: "正在保存设置",
    });

    try {
      const saved = await saveUserSettings({
        userId: userProfile.userId,
        ...this.data.settings,
      });
      setSettings(saved);
      this.setData({
        settings: saved,
        saving: false,
        statusText: "设置已保存",
      });
      wx.showToast({
        title: "设置已保存",
        icon: "success",
      });
    } catch (error) {
      console.error(error);
      this.setData({
        saving: false,
        statusText: "设置保存失败",
      });
      wx.showToast({
        title: "保存失败",
        icon: "none",
      });
    }
  },
});
