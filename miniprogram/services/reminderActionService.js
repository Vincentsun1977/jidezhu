export async function createReminder(payload) {
  const result = await wx.cloud.callFunction({
    name: "createReminder",
    data: payload,
  });

  return result.result || null;
}

export async function updateReminderAction(payload) {
  const result = await wx.cloud.callFunction({
    name: "updateReminderAction",
    data: payload,
  });

  return result.result || null;
}
