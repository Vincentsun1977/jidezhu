import { recallMock } from "./mock";

export async function recallQuery(query) {
  try {
    const userProfile = getApp().globalData.userProfile;
    if (!userProfile || !userProfile.userId) {
      return recallMock;
    }

    const result = await wx.cloud.callFunction({
      name: "recallQuery",
      data: {
        userId: userProfile.userId,
        query,
      },
    });

    if (result.result && result.result.success && result.result.data) {
      return {
        summaryText: result.result.data.summary,
        items: (result.result.data.items || []).map((item) => ({
          id: item.memoryId,
          summary: item.summary,
          timeText: item.timeText,
          sourceText: item.sourceText || item.summary,
        })),
      };
    }
  } catch (error) {
    console.warn("recallQuery fallback to mock", error);
  }

  return recallMock;
}

export async function synthesizePreviewAudio(text) {
  const result = await wx.cloud.callFunction({
    name: "synthesizePreviewAudio",
    data: { text },
  });

  return result.result || null;
}

export async function transcribeVoiceQuery(payload) {
  const result = await wx.cloud.callFunction({
    name: "transcribeVoiceQuery",
    data: payload,
  });

  return result.result || null;
}
