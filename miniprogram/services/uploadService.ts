import { appEnv } from "../config/env";
import { voiceUploadMock } from "./mock";

type UploadResult = {
  fileId: string;
};

type UploadEnvelope = {
  success: boolean;
  requestId: string;
  data: UploadResult;
};

export function uploadVoiceFile(tempFilePath: string, durationMs: number) {
  const userProfile = getApp<IAppOption>().globalData.userProfile;

  if (wx.cloud && userProfile?.userId) {
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
    } as UploadResult & { tempFilePath: string; durationMs: number });
  }

  return new Promise<UploadResult>((resolve, reject) => {
    wx.uploadFile({
      url: `${appEnv.apiBaseUrl}/api/v1/voice/upload`,
      filePath: tempFilePath,
      name: "file",
      formData: {
        durationMs,
      },
      success: (response) => {
        const result = JSON.parse(response.data) as UploadEnvelope | UploadResult;
        resolve("data" in result ? result.data : result);
      },
      fail: reject,
    });
  });
}
