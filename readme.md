# koishi-plugin-curl-get

[![npm](https://img.shields.io/npm/v/koishi-plugin-curl-get?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-curl-get)

一个 Koishi 插件，可以发送 curl 请求，支持绑定命令、Cookie、User-Agent，并返回响应内容。

## 关于本项目

本项目源码是从 npm 依赖包还原而来。

- **原项目作者**：[moeneri](https://github.com/moeneri)
- **原项目地址**：https://github.com/moeneri/koishi-plugin-curl-get （已被删除）
- **还原方式**：基于已发布的 npm 包 `koishi-plugin-curl-get@0.0.3`，从编译后的 JavaScript 文件反向还原出 TypeScript 源码

感谢原作者 [moeneri](https://github.com/moeneri) 的工作。

## 许可证

MIT License - 保留原项目的开源许可证。

## 功能特性

- 发送 HTTP GET 请求
- 支持自定义 User-Agent
- 支持自定义 Cookies
- 支持自定义请求头
- 支持配置超时时间和重定向
- 支持绑定自定义指令

## 使用方法

### 安装

```bash
npm install koishi-plugin-curl-get
```

### 配置

在 `koishi.yml` 中添加：

```yaml
plugins:
  curl-get:
    defaultUserAgent: "Koishi-Curl/1.0"
    timeout: 10000
    followRedirects: true
    hideUrlInResponse: true
```

### 命令

- `/curl <url>` - 发送 HTTP 请求
- `/curltest` - 测试插件是否正常工作

### 选项

- `-H <headers>` - 自定义请求头（格式：`Key1:Value1;Key2:Value2`）
- `-c <cookies>` - 自定义 Cookies
- `-u <userAgent>` - 自定义 User-Agent
- `-t <timeout>` - 请求超时时间（毫秒）
- `-f <follow>` - 是否跟随重定向
- `-v` - 显示详细信息
- `-s` - 显示 URL
