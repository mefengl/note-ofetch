/**
 * error-handling.mjs
 * 
 * 这个示例展示了如何处理 ofetch 请求中的错误。
 * 在这个例子中，我们：
 * 1. 发送一个会失败的请求
 * 2. 捕获并处理错误
 * 3. 展示错误信息的不同部分
 * 
 * 运行方法：
 * ```bash
 * node error-handling.mjs
 * ```
 */

// 导入 ofetch 函数
import { ofetch } from "ofetch";

/**
 * 发送一个会失败的请求并处理错误
 * 
 * 这个例子展示了：
 * 1. 如何使用 try-catch 捕获错误
 * 2. 如何访问错误信息
 * 3. 如何获取错误响应体
 */
try {
  // 发送一个没有认证的 POST 请求，这会失败
  await ofetch("https://api.github.com", {
    method: "POST",
  });
} catch (error) {
  // 打印格式化的错误信息
  // 包含请求方法、URL、状态码等
  console.error(error);

  // 访问错误响应体
  // 如果服务器返回了 JSON 错误信息，可以在这里获取
  console.log(error.data);
}
