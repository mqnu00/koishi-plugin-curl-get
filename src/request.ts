import axios from "axios";
import { URL } from "url";

export type ExecuteResult = string | { status: string; headers?: string; body?: string };

export interface RequestConfig {
  userAgent: string;
  cookies: string;
  successMessage: string;
  errorMessage: string;
  showUrl: boolean;
  split?: boolean;
}

export interface RequestOptions {
  headers?: string;
  cookies?: string;
  timeout?: number;
  follow?: boolean;
  maxRedirects?: number;
  verbose?: boolean;
  responseHeaders?: boolean;
  responseBody?: string | number;
}

export async function executeRequest(
  url: string,
  options: RequestOptions,
  customConfig: RequestConfig,
  defaultHeaders: Record<string, string>,
  defaultTimeout: number,
  defaultMaxRedirects: number,
): Promise<ExecuteResult> {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "http://" + url;
  }

  try {
    new URL(url);

    const headers: Record<string, string> = { ...defaultHeaders };

    if (customConfig.userAgent) {
      headers["User-Agent"] = customConfig.userAgent;
    }

    if (options.headers) {
      options.headers.split(";").forEach((header: string) => {
        const [key, value] = header.split(":").map((s: string) => s.trim());
        if (key && value) headers[key] = value;
      });
    }

    let cookies = customConfig.cookies || "";
    if (options.cookies) {
      cookies = cookies ? `${cookies}; ${options.cookies}` : options.cookies;
    }

    if (cookies) {
      headers["Cookie"] = cookies;
    }

    const startTime = Date.now();

    const requestConfig = {
      method: "GET" as const,
      url,
      headers,
      timeout: options.timeout || defaultTimeout || 30000,
      maxRedirects: options.follow
        ? options.maxRedirects || defaultMaxRedirects
        : 0,
      validateStatus: null,
    };

    const response = await axios(requestConfig);
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    let result = "";

    if (options.verbose || options.responseHeaders || options.responseBody) {
      const showHeaders = options.verbose || options.responseHeaders;
      const showBody = options.verbose || options.responseBody;
      const useSplit = customConfig.split;
      let statusText = "";
      let headersText = "";
      let bodyText = "";
      const bodyLength = Number(options.responseBody) || 500;

      if (customConfig.showUrl) {
        statusText += `请求 URL: ${url}\n`;
      }
      statusText += `状态码: ${response.status} ${response.statusText || ""}\n`;
      statusText += `响应时间: ${responseTime}ms`;

      if (showHeaders) {
        headersText = "响应头:\n";
        for (const [key, value] of Object.entries(response.headers)) {
          headersText += `${key}: ${value}\n`;
        }
      }

      if (showBody) {
        const contentType = String(response.headers["content-type"] || "");
        if (contentType.includes("text") || contentType.includes("json") || contentType.includes("javascript")) {
          let responseText = typeof response.data === "string"
            ? response.data
            : JSON.stringify(response.data, null, 2);
          if (bodyLength !== -1 && responseText.length > bodyLength) {
            responseText = responseText.substring(0, bodyLength) + "...";
          }
          bodyText = responseText;
        } else {
          bodyText = `[二进制数据 - ${contentType}]`;
        }
      }

      if (useSplit) {
        return { status: statusText, headers: showHeaders ? headersText : undefined, body: showBody ? bodyText : undefined };
      }

      result = statusText + "\n";
      if (showHeaders) result += "\n" + headersText + "\n";
      if (showBody) {
        result += bodyLength === -1 ? "响应体:\n" : `响应体预览 (前${bodyLength}字符):\n`;
        result += bodyText;
      }
    } else {
      if (response.status < 400) {
        if (customConfig.successMessage) {
          let message = customConfig.successMessage;
          if (customConfig.showUrl) {
            message = message.replace("{url}", url);
          } else {
            message = message.replace("{url}", "").replace("访问成功: \n", "访问成功\n");
          }
          result = message
            .replace("{status}", response.status.toString())
            .replace("{statusText}", response.statusText || "")
            .replace("{time}", responseTime.toString());
        } else {
          result = customConfig.showUrl
            ? `访问成功: ${url}\n状态码: ${response.status} ${response.statusText || ""}\n响应时间: ${responseTime}ms`
            : `访问成功\n状态码: ${response.status} ${response.statusText || ""}\n响应时间: ${responseTime}ms`;
        }
      } else {
        if (customConfig.errorMessage) {
          let message = customConfig.errorMessage;
          if (customConfig.showUrl) {
            message = message.replace("{url}", url);
          } else {
            message = message.replace("{url}", "").replace("访问失败: \n", "访问失败\n");
          }
          result = message
            .replace("{status}", response.status.toString())
            .replace("{statusText}", response.statusText || "")
            .replace("{time}", responseTime.toString())
            .replace("{error}", `状态码 ${response.status}`);
        } else {
          result = customConfig.showUrl
            ? `请求返回错误: ${url}\n状态码: ${response.status} ${response.statusText || ""}\n响应时间: ${responseTime}ms`
            : `请求返回错误\n状态码: ${response.status} ${response.statusText || ""}\n响应时间: ${responseTime}ms`;
        }
      }
    }

    return result;
  } catch (error) {
    let errorDetail = "未知错误";
    const err = error as any;
    if (err.code === "ECONNABORTED") {
      errorDetail = "请求超时";
    } else if (err.code === "ENOTFOUND") {
      errorDetail = "无法解析主机名";
    } else if (err.response) {
      errorDetail = `状态码: ${err.response.status} ${err.response.statusText || ""}`;
    } else if (err.message) {
      errorDetail = err.message;
    }

    let result = "";
    if (customConfig.errorMessage) {
      let message = customConfig.errorMessage;
      if (customConfig.showUrl) {
        message = message.replace("{url}", url);
      } else {
        message = message.replace("{url}", "").replace("访问失败: \n", "访问失败\n");
      }
      result = message.replace("{error}", errorDetail);
    } else {
      result = customConfig.showUrl
        ? `请求失败: ${url}\n${errorDetail}`
        : `请求失败\n${errorDetail}`;
    }

    return result;
  }
}
