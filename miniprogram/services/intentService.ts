const RECALL_PATTERNS = [
  /我上次/,
  /我之前/,
  /我最近说过/,
  /我记过/,
  /我提到过/,
  /我去过哪个/,
  /哪个医院/,
  /什么会议/,
  /哪天/,
  /哪一天/,
  /哪一节/,
  /哪次/,
  /什么时候/,
  /来着/,
  /记得.*吗/,
  /有没有提过/,
  /找回忆/,
  /帮我找/,
  /帮我查/,
];

function normalizeText(text: string) {
  return String(text || "").trim().replace(/[。！？!?,，]/g, "");
}

export function detectVoiceIntent(text: string) {
  const normalizedText = normalizeText(text);

  if (!normalizedText) {
    return {
      intent: "unknown",
      reason: "empty",
    };
  }

  const recallMatched = RECALL_PATTERNS.some((pattern) => pattern.test(normalizedText));
  if (recallMatched) {
    return {
      intent: "memory_recall",
      reason: "recall_rule",
      text: normalizedText,
    };
  }

  return {
    intent: "memory_create",
    reason: "default_memory_create",
    text: normalizedText,
  };
}
