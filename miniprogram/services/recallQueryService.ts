import { recallMock } from "./mock";

export async function recallQuery(query: string) {
  try {
    const userProfile = getApp<IAppOption>().globalData.userProfile;
    if (!userProfile?.userId) {
      return recallMock;
    }

    const result = await wx.cloud.callFunction<{
      success: boolean;
      requestId: string;
      data?: {
        summary: string;
        items: Array<{
          memoryId: string;
          summary: string;
          timeText: string;
          sourceText?: string;
        }>;
        replyAudioFileId?: string;
      };
    }>({
      name: "recallQuery",
      data: {
        userId: userProfile.userId,
        query,
      },
    });

    if (result.result?.success && result.result.data) {
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

export async function synthesizePreviewAudio(text: string) {
  const result = await wx.cloud.callFunction<{
    success: boolean;
    data?: {
      audioFileId: string;
      provider: string;
    };
  }>({
    name: "synthesizePreviewAudio",
    data: { text },
  });

  return result.result || null;
}

export async function transcribeVoiceQuery(payload: { fileId: string; userId: string }) {
  const result = await wx.cloud.callFunction<{
    success: boolean;
    data?: {
      queryText: string;
      provider: string;
      intent?: string;
      confidence?: number;
      reason?: string;
    };
  }>({
    name: "transcribeVoiceQuery",
    data: payload,
  });

  return result.result || null;
}
