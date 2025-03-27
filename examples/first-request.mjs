/**
 * first-request.mjs
 * 
 * 这是 ofetch 库的第一个示例，展示了如何发送一个简单的 GET 请求。
 * 这个例子会：
 * 1. 发送请求到 ungh.cc 获取 ofetch 仓库信息
 * 2. 自动解析 JSON 响应
 * 3. 打印响应数据
 * 
 * 运行方法：
 * ```bash
 * node first-request.mjs
 * ```
 */

// 导入 ofetch 函数
import { ofetch } from "ofetch";

/**
 * 发送 GET 请求获取 ofetch 仓库信息
 * 
 * 这个请求会：
 * 1. 自动处理 JSON 响应
 * 2. 处理错误情况
 * 3. 返回解析后的数据
 */
const data = await ofetch("https://ungh.cc/repos/unjs/ofetch");

// 打印响应数据
console.log(data);
