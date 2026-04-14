type RecordResult = {
  tempFilePath: string;
  duration: number;
};

let recorderManager: WechatMiniprogram.RecorderManager | null = null;
let recordStartAt = 0;

function getRecorderManager() {
  if (!recorderManager) {
    recorderManager = wx.getRecorderManager();
  }
  return recorderManager;
}

export function startRecording() {
  const manager = getRecorderManager();
  recordStartAt = Date.now();

  return new Promise<void>((resolve, reject) => {
    try {
      manager.start({
        duration: 60000,
        format: "mp3",
      });
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

export function stopRecording() {
  const manager = getRecorderManager();

  return new Promise<RecordResult>((resolve, reject) => {
    let settled = false;

    const handleStop = (result: WechatMiniprogram.OnStopCallbackResult) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve({
        tempFilePath: result.tempFilePath,
        duration: result.duration || Date.now() - recordStartAt,
      });
    };

    const handleError = (error: WechatMiniprogram.RecorderErrorCallbackResult) => {
      if (settled) {
        return;
      }
      settled = true;
      reject(error);
    };

    manager.onStop(handleStop);
    manager.onError(handleError);
    manager.stop();
  });
}

export function cancelRecording() {
  const manager = getRecorderManager();
  manager.stop();
}
