import { deleteMemory } from "../../services/memoryService";
import { recallQuery, synthesizePreviewAudio, transcribeVoiceQuery } from "../../services/recallQueryService";
import { playReplyAudio, stopReplyAudio } from "../../services/audioService";
import { cancelRecording, startRecording, stopRecording } from "../../services/recorderService";
import { uploadVoiceFile } from "../../services/uploadService";

const PRESET_QUERY_MAP = {
  today: "今天我记了什么",
  yesterday: "昨天我记了什么",
  last3days: "最近三天我记了什么",
  lastWeek: "上周我说了什么",
  thisMonth: "本月我记了什么",
  important: "最近我记了什么",
};

Page({
  data: {
    summaryText: "",
    items: [],
    activePreset: "lastWeek",
    presetOptions: [
      { key: "today", label: "今天" },
      { key: "yesterday", label: "昨天" },
      { key: "last3days", label: "最近三天" },
      { key: "lastWeek", label: "上周" },
      { key: "thisMonth", label: "本月" },
    ],
    loading: false,
    errorMessage: "",
    playingMemoryId: "",
    queryRecordingState: "idle",
    queryHint: "想找哪段回忆，可以直接说给我听",
    quickQuestions: [
      "今天我记了什么",
      "上周我说了什么",
      "我去过哪个医院",
      "我提到过什么会议",
      "最近和吃药有关的内容",
    ],
  },
  async onLoad(options) {
    const query = decodeURIComponent(options.query || "");
    if (query) {
      this.setData({
        queryHint: `正在帮您找：${query}`,
      });
      await this.runQueryText(query);
      return;
    }

    const preset = options.preset || "lastWeek";
    await this.runPresetQuery(preset);
  },
  async runPresetQuery(preset) {
    const query = PRESET_QUERY_MAP[preset] || PRESET_QUERY_MAP.lastWeek;
    this.setData({
      activePreset: preset,
      loading: true,
      errorMessage: "",
    });
    try {
      const result = await recallQuery(query);
      this.setData({
        ...result,
        loading: false,
      });
    } catch (error) {
      console.error(error);
      this.setData({
        summaryText: "",
        items: [],
        loading: false,
        errorMessage: "回忆内容加载失败，请稍后再试",
      });
    }
  },
  async handlePresetTap(event) {
    const { preset } = event.currentTarget.dataset;
    await this.runPresetQuery(preset);
  },
  async onQueryRecordStart() {
    if (!["idle", "error"].includes(this.data.queryRecordingState)) {
      return;
    }

    try {
      await startRecording();
      this.setData({
        queryRecordingState: "recording",
        queryHint: "正在听您说要找什么",
      });
    } catch (error) {
      console.error(error);
      this.setData({
        queryRecordingState: "error",
        queryHint: "没有听清楚，请再试一次",
      });
    }
  },
  async onQueryRecordEnd() {
    if (this.data.queryRecordingState !== "recording") {
      return;
    }

    const userProfile = getApp().globalData.userProfile;
    if (!userProfile || !userProfile.userId) {
      wx.showToast({
        title: "还没拿到用户信息",
        icon: "none",
      });
      return;
    }

    try {
      this.setData({
        queryRecordingState: "uploading",
        queryHint: "正在整理这段找回忆的话",
      });
      const recordResult = await stopRecording();
      const uploadResult = await uploadVoiceFile(recordResult.tempFilePath, recordResult.duration);
      const queryResult = await transcribeVoiceQuery({
        fileId: uploadResult.fileId,
        userId: userProfile.userId,
      });
      const queryText = queryResult?.data?.queryText || "";

      if (!queryText) {
        throw new Error("empty query text");
      }

      this.setData({
        queryRecordingState: "idle",
        queryHint: `正在帮您找：${queryText}`,
      });
      await this.runQueryText(queryText);
    } catch (error) {
      console.error(error);
      this.setData({
        queryRecordingState: "error",
        queryHint: "这次没找到，请换一句再试试",
      });
    }
  },
  onQueryRecordCancel() {
    cancelRecording();
    this.setData({
      queryRecordingState: "idle",
      queryHint: "已取消语音找回忆",
    });
  },
  async runQueryText(query) {
    this.setData({
      loading: true,
      errorMessage: "",
    });
    try {
      const result = await recallQuery(query);
      this.setData({
        ...result,
        loading: false,
      });
    } catch (error) {
      console.error(error);
      this.setData({
        summaryText: "",
        items: [],
        loading: false,
        errorMessage: "回忆内容加载失败，请稍后再试",
      });
    }
  },
  async handleQuickQuestion(event) {
    const { question } = event.currentTarget.dataset;
    this.setData({
      queryHint: `正在帮您找：${question}`,
    });
    await this.runQueryText(question);
  },
  async handleDeleteMemory(event) {
    const { memoryId } = event.currentTarget.dataset;
    const userProfile = getApp().globalData.userProfile;

    if (!userProfile || !userProfile.userId) {
      wx.showToast({
        title: "还没拿到用户信息",
        icon: "none",
      });
      return;
    }

    const confirm = await wx.showModal({
      title: "删除这条记忆",
      content: "删除后将同时移除相关提醒。",
      confirmColor: "#b64d2e",
    });

    if (!confirm.confirm) {
      return;
    }

    try {
      const result = await deleteMemory({
        userId: userProfile.userId,
        memoryId,
      });

      if (result && result.success) {
        wx.showToast({
          title: "已删除",
          icon: "success",
        });
        await this.runPresetQuery(this.data.activePreset);
      } else {
        wx.showToast({
          title: "删除失败",
          icon: "none",
        });
      }
    } catch (error) {
      console.error(error);
      wx.showToast({
        title: "删除失败",
        icon: "none",
      });
    }
  },
  async handlePlayMemory(event) {
    const { text, memoryId } = event.currentTarget.dataset;

    try {
      this.setData({
        playingMemoryId: memoryId,
      });
      const result = await synthesizePreviewAudio(text);
      const audioFileId = result?.data?.audioFileId || "";
      await playReplyAudio(audioFileId, text);
    } catch (error) {
      console.error(error);
      wx.showToast({
        title: "播报失败，请稍后再试",
        icon: "none",
      });
    } finally {
      this.setData({
        playingMemoryId: "",
      });
    }
  },
  onHide() {
    stopReplyAudio();
    this.setData({
      playingMemoryId: "",
    });
  },
});
