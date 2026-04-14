interface IAppOption {
  globalData: {
    env: "mock" | "live";
    userProfile:
      | {
          openid: string;
        userId: string;
        nickname: string;
        seniorMode: boolean;
        fontScale?: "medium" | "large" | "xlarge";
        voiceReplyEnabled?: boolean;
        ttsSpeed?: number;
        dailyDigestTime?: string;
      }
      | null;
    settings: {
      seniorMode: boolean;
      fontScale: "medium" | "large" | "xlarge";
      voiceReplyEnabled: boolean;
      ttsSpeed: number;
      dailyDigestTime?: string;
    };
  };
}
