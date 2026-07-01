import { h } from "koishi";
import { ExecuteResult } from "./request";

type HandleResult = string | ReturnType<typeof h.image> | (string | ReturnType<typeof h.image>)[];

export async function handleRenderResult(
  result: ExecuteResult,
  markdownToImage?: { convertToImage(text: string): Promise<Buffer> },
): Promise<HandleResult> {
  if (typeof result === "object" && "status" in result) {
    const statusInfo = [result.status, result.headers].filter(Boolean).join("\n");
    if (result.body && markdownToImage) {
      const imageBuffer = await markdownToImage.convertToImage(result.body);
      return [statusInfo + "\n", h.image(imageBuffer, "image/png")];
    }
    return statusInfo + (result.body ? "\n" + result.body : "");
  }
  return String(result) + "\n\n(提示: 未安装 markdown-to-image-service 插件，无法渲染图片)";
}
