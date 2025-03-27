/**
 * headers.mjs
 * 
 * 这个示例展示了如何在 ofetch 请求中设置和使用 HTTP 头部。
 * 在这个例子中，我们：
 * 1. 设置认证头部
 * 2. 发送带有请求体的 POST 请求
 * 3. 创建一个 GitHub Gist
 * 
 * 注意：这个例子需要设置 GH_TOKEN 环境变量。
 * 
 * 运行方法：
 * ```bash
 * # 设置 GitHub Token
 * export GH_TOKEN=your_github_token
 * 
 * # 运行示例
 * node headers.mjs
 * ```
 */

// 导入 ofetch 函数
import { ofetch } from "ofetch";

/**
 * 发送带有自定义头部的 POST 请求到 GitHub API
 * 
 * 这个请求会：
 * 1. 使用 POST 方法
 * 2. 添加认证头部
 * 3. 发送 JSON 请求体
 * 4. 创建一个新的 Gist
 * 
 * 请求体包含：
 * - description: Gist 的描述
 * - public: 是否公开
 * - files: 文件内容
 */
const response = await ofetch("https://api.github.com/gists", {
  method: "POST",
  // 设置请求头部
  headers: {
    Authorization: `token ${process.env.GH_TOKEN}`, // 使用环境变量中的 GitHub Token
  },
  // 设置请求体
  body: {
    description: "This is a gist created by ofetch.",
    public: true,
    files: {
      "unjs.txt": {
        content: "UnJS is awesome!",
      },
    },
  },
}); // 注意：这里直接使用 GitHub API

// 打印创建的 Gist 的 URL
console.log(response.url);
