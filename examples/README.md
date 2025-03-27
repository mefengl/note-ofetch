# ofetch 示例

这个目录包含了 ofetch 库的使用示例，展示了各种常见的使用场景。

## 示例列表

1. [**first-request.mjs**](first-request.mjs)
   - 展示如何发送第一个请求
   - 自动处理 JSON 响应
   - 最简单的使用方式

2. [**methods.mjs**](methods.mjs)
   - 展示如何使用不同的 HTTP 方法
   - 发送 POST 请求示例
   - 处理 GitHub API 请求

3. [**headers.mjs**](headers.mjs)
   - 展示如何设置请求头部
   - 使用认证令牌
   - 创建 GitHub Gist

4. [**body.mjs**](body.mjs)
   - 展示如何发送请求体
   - 自动 JSON 序列化
   - 渲染 Markdown 文本

5. [**error-handling.mjs**](error-handling.mjs)
   - 展示如何处理请求错误
   - 捕获和格式化错误信息
   - 访问错误响应体

6. [**proxy.mjs**](proxy.mjs)
   - 展示如何使用代理
   - 配置自定义 Agent
   - 处理 SSL 证书

7. [**query-string.mjs**](query-string.mjs)
   - 展示如何添加查询参数
   - 自动参数编码
   - 分页请求示例

8. [**type-safety.ts**](type-safety.ts)
   - 展示 TypeScript 类型支持
   - 定义响应接口
   - 类型安全的属性访问

## 运行示例

每个示例都可以独立运行：

```bash
# 运行 JavaScript 示例
node first-request.mjs

# 运行 TypeScript 示例
npx ts-node type-safety.ts
```

## 注意事项

1. 某些示例需要设置环境变量（如 GitHub Token）
2. 部分示例直接使用 GitHub API，需要适当的权限
3. 代理示例使用了不安全的配置，仅用于测试

## 学习更多

要了解更多关于 ofetch 的信息，可以访问：
- [ofetch 文档](https://unjs.io/packages/ofetch)
- [ofetch 教程](https://unjs.io/resources/learn/ofetch-101-first-hand)
