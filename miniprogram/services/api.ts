import { appEnv } from "../config/env";

type RequestMethod = "GET" | "POST";

export function request<T>(url: string, method: RequestMethod, data?: Record<string, unknown>) {
  return new Promise<T>((resolve, reject) => {
    wx.request({
      url: `${appEnv.apiBaseUrl}${url}`,
      method,
      data,
      success: (response) => {
        resolve(response.data as T);
      },
      fail: (error) => {
        reject(error);
      },
    });
  });
}
