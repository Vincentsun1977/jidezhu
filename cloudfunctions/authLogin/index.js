const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async () => {
  const wxContext = cloud.getWXContext();
  const usersCollection = db.collection("users");
  const openid = wxContext.OPENID;

  const existingUserResult = await usersCollection.where({ openid }).limit(1).get();
  const existingUser = existingUserResult.data[0];

  if (existingUser) {
    await usersCollection.doc(existingUser._id).update({
      data: {
        updatedAt: new Date().toISOString(),
      },
    });

    return {
      success: true,
      requestId: "cf_auth_existing",
      data: {
        openid,
        userId: existingUser._id,
        nickname: existingUser.nickname || "微信用户",
        seniorMode: existingUser.seniorMode ?? true,
        fontScale: existingUser.fontScale || "large",
        voiceReplyEnabled: existingUser.voiceReplyEnabled ?? true,
        ttsSpeed: existingUser.ttsSpeed ?? 0.85,
        dailyDigestTime: existingUser.dailyDigestTime || "19:00",
      },
    };
  }

  const now = new Date().toISOString();
  const createResult = await usersCollection.add({
    data: {
      openid,
      nickname: "微信用户",
      seniorMode: true,
      fontScale: "large",
      voiceReplyEnabled: true,
      ttsSpeed: 0.85,
      dailyDigestTime: "19:00",
      createdAt: now,
      updatedAt: now,
    },
  });

  return {
    success: true,
    requestId: "cf_auth_created",
    data: {
      openid,
      userId: createResult._id,
      nickname: "微信用户",
      seniorMode: true,
      fontScale: "large",
      voiceReplyEnabled: true,
      ttsSpeed: 0.85,
      dailyDigestTime: "19:00",
    },
  };
};
