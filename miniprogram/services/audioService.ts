let innerAudioContext: WechatMiniprogram.InnerAudioContext | null = null;
const audioCache: Record<string, string> = {};

function getPlayer() {
  if (!innerAudioContext) {
    innerAudioContext = wx.createInnerAudioContext();
    innerAudioContext.obeyMuteSwitch = false;
  }
  return innerAudioContext;
}

function normalizeAudioUrl(url?: string) {
  if (!url) {
    return "";
  }

  if (url.startsWith("http://")) {
    return `https://${url.slice("http://".length)}`;
  }

  return url;
}

function resolvePlayableSource(audioFileId?: string) {
  const normalized = normalizeAudioUrl(audioFileId);

  if (!normalized || normalized.startsWith("mock://")) {
    return Promise.resolve("");
  }

  if (!/^https?:\/\//.test(normalized)) {
    return Promise.resolve(normalized);
  }

  if (audioCache[normalized]) {
    return Promise.resolve(audioCache[normalized]);
  }

  return new Promise<string>((resolve, reject) => {
    wx.downloadFile({
      url: normalized,
      success: (result) => {
        if (result.statusCode >= 200 && result.statusCode < 300 && result.tempFilePath) {
          audioCache[normalized] = result.tempFilePath;
          resolve(result.tempFilePath);
        } else {
          reject(new Error(`audio download failed: ${result.statusCode}`));
        }
      },
      fail: reject,
    });
  });
}

export function playReplyAudio(audioFileId?: string, fallbackText?: string) {
  if (!audioFileId || audioFileId.startsWith("mock://")) {
    if (fallbackText) {
      wx.showToast({
        title: "已准备确认播报",
        icon: "none",
      });
    }
    return Promise.resolve({ simulated: true });
  }

  const player = getPlayer();
  return resolvePlayableSource(audioFileId).then((playableSource) => {
    player.src = playableSource || normalizeAudioUrl(audioFileId);

    return new Promise<{ simulated: boolean }>((resolve, reject) => {
      const handleEnded = () => {
        player.offEnded(handleEnded);
        player.offError(handleError);
        resolve({ simulated: false });
      };

      const handleError = () => {
        player.offEnded(handleEnded);
        player.offError(handleError);
        reject(new Error("audio playback failed"));
      };

      player.onEnded(handleEnded);
      player.onError(handleError);
      player.play();
    });
  });
}

export function stopReplyAudio() {
  if (innerAudioContext) {
    innerAudioContext.stop();
  }
}
