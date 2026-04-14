import { appEnv } from "../config/env";
import { voiceUploadMock } from "./mock";

export function uploadVoiceFile(tempFilePath, durationMs) {
  const userProfile = getApp().globalData.userProfile;

  if (wx.cloud && userProfile && userProfile.userId) {
    const cloudPath = `audio/${userProfile.userId}/${Date.now()}.mp3`;
    return wx.cloud
      .uploadFile({
      cloudPath,
      filePath: tempFilePath,
      config: {
        env: appEnv.cloudbaseEnvId,
      },
      })
      .then((result) => ({
        fileId: result.fileID,
      }));
  }

  if (appEnv.mode === "mock") {
    return Promise.resolve({
      ...voiceUploadMock,
      tempFilePath,
      durationMs,
    });
  }

  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${appEnv.apiBaseUrl}/api/v1/voice/upload`,
      filePath: tempFilePath,
      name: "file",
      formData: { durationMs },
      success: (response) => {
        const result = JSON.parse(response.data);
        resolve(result.data || result);
      },
      fail: reject,
    });
  });
}
