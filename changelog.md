# Changelog

## 0.0.5

### 新增
- 支持 `markdown-to-image-service` 可选服务，新增 `--render-image` 选项将响应体渲染为图片
- 渲染图片时状态码信息以文字返回，响应体渲染为图片
- 添加 `renderAsImage` 全局配置项

### 变更
- 拆分模块：`index.ts` / `request.ts` / `render.ts`
- `--render-image` 与 `--response-body` 互斥
- 添加 `peerDependenciesMeta` 标记 `koishi-plugin-markdown-to-image-service` 为可选

## 0.0.4

### 新增
- 添加 `--response-headers` 选项，只显示响应头
- 添加 `--response-body` 选项，只显示响应体
- 添加 `--response-body <length>` 参数，支持自定义响应体显示长度（默认500，-1不限制）
- 添加 `.gitignore` 文件
- 添加 `AGENT.md` 实践指南文档

### 修复
- 修复 axios `response.headers` 类型错误，使用 `String()` 转换
- 修复响应体预览支持 `application/javascript` 类型

### 变更
- 从编译后的 JS 文件还原 TypeScript 源码
- 更新 package.json 作者信息为 mqnu00
- 更新 README.md，说明项目来源（原作者 moeneri）

## 0.0.3

- 原始版本（npm 发布）
