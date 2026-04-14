let recorderManager = null;
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

  return new Promise((resolve, reject) => {
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

  return new Promise((resolve, reject) => {
    let settled = false;

    const handleStop = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve({
        tempFilePath: result.tempFilePath,
        duration: result.duration || Date.now() - recordStartAt,
      });
    };

    const handleError = (error) => {
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
