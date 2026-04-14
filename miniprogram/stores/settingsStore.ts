const app = getApp<IAppOption>();

export function getSettings() {
  return app.globalData.settings;
}

export function setSettings(nextSettings: Partial<IAppOption["globalData"]["settings"]>) {
  app.globalData.settings = {
    ...app.globalData.settings,
    ...nextSettings,
  };

  return app.globalData.settings;
}
