import { appEnv } from "../config/env";

export function request(url, method, data) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${appEnv.apiBaseUrl}${url}`,
      method,
      data,
      success: (response) => resolve(response.data),
      fail: reject,
    });
  });
}
