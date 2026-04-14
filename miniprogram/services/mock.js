export const homeSummaryMock = {
  greetingText: "晚上好",
  todayReminderCount: 2,
  todayReminderSummary: "今天有 2 条提醒，其中 1 条和吃药有关。",
  promptText: "今天有 2 条提醒，要不要我读给你听？",
  recentImportantMemories: [
    { id: "mem_001", summary: "今晚八点吃降压药", timeText: "今天 20:00" },
    { id: "mem_002", summary: "记得买牛奶和鸡蛋", timeText: "今天 18:00" },
    { id: "mem_003", summary: "下个月想去苏州旅游", timeText: "上周五下午" },
  ],
};

export const voiceUploadMock = {
  fileId: "mock://audio/uploaded-001",
};

export const memoryFromVoiceMock = {
  memoryId: "mem_001",
  summary: "晚上要吃降压药",
  memoryType: "medicine",
  needsReminder: true,
  replyText: "我记住了，你晚上要吃降压药。",
  replyAudioFileId: "mock://audio/confirm-medicine",
};

export const memoryFromTextMock = {
  memoryId: "mem_002",
  summary: "想买鸡蛋和牛奶",
  memoryType: "shopping",
  needsReminder: false,
  replyText: "我帮你记下了，你想买鸡蛋和牛奶。",
};

export const recallMock = {
  summaryText: "上周你记录了 3 件事，包括吃药、购物和旅游计划。",
  items: [
    { id: "mem_001", summary: "晚上要吃降压药", timeText: "上周二晚上" },
    { id: "mem_002", summary: "想买鸡蛋和牛奶", timeText: "上周三上午" },
    { id: "mem_003", summary: "下个月想去苏州旅游", timeText: "上周五下午" },
  ],
};

export const remindersMock = {
  dueNow: [
    { id: "rem_001", title: "晚上吃降压药", timeText: "现在", voiceText: "现在该吃降压药了" },
  ],
  laterToday: [
    { id: "rem_002", title: "记得买牛奶和鸡蛋", timeText: "今天 18:00", voiceText: "今天傍晚记得买牛奶和鸡蛋" },
  ],
  upcoming: [],
};
