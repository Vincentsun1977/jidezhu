const app = getApp();

export function getSettings() {
  return app.globalData.settings;
}

export function setSettings(nextSettings) {
  app.globalData.settings = {
    ...app.globalData.settings,
    ...nextSettings,
  };

  return app.globalData.settings;
}
