/**
 * body.mjs
 * 
 * 这个示例展示了如何在 ofetch 请求中发送请求体。
 * 在这个例子中，我们：
 * 1. 发送一个 POST 请求到 GitHub API
 * 2. 发送 Markdown 文本进行渲染
 * 3. 获取渲染后的 HTML
 * 
 * 运行方法：
 * ```bash
 * node body.mjs
 * ```
 */

// 导入 ofetch 函数
import { ofetch } from "ofetch";

/**
 * 发送带有请求体的 POST 请求到 GitHub API
 * 
 * 这个请求会：
 * 1. 使用 POST 方法
 * 2. 发送 Markdown 文本
 * 3. 获取渲染后的 HTML
 * 
 * 注意：
 * - ofetch 会自动将对象转换为 JSON
 * - 会自动设置 Content-Type: application/json
 */
const response = await ofetch("https://api.github.com/markdown", {
  method: "POST",
  // 设置请求体，ofetch 会自动处理 JSON 序列化
  body: {
    text: "UnJS is **awesome**!\n\nCheck out their [website](https://unjs.io).",
  },
});

// 打印渲染后的 HTML
console.log(response);
