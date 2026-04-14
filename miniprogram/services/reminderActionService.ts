export async function createReminder(payload: {
  userId: string;
  title: string;
  triggerAt: string;
  memoryId?: string;
}) {
  const result = await wx.cloud.callFunction<{
    success: boolean;
    requestId: string;
    data?: {
      reminderId: string;
      title: string;
      triggerAt: string;
      status: string;
    };
  }>({
    name: "createReminder",
    data: payload,
  });

  return result.result || null;
}

export async function updateReminderAction(payload: {
  userId: string;
  reminderId: string;
  action: "done" | "snooze_30m" | "snooze_tomorrow";
}) {
  const result = await wx.cloud.callFunction<{
    success: boolean;
    requestId: string;
    data?: {
      reminderId: string;
      action: string;
      status: string;
      triggerAt: string;
    };
  }>({
    name: "updateReminderAction",
    data: payload,
  });

  return result.result || null;
}
