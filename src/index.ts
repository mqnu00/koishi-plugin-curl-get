import { Context, Schema, h } from "koishi";
import {} from "koishi-plugin-markdown-to-image-service";
import { executeRequest } from "./request";
import { handleRenderResult } from "./render";

export const name = "curl-get";

export const inject = {
  required: [],
  optional: ["onebot", "markdownToImage"],
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
  renderAsImage: boolean;
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
  renderAsImage: Schema.boolean()
    .default(false)
    .description("将响应体作为 Markdown 渲染为图片 (需要 markdown-to-image-service 插件)"),
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
    return "curl-get 插件工作正常！您可以使用 curl 命令发送请求。";
  });

  const cmd = ctx
    .command("curl <url:string>", "发送 HTTP 请求访问指定 URL")
    .alias("c")
    .option("headers", '-H <headers:string> 自定义请求头 (格式: "Key1:Value1;Key2:Value2")', { fallback: "" })
    .option("cookies", "-c <cookies:string> 自定义 Cookies", { fallback: "" })
    .option("userAgent", "-u <userAgent:string> 自定义 User-Agent", { fallback: "" })
    .option("timeout", "-t <timeout:number> 请求超时时间(毫秒)", { fallback: config.timeout })
    .option("follow", "-f <follow:boolean> 是否跟随重定向", { fallback: config.followRedirects })
    .option("maxRedirects", "-r <maxRedirects:number> 最大重定向次数", { fallback: config.maxRedirects })
    .option("verbose", "-v 显示详细信息", { fallback: false })
    .option("responseHeaders", "--response-headers 显示响应头", { fallback: false })
    .option("responseBody", "--response-body <length:number> 显示响应体 (数字:长度, 默认500, -1不限制)", { fallback: "" })
    .option("showurl", "-s 显示URL (覆盖全局设置)", { fallback: false })
    .option("renderImage", "--render-image 将响应体渲染为图片", { fallback: false })
    .action(async ({ options: opts, session }, url) => {
      const options = opts!;

      try {
        const showUrl = options.showurl || !config.hideUrlInResponse;
        const confirmMessage = showUrl
          ? `正在处理您的请求，访问 ${url}...`
          : "正在处理您的请求，请稍候...";
        if (session) await session.send(confirmMessage);
      } catch (e) {
        logger.error("无法发送确认消息:", e);
      }

      if (!url) return "请提供要访问的 URL";
      if (options.renderImage && options.responseBody) {
        return "--render-image 和 --response-body 不能同时使用";
      }

      const useRenderImage = options.renderImage && config.renderAsImage;
      if (useRenderImage) options.responseBody = options.responseBody || -1;

      try {
        const result = await executeRequest(url, options, {
          userAgent: options.userAgent || config.defaultUserAgent,
          cookies: options.cookies || config.defaultCookies,
          successMessage: "",
          errorMessage: "",
          showUrl: options.showurl || !config.hideUrlInResponse,
          split: useRenderImage,
        }, defaultHeaders, config.timeout, config.maxRedirects);

        if (useRenderImage) {
          return await handleRenderResult(result, ctx.markdownToImage);
        }
        return result as string;
      } catch (e) {
        logger.error("执行请求过程中发生未捕获的错误:", e);
        return `执行请求时发生错误: ${(e as Error).message || "未知错误"}`;
      }
    });

  logger.info(`curl 命令已注册: ${cmd.name}`);

  for (const customCmd of config.customCommands || []) {
    try {
      const showUrl = customCmd.showUrl !== undefined ? customCmd.showUrl : !config.hideUrlInResponse;
      const commandDesc = showUrl ? `访问预设URL: ${customCmd.url}` : "访问预设URL";

      ctx.command(customCmd.name, commandDesc)
        .option("headers", '-H <headers:string> 自定义请求头 (格式: "Key1:Value1;Key2:Value2")', { fallback: "" })
        .option("cookies", "-c <cookies:string> 自定义 Cookies", { fallback: "" })
        .option("userAgent", "-u <userAgent:string> 自定义 User-Agent", { fallback: "" })
        .option("verbose", "-v 显示详细信息", { fallback: false })
        .option("responseHeaders", "--response-headers 显示响应头", { fallback: false })
        .option("responseBody", "--response-body <length:number> 显示响应体 (数字:长度, 默认500, -1不限制)", { fallback: "" })
        .option("showurl", "-s 显示URL (覆盖其他设置)", { fallback: false })
        .option("renderImage", "--render-image 将响应体渲染为图片", { fallback: false })
        .action(async ({ options: opts, session }) => {
          const options = opts!;

          try {
            const showUrl2 = options.showurl || (customCmd.showUrl !== undefined ? customCmd.showUrl : !config.hideUrlInResponse);
            const confirmMessage = showUrl2
              ? `正在处理 ${customCmd.name} 请求，访问 ${customCmd.url}...`
              : `正在处理 ${customCmd.name} 请求...`;
            if (session) await session.send(confirmMessage);
          } catch (e) {
            logger.error(`无法为 ${customCmd.name} 发送确认消息:`, e);
          }

          if (options.renderImage && options.responseBody) {
            return "--render-image 和 --response-body 不能同时使用";
          }

          const useRenderImage = options.renderImage && config.renderAsImage;
          if (useRenderImage) options.responseBody = options.responseBody || -1;

          try {
            const result = await executeRequest(customCmd.url, options, {
              userAgent: options.userAgent || customCmd.userAgent || config.defaultUserAgent,
              cookies: options.cookies || customCmd.cookies || config.defaultCookies,
              successMessage: customCmd.successMessage,
              errorMessage: customCmd.errorMessage,
              showUrl: options.showurl || (customCmd.showUrl !== undefined ? customCmd.showUrl : !config.hideUrlInResponse),
              split: useRenderImage,
            }, defaultHeaders, config.timeout, config.maxRedirects);

            if (useRenderImage) {
              return await handleRenderResult(result, ctx.markdownToImage);
            }
            return result as string;
          } catch (e) {
            logger.error(`执行 ${customCmd.name} 请求时发生未捕获的错误:`, e);
            return `执行请求时发生错误: ${(e as Error).message || "未知错误"}`;
          }
        });

      logger.info(`自定义命令已注册: ${customCmd.name}`);
    } catch (e) {
      logger.error(`注册自定义命令 ${customCmd.name} 失败:`, e);
    }
  }

  ctx.on("ready", () => logger.info("curl-get 插件已准备就绪"));
  ctx.on("dispose", () => logger.info("curl-get 插件正在卸载"));
}
