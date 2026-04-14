import { setSettings } from "../stores/settingsStore";

type SettingsPayload = {
  userId: string;
  seniorMode: boolean;
  fontScale: "medium" | "large" | "xlarge";
  voiceReplyEnabled: boolean;
  ttsSpeed: number;
  dailyDigestTime: string;
};

export async function saveUserSettings(payload: SettingsPayload) {
  const result = await wx.cloud.callFunction<{
    success: boolean;
    data?: SettingsPayload;
  }>({
    name: "updateUserSettings",
    data: payload,
  });

  if (result.result?.success && result.result.data) {
    return setSettings(result.result.data);
  }

  throw new Error("save settings failed");
}
