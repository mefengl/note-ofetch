/**
 * methods.mjs
 * 
 * 这个示例展示了如何使用 ofetch 发送不同 HTTP 方法的请求。
 * 在这个例子中，我们：
 * 1. 发送一个 POST 请求到 GitHub API
 * 2. 展示如何指定请求方法
 * 3. 处理响应数据
 * 
 * 注意：这个例子直接使用 GitHub API，需要适当的权限。
 * 
 * 运行方法：
 * ```bash
 * node methods.mjs
 * ```
 */

// 导入 ofetch 函数
import { ofetch } from "ofetch";

/**
 * 发送 POST 请求到 GitHub API
 * 
 * 这个请求会：
 * 1. 使用 POST 方法
 * 2. 访问 GitHub Gists API
 * 3. 自动处理 JSON 响应
 * 
 * 注意：实际使用时需要：
 * 1. 添加适当的认证信息
 * 2. 可能需要添加请求体
 * 3. 处理可能的错误情况
 */
const response = await ofetch("https://api.github.com/gists", {
  method: "POST",
}); // 注意：这里直接使用 GitHub API

// 打印响应数据
console.log(response);
