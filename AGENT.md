# Agent 实践指南

本项目是从 npm 依赖包还原 TypeScript 源码并集成到 Koishi 框架的实践记录。

## 1. 从编译产物还原源码

### 分析编译器特征
- esbuild 产物：`__create`、`__defProp`、`__toESM`、`__toCommonJS` 辅助函数
- 注释 `// src/index.ts` 指示原始源文件路径
- 末尾 `0 && (module.exports = {...})` 是 ESM→CJS 兼容写法

### 利用类型定义文件
- `.d.ts` 文件包含完整类型信息
- 从 `Schema.object({...})` 还原配置定义
- 从函数签名还原参数类型

### 类型修复
- axios 的 `response.headers` 是联合类型，需要用 `String()` 转换
- koishi 的 `options` 参数可能为 `undefined`，需要用非空断言
- catch 的 `error` 是 `unknown` 类型，需要用 `as any` 断言

## 2. Koishi 插件集成

### 工作区结构
```
koishi-app/
├── koishi.yml           # 配置文件
├── external/
│   └── curl-get/        # 插件目录
│       ├── src/
│       │   └── index.ts
│       ├── lib/          # 编译产物（gitignore）
│       └── package.json
└── package.json
```

### 配置文件格式
```yaml
plugins:
  plugin-name:
    configKey: configValue
```

### 构建命令
```bash
yarn build plugin-name
```

## 3. Koishi 选项系统限制

### 不支持的语法
- 双字母短选项 `-rh` 不支持，必须用 `--response-headers`
- 可选数字参数 `<number?>` 不支持，会报 `transform is not a function`
- 布尔选项不能同时接受数字值

### 解决方案
```typescript
// 方案：字符串选项 + 代码解析
.option("responseBody", "--response-body <length:string> 显示响应体", {
  fallback: "",
})

// 使用时解析
const bodyLength = parseInt(options.responseBody || "500", 10) || 500;
```

## 4. 项目结构最佳实践

### 文件组织
- 源码放在 `src/` 目录
- 编译产物放在 `lib/` 目录
- 使用 `.gitignore` 忽略编译产物

### package.json 配置
```json
{
  "main": "lib/index.js",
  "typings": "lib/index.d.ts",
  "files": ["lib", "dist"],
  "scripts": {
    "build": "tsc"
  }
}
```

### tsconfig.json 配置
```json
{
  "compilerOptions": {
    "outDir": "./lib",
    "rootDir": "./src",
    "declaration": true,
    "sourceMap": true
  }
}
```

## 5. Git 工作流

### 代理配置
```bash
git config --global http.proxy http://proxy:port
git config --global https.proxy http://proxy:port
```

### .gitignore 要点
```
node_modules/
lib/
dist/
*.tsbuildinfo
```

## 6. 调试技巧

### 添加临时日志
```typescript
console.log('debug:', variable);
```

### 构建后测试
```bash
yarn build plugin-name && timeout 10 yarn start
```

### 查看日志输出
启动时观察控制台输出，确认插件加载和命令注册。
