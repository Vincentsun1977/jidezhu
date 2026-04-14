HOME_SUMMARY = {
    "greeting": "晚上好",
    "todayReminderCount": 2,
    "todayReminderSummary": "今天有 2 条提醒，其中 1 条和吃药有关。",
    "todayImportantMemories": ["今晚八点吃降压药", "记得买牛奶和鸡蛋"],
    "promptText": "今天有 2 条提醒，要不要我读给你听？",
    "replyAudioFileId": "mock://audio/home-summary",
}

VOICE_MEMORY = {
    "memoryId": "mem_001",
    "summary": "晚上要吃降压药",
    "memoryType": "medicine",
    "needsReminder": True,
    "replyText": "我记住了，你晚上要吃降压药。",
    "replyAudioFileId": "mock://audio/confirm-medicine",
}

TEXT_MEMORY = {
    "memoryId": "mem_002",
    "summary": "想买鸡蛋和牛奶",
    "memoryType": "shopping",
    "needsReminder": False,
    "replyText": "我帮你记下了，你想买鸡蛋和牛奶。",
}

RECALL_RESULT = {
    "summary": "上周你记录了 3 件事，包括吃药、购物和旅游计划。",
    "items": [
        {"memoryId": "mem_001", "summary": "晚上要吃降压药", "timeText": "上周二晚上"},
        {"memoryId": "mem_002", "summary": "想买鸡蛋和牛奶", "timeText": "上周三上午"},
        {"memoryId": "mem_003", "summary": "下个月想去苏州旅游", "timeText": "上周五下午"},
    ],
    "replyAudioFileId": "mock://audio/recall-last-week",
}
