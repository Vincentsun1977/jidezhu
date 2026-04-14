import { setSettings } from "../stores/settingsStore";

export async function saveUserSettings(payload) {
  const result = await wx.cloud.callFunction({
    name: "updateUserSettings",
    data: payload,
  });

  if (result.result && result.result.success && result.result.data) {
    return setSettings(result.result.data);
  }

  throw new Error("save settings failed");
}
