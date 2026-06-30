import { Context, Schema } from "koishi";
import axios from "axios";
import { URL } from "url";

export const name = "curl-get";

export const inject = {
  required: [],
  optional: ["onebot"],
};

interface CustomCommand {
  name: string;
  url: string;
  userAgent: string;
  cookies: string;
  successMessage: string;
  errorMessage: string;
  showUrl: boolean;
}

export interface Config {
  defaultUserAgent: string;
  defaultCookies: string;
  timeout: number;
  followRedirects: boolean;
  maxRedirects: number;
  hideUrlInResponse: boolean;
  customCommands: CustomCommand[];
}

export const Config: Schema<Config> = Schema.object({
  defaultUserAgent: Schema.string()
    .default("Koishi-Curl/1.0")
    .description("默认 User-Agent"),
  defaultCookies: Schema.string().description("默认 Cookies"),
  timeout: Schema.number().default(10000).description("请求超时时间(毫秒)"),
  followRedirects: Schema.boolean().default(true).description("是否跟随重定向"),
  maxRedirects: Schema.number().default(5).description("最大重定向次数"),
  hideUrlInResponse: Schema.boolean()
    .default(true)
    .description("在响应消息中隐藏URL"),
  customCommands: Schema.array(
    Schema.object({
      name: Schema.string().required().description("指令名称"),
      url: Schema.string().required().description("请求的URL"),
      userAgent: Schema.string().description("自定义 User-Agent"),
      cookies: Schema.string().description("自定义 Cookies"),
      successMessage: Schema.string()
        .default("访问成功\n状态码: {status} {statusText}\n响应时间: {time}ms")
        .description("成功时的消息模板"),
      errorMessage: Schema.string()
        .default("访问失败\n错误: {error}")
        .description("失败时的消息模板"),
      showUrl: Schema.boolean().description("显示URL (覆盖全局设置)"),
    }),
  )
    .default([])
    .description("自定义指令列表"),
});

export function apply(ctx: Context, config: Config): void {
  const logger = ctx.logger("curl-get");

  console.log("curl-get 插件已加载");
  logger.info("curl-get 插件已加载，配置:", config);

  const defaultHeaders: Record<string, string> = {
    "User-Agent": config.defaultUserAgent,
  };

  ctx.command("curltest", "测试 curl-get 插件是否正常工作").action(() => {
    console.log("curltest 命令被触发");
    return "curl-get 插件工作正常！您可以使用 curl 命令发送请求。";
  });

  const cmd = ctx
    .command("curl <url:string>", "发送 HTTP 请求访问指定 URL")
    .alias("c")
    .option(
      "headers",
      '-H <headers:string> 自定义请求头 (格式: "Key1:Value1;Key2:Value2")',
      { fallback: "" },
    )
    .option("cookies", "-c <cookies:string> 自定义 Cookies", { fallback: "" })
    .option("userAgent", "-u <userAgent:string> 自定义 User-Agent", {
      fallback: "",
    })
    .option("timeout", "-t <timeout:number> 请求超时时间(毫秒)", {
      fallback: config.timeout,
    })
    .option("follow", "-f <follow:boolean> 是否跟随重定向", {
      fallback: config.followRedirects,
    })
    .option("maxRedirects", "-r <maxRedirects:number> 最大重定向次数", {
      fallback: config.maxRedirects,
    })
    .option("verbose", "-v 显示详细信息", { fallback: false })
    .option("responseHeaders", "--response-headers 显示响应头", { fallback: false })
    .option("responseBody", "--response-body 显示响应体", { fallback: false })
    .option("showurl", "-s 显示URL (覆盖全局设置)", { fallback: false })
    .action(async ({ options: opts, session }, url) => {
      const options = opts!;
      console.log(`curl 命令被触发，URL: ${url || "未提供"}`);
      logger.info(`收到curl请求: ${url}, 会话ID: ${session?.id}`);

      try {
        const showUrl = options.showurl || !config.hideUrlInResponse;
        const confirmMessage = showUrl
          ? `正在处理您的请求，访问 ${url}...`
          : "正在处理您的请求，请稍候...";

        if (session) {
          await session.send(confirmMessage);
        }
      } catch (e) {
        console.error("无法发送确认消息:", e);
        logger.error("无法发送确认消息:", e);
      }

      if (!url) {
        logger.warn("未提供URL");
        return "请提供要访问的 URL";
      }

      try {
        const result = await executeRequest(url, options, {
          userAgent: options.userAgent || config.defaultUserAgent,
          cookies: options.cookies || config.defaultCookies,
          successMessage: "",
          errorMessage: "",
          showUrl: options.showurl || !config.hideUrlInResponse,
        });
        return result;
      } catch (e) {
        console.error("执行请求过程中发生未捕获的错误:", e);
        logger.error("执行请求过程中发生未捕获的错误:", e);
        return `执行请求时发生错误: ${(e as Error).message || "未知错误"}`;
      }
    });

  console.log(`curl 命令已注册，完整命令: ${cmd.name}`);
  logger.info(`curl 命令已注册，完整命令: ${cmd.name}`);

  for (const cmd2 of config.customCommands || []) {
    try {
      const showUrl =
        cmd2.showUrl !== undefined ? cmd2.showUrl : !config.hideUrlInResponse;
      const commandDesc = showUrl ? `访问预设URL: ${cmd2.url}` : "访问预设URL";

      const command = ctx
        .command(cmd2.name, commandDesc)
        .option(
          "headers",
          '-H <headers:string> 自定义请求头 (格式: "Key1:Value1;Key2:Value2")',
          { fallback: "" },
        )
        .option("cookies", "-c <cookies:string> 自定义 Cookies", {
          fallback: "",
        })
        .option("userAgent", "-u <userAgent:string> 自定义 User-Agent", {
          fallback: "",
        })
        .option("verbose", "-v 显示详细信息", { fallback: false })
        .option("responseHeaders", "--response-headers 显示响应头", { fallback: false })
        .option("responseBody", "--response-body 显示响应体", { fallback: false })
        .option("showurl", "-s 显示URL (覆盖其他设置)", { fallback: false })
        .action(async ({ options: opts, session }) => {
          const options = opts!;
          console.log(`自定义指令 ${cmd2.name} 被触发`);
          logger.info(`收到自定义指令 ${cmd2.name} 请求`);

          try {
            const showUrl2 =
              options.showurl ||
              (cmd2.showUrl !== undefined
                ? cmd2.showUrl
                : !config.hideUrlInResponse);
            const confirmMessage = showUrl2
              ? `正在处理 ${cmd2.name} 请求，访问 ${cmd2.url}...`
              : `正在处理 ${cmd2.name} 请求...`;

            if (session) {
              await session.send(confirmMessage);
            }
          } catch (e) {
            console.error(`无法为 ${cmd2.name} 发送确认消息:`, e);
            logger.error(`无法为 ${cmd2.name} 发送确认消息:`, e);
          }

          try {
            return await executeRequest(cmd2.url, options, {
              userAgent:
                options.userAgent || cmd2.userAgent || config.defaultUserAgent,
              cookies: options.cookies || cmd2.cookies || config.defaultCookies,
              successMessage: cmd2.successMessage,
              errorMessage: cmd2.errorMessage,
              showUrl:
                options.showurl ||
                (cmd2.showUrl !== undefined
                  ? cmd2.showUrl
                  : !config.hideUrlInResponse),
            });
          } catch (e) {
            console.error(`执行 ${cmd2.name} 请求时发生未捕获的错误:`, e);
            logger.error(`执行 ${cmd2.name} 请求时发生未捕获的错误:`, e);
            return `执行请求时发生错误: ${(e as Error).message || "未知错误"}`;
          }
        });

      console.log(`自定义命令 ${cmd2.name} 已注册`);
      logger.info(`自定义命令 ${cmd2.name} 已注册`);
    } catch (e) {
      console.error(`注册自定义命令 ${cmd2.name} 失败:`, e);
      logger.error(`注册自定义命令 ${cmd2.name} 失败:`, e);
    }
  }

  async function executeRequest(
    url: string,
    options: any,
    customConfig: {
      userAgent: string;
      cookies: string;
      successMessage: string;
      errorMessage: string;
      showUrl: boolean;
    },
  ): Promise<string> {
    console.log(`开始执行请求: ${url}`);
    logger.info(`开始执行请求: ${url}`);

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "http://" + url;
      logger.info(`URL 已修正为: ${url}`);
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

      logger.info(`发送请求: GET ${url}`);
      logger.info(`请求头: ${JSON.stringify(headers)}`);
      logger.info(`超时设置: ${options.timeout || config.timeout}ms`);

      const startTime = Date.now();

      const requestConfig = {
        method: "GET" as const,
        url,
        headers,
        timeout: options.timeout || config.timeout || 30000,
        maxRedirects: options.follow
          ? options.maxRedirects || config.maxRedirects
          : 0,
        validateStatus: null,
      };

      console.log(`发送请求: GET ${url}`);
      const response = await axios(requestConfig);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      console.log(
        `收到响应: ${url}, 状态码: ${response.status}, 耗时: ${responseTime}ms`,
      );
      logger.info(
        `收到响应: ${url}, 状态码: ${response.status}, 耗时: ${responseTime}ms`,
      );

      let result = "";

      if (options.verbose || options.responseHeaders || options.responseBody) {
        const showHeaders = options.verbose || options.responseHeaders;
        const showBody = options.verbose || options.responseBody;

        if (customConfig.showUrl) {
          result += `请求 URL: ${url}\n`;
        }
        result += `状态码: ${response.status} ${response.statusText || ""}\n`;
        result += `响应时间: ${responseTime}ms\n\n`;

        if (showHeaders) {
          result += "响应头:\n";
          for (const [key, value] of Object.entries(response.headers)) {
            result += `${key}: ${value}\n`;
          }
          result += "\n";
        }

        if (showBody) {
          result += "响应体预览 (前500字符):\n";
          const contentType = String(response.headers["content-type"] || "");
          if (contentType.includes("text") || contentType.includes("json") || contentType.includes("javascript")) {
            let responseText =
              typeof response.data === "string"
                ? response.data
                : JSON.stringify(response.data, null, 2);
            if (responseText.length > 500) {
              responseText = responseText.substring(0, 500) + "...";
            }
            result += responseText;
          } else {
            result += `[二进制数据 - ${contentType}]`;
          }
        }
      } else {
        if (response.status < 400) {
          if (customConfig.successMessage) {
            let message = customConfig.successMessage;
            if (customConfig.showUrl) {
              message = message.replace("{url}", url);
            } else {
              message = message
                .replace("{url}", "")
                .replace("访问成功: \n", "访问成功\n");
            }
            result = message
              .replace("{status}", response.status.toString())
              .replace("{statusText}", response.statusText || "")
              .replace("{time}", responseTime.toString());
          } else {
            if (customConfig.showUrl) {
              result = `访问成功: ${url}
状态码: ${response.status} ${response.statusText || ""}
响应时间: ${responseTime}ms`;
            } else {
              result = `访问成功
状态码: ${response.status} ${response.statusText || ""}
响应时间: ${responseTime}ms`;
            }
          }
        } else {
          if (customConfig.errorMessage) {
            let message = customConfig.errorMessage;
            if (customConfig.showUrl) {
              message = message.replace("{url}", url);
            } else {
              message = message
                .replace("{url}", "")
                .replace("访问失败: \n", "访问失败\n");
            }
            result = message
              .replace("{status}", response.status.toString())
              .replace("{statusText}", response.statusText || "")
              .replace("{time}", responseTime.toString())
              .replace("{error}", `状态码 ${response.status}`);
          } else {
            if (customConfig.showUrl) {
              result = `请求返回错误: ${url}
状态码: ${response.status} ${response.statusText || ""}
响应时间: ${responseTime}ms`;
            } else {
              result = `请求返回错误
状态码: ${response.status} ${response.statusText || ""}
响应时间: ${responseTime}ms`;
            }
          }
        }
      }

      console.log(`请求处理完成，返回结果长度: ${result.length}`);
      logger.info(
        `请求处理完成，返回结果: ${result.substring(0, 100)}${result.length > 100 ? "..." : ""}`,
      );

      return result;
    } catch (error) {
      console.error(`请求失败: ${url}`, error);
      logger.error(`请求失败: ${url}`, error);

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
          message = message
            .replace("{url}", "")
            .replace("访问失败: \n", "访问失败\n");
        }
        result = message.replace("{error}", errorDetail);
      } else {
        if (customConfig.showUrl) {
          result = `请求失败: ${url}
${errorDetail}`;
        } else {
          result = `请求失败
${errorDetail}`;
        }
      }

      console.log(`返回错误结果: ${result}`);
      logger.info(`返回错误结果: ${result}`);

      return result;
    }
  }

  ctx.on("ready", () => {
    console.log("curl-get 插件已准备就绪");
    logger.info("curl-get 插件已准备就绪");
  });

  ctx.on("dispose", () => {
    console.log("curl-get 插件正在卸载");
    logger.info("curl-get 插件正在卸载");
  });
}
