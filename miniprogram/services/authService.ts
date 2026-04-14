export async function loginUser() {
  const result = await wx.cloud.callFunction<{
    success: boolean;
    requestId: string;
    data?: {
      openid: string;
      userId: string;
      nickname: string;
      seniorMode: boolean;
    };
  }>({
    name: "authLogin",
  });

  return result.result?.data || null;
}
