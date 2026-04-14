import { loginUser } from "./services/authService";

App<IAppOption>({
  globalData: {
    env: "mock",
    userProfile: null,
    settings: {
      seniorMode: true,
      fontScale: "large",
      voiceReplyEnabled: true,
      ttsSpeed: 0.85,
    },
  },
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        env: "cloud1-0ghbx7okb933aa5a",
        traceUser: true,
      });
    } else {
      console.warn("当前基础库不支持云开发能力");
    }
    loginUser()
      .then((profile) => {
        if (profile) {
          this.globalData.userProfile = profile;
          this.globalData.settings = {
            ...this.globalData.settings,
            seniorMode: profile.seniorMode !== false,
            fontScale: profile.fontScale || "large",
            voiceReplyEnabled: profile.voiceReplyEnabled !== false,
            ttsSpeed: profile.ttsSpeed || 0.85,
            dailyDigestTime: profile.dailyDigestTime || "19:00",
          };
        }
      })
      .catch((error) => {
        console.warn("authLogin fallback to local mode", error);
      });
    console.log("记得住小程序已启动");
  },
});
