export async function loginUser() {
  const result = await wx.cloud.callFunction({
    name: "authLogin",
  });

  return result.result?.data || null;
}
