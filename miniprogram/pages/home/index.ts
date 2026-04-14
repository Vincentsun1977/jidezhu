import { QUICK_ACTIONS } from "../../constants/ui";
import { playReplyAudio, stopReplyAudio } from "../../services/audioService";
import { getHomeSummary } from "../../services/homeService";
import {
  createMemoryFromText,
  createMemoryFromVoice,
  generateVoiceReplyAudio,
} from "../../services/memoryService";
import { cancelRecording, startRecording, stopRecording } from "../../services/recorderService";
import { synthesizePreviewAudio, transcribeVoiceQuery } from "../../services/recallQueryService";
import { createReminder } from "../../services/reminderActionService";
import { uploadVoiceFile } from "../../services/uploadService";

Page({
  data: {
    greetingText: "",
    todayReminderCount: 0,
    todayReminderSummary: "",
    promptText: "",
    quickActions: QUICK_ACTIONS,
    recentImportantMemories: [] as Array<{ id: string; summary: string; timeText: string }>,
    recordingState: "idle",
    recordingStateLabel: "等待说话",
    playbackState: "idle",
    playbackStateLabel: "等待播报",
    replyText: "",
    replyAudioFileId: "",
    replyRequestId: "",
    textDraft: "",
    textEntryVisible: false,
    submittingText: false,
    creatingReminder: false,
    busyHint: "",
  },
  async onLoad() {
    this.syncStateLabels();
    await this.loadHomeSummary();
  },
  syncStateLabels() {
    const recordingStateMap: Record<string, string> = {
      idle: "等待说话",
      recording: "正在听您说话",
      uploading: "正在上传语音",
      processing: "正在整理内容",
      error: "这次没有记成功",
      playing: "正在播报",
      preparing: "正在准备播报",
    };
    const playbackStateMap: Record<string, string> = {
      idle: "等待播报",
      playing: "正在播报",
      preparing: "正在准备播报",
      error: "播报失败，请重试",
    };
    this.setData({
      recordingStateLabel: recordingStateMap[this.data.recordingState] || "等待说话",
      playbackStateLabel: playbackStateMap[this.data.playbackState] || "等待播报",
    });
  },
  async loadHomeSummary() {
    const summary = await getHomeSummary();
    this.setData({ ...summary });
  },
  onQuickActionTap(event: WechatMiniprogram.BaseEvent) {
    const { path } = event.currentTarget.dataset;
    if (path) {
      wx.navigateTo({ url: path });
    }
  },
  openSettings() {
    wx.navigateTo({
      url: "/pages/settings/index",
    });
  },
  openRecallPage() {
    wx.navigateTo({
      url: "/pages/recall/index",
    });
  },
  async handleListenTodaySummary() {
    const text = this.data.todayReminderSummary || this.data.promptText;
    if (!text) {
      wx.showToast({
        title: "今天暂时没有新的提醒",
        icon: "none",
      });
      return;
    }

    try {
      const result = await synthesizePreviewAudio(text);
      await playReplyAudio(result?.data?.audioFileId, text);
    } catch (error) {
      console.error(error);
      wx.showToast({
        title: "暂时读不出来，请稍后再试",
        icon: "none",
      });
    }
  },
  async onRecordStart() {
    if (!["idle", "error"].includes(this.data.recordingState)) {
      return;
    }

    try {
      await startRecording();
      this.setData({
        recordingState: "recording",
        busyHint: "正在听您说话",
      });
      this.syncStateLabels();
    } catch (error) {
      console.error(error);
      this.setData({
        recordingState: "error",
        busyHint: "录音没有成功，请再试一次",
      });
      this.syncStateLabels();
    }
  },
  async onRecordEnd() {
    if (this.data.recordingState !== "recording") {
      return;
    }

    try {
      this.setData({
        recordingState: "uploading",
        busyHint: "正在保存这段语音",
      });
      this.syncStateLabels();

      const recordResult = await stopRecording();
      console.log("voice record temp file", recordResult);
      const uploadResult = await uploadVoiceFile(recordResult.tempFilePath, recordResult.duration);
      this.setData({
        recordingState: "processing",
        busyHint: "正在听懂您是想记事情还是找回忆",
      });
      this.syncStateLabels();

      const userId = getApp<IAppOption>().globalData.userProfile?.userId || "u_mock_001";
      const queryResult = await transcribeVoiceQuery({
        fileId: uploadResult.fileId,
        userId,
      });
      const firstPassText = queryResult?.data?.queryText || "";
      const intentResult = {
        intent: queryResult?.data?.intent || "unknown",
        confidence: Number(queryResult?.data?.confidence || 0),
        reason: queryResult?.data?.reason || "",
        text: firstPassText,
      };

      const looksLikeRecallQuestion =
        /我上次|我之前|我以前|我有没有|我是不是|哪个|哪家|哪里|什么|什么时候|几点|多少|吗|呢|帮我找|帮我查|帮我想想/.test(
          intentResult.text || ""
        );

      const shouldRouteRecall =
        Boolean(intentResult.text) &&
        (
          intentResult.intent === "memory_recall" ||
          looksLikeRecallQuestion ||
          intentResult.intent === "unknown" ||
          intentResult.confidence < 0.82
        );

      const canSafelyCreateMemory =
        intentResult.intent === "memory_create" && intentResult.confidence >= 0.82 && !looksLikeRecallQuestion;

      if (shouldRouteRecall) {
        this.setData({
          recordingState: "idle",
          playbackState: "idle",
          busyHint: `我来帮您找：${intentResult.text}`,
        });
        this.syncStateLabels();
        wx.navigateTo({
          url: `/pages/recall/index?query=${encodeURIComponent(intentResult.text)}`,
        });
        return;
      }

      if (!canSafelyCreateMemory && intentResult.text) {
        this.setData({
          recordingState: "idle",
          playbackState: "idle",
          busyHint: `我先帮您找一找：${intentResult.text}`,
        });
        this.syncStateLabels();
        wx.navigateTo({
          url: `/pages/recall/index?query=${encodeURIComponent(intentResult.text)}`,
        });
        return;
      }

      const memoryResult = await createMemoryFromVoice({
        fileId: uploadResult.fileId,
        userId,
        transcript: firstPassText,
      });

      this.prependMemory(memoryResult.summary);
      this.setData({
        recordingState: "idle",
        playbackState: "idle",
        replyText: memoryResult.replyText,
        replyAudioFileId: memoryResult.replyAudioFileId || "",
        replyRequestId: memoryResult.replyRequestId || "",
        busyHint: "已经记下来了，点一下就能听确认播报",
      });
      this.syncStateLabels();
    } catch (error) {
      console.error(error);
      this.setData({
        recordingState: "error",
        playbackState: "error",
        busyHint: "这次没有记成功，请再试一次",
      });
      this.syncStateLabels();
    }
  },
  onRecordCancel() {
    cancelRecording();
    this.setData({
      recordingState: "idle",
      busyHint: "已取消录音",
    });
    this.syncStateLabels();
  },
  prependMemory(summary: string) {
    const nextList = [
      {
        id: `mem_${Date.now()}`,
        summary,
        timeText: "刚刚",
      },
      ...this.data.recentImportantMemories,
    ].slice(0, 3);

    this.setData({
      recentImportantMemories: nextList,
    });
  },
  toggleTextEntry() {
    this.setData({
      textEntryVisible: !this.data.textEntryVisible,
    });
  },
  onTextInput(event: WechatMiniprogram.CustomEvent<{ value: string }>) {
    this.setData({
      textDraft: event.detail.value,
    });
  },
  async submitTextMemory() {
    if (!this.data.textDraft.trim() || this.data.submittingText) {
      return;
    }

    this.setData({
      submittingText: true,
      busyHint: "正在帮您记下来",
    });

    try {
      const result = await createMemoryFromText({
        userId: getApp<IAppOption>().globalData.userProfile?.userId || "u_mock_001",
        text: this.data.textDraft.trim(),
      });

      this.prependMemory(result.summary);
      this.setData({
        textDraft: "",
        textEntryVisible: false,
        submittingText: false,
        replyText: result.replyText,
        replyAudioFileId: result.replyAudioFileId || "",
        playbackState: "idle",
        busyHint: "已经帮您记好了，点一下就能听确认播报",
      });
      this.syncStateLabels();
    } catch (error) {
      console.error(error);
      this.setData({
        submittingText: false,
        playbackState: "error",
        busyHint: "文字保存失败，请稍后再试",
      });
      this.syncStateLabels();
    }
  },
  async createQuickReminder() {
    if (this.data.creatingReminder) {
      return;
    }

    const userProfile = getApp<IAppOption>().globalData.userProfile;
    if (!userProfile?.userId) {
      wx.showToast({
        title: "还没拿到用户信息",
        icon: "none",
      });
      return;
    }

    this.setData({
      creatingReminder: true,
      busyHint: "正在创建提醒",
    });

    try {
      const oneHourLater = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const result = await createReminder({
        userId: userProfile.userId,
        title: "记得稍后看看今天的重要事情",
        triggerAt: oneHourLater,
      });

      if (result?.success) {
        wx.showToast({
          title: "提醒已创建",
          icon: "success",
        });
        await this.loadHomeSummary();
      } else {
        wx.showToast({
          title: "提醒创建失败",
          icon: "none",
        });
      }
    } catch (error) {
      console.error(error);
      wx.showToast({
        title: "提醒创建失败",
        icon: "none",
      });
    } finally {
      this.setData({
        creatingReminder: false,
        busyHint: "可以继续帮您记事情",
      });
    }
  },
  async onReplayReply() {
    if (!this.data.replyText) {
      return;
    }

    try {
      const audioFileId = await this.ensureReplyAudio();
      this.setData({
        playbackState: audioFileId ? "playing" : "idle",
        replyAudioFileId: audioFileId || this.data.replyAudioFileId,
      });
      this.syncStateLabels();
      await playReplyAudio(audioFileId || this.data.replyAudioFileId, this.data.replyText);
      this.setData({ playbackState: "idle" });
      this.syncStateLabels();
    } catch (error) {
      console.error(error);
      this.setData({ playbackState: "error" });
      this.syncStateLabels();
    }
  },
  async playReplyFlow(memoryResult: {
    replyText: string;
    replyAudioFileId?: string;
    replyRequestId?: string;
  }) {
    try {
      const audioFileId = await this.ensureReplyAudio(memoryResult);
      this.setData({
        playbackState: audioFileId ? "playing" : "idle",
        replyAudioFileId: audioFileId || memoryResult.replyAudioFileId || "",
        busyHint: audioFileId ? "正在读给您听" : "已经记下来了",
      });
      this.syncStateLabels();
      await playReplyAudio(audioFileId || memoryResult.replyAudioFileId, memoryResult.replyText);
      this.setData({
        playbackState: "idle",
        busyHint: "已经记下来了",
      });
      this.syncStateLabels();
    } catch (error) {
      console.error(error);
      this.setData({
        playbackState: "error",
        busyHint: "文字已经记下，播报稍后再试",
      });
      this.syncStateLabels();
    }
  },
  async ensureReplyAudio(memoryResult?: {
    replyAudioFileId?: string;
    replyRequestId?: string;
  }) {
    const currentAudioFileId = memoryResult?.replyAudioFileId || this.data.replyAudioFileId;
    const currentRequestId = memoryResult?.replyRequestId || this.data.replyRequestId;
    const userId = getApp<IAppOption>().globalData.userProfile?.userId || "u_mock_001";

    if (currentAudioFileId) {
      return currentAudioFileId;
    }

    if (!currentRequestId) {
      return "";
    }

    this.setData({
      playbackState: "preparing",
      busyHint: "正在准备确认播报",
    });
    this.syncStateLabels();

    const result = await generateVoiceReplyAudio({
      requestId: currentRequestId,
      userId,
    });

    if (result?.success && result.data?.audioFileId) {
      return result.data.audioFileId;
    }

    return "";
  },
  onStopReply() {
    stopReplyAudio();
    this.setData({ playbackState: "idle" });
    this.syncStateLabels();
  },
});
