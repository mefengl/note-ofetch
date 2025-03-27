/**
 * query-string.mjs
 * 
 * 这个示例展示了如何在 ofetch 请求中添加查询参数。
 * 在这个例子中，我们：
 * 1. 发送请求到 GitHub API
 * 2. 添加查询参数限制返回数量
 * 3. 获取仓库标签信息
 * 
 * 运行方法：
 * ```bash
 * node query-string.mjs
 * ```
 */

// 导入 ofetch 函数
import { ofetch } from "ofetch";

/**
 * 发送带有查询参数的请求到 GitHub API
 * 
 * 这个请求会：
 * 1. 访问 ofetch 仓库的标签列表
 * 2. 限制每页返回 2 个标签
 * 3. 自动处理查询参数编码
 * 
 * 注意：
 * - ofetch 会自动处理查询参数的编码
 * - 支持复杂的查询参数对象
 * - 会自动合并 URL 中的查询参数
 */
const response = await ofetch("https://api.github.com/repos/unjs/ofetch/tags", {
  query: {
    per_page: 2, // 限制每页返回 2 个标签
  },
}); // 注意：这里直接使用 GitHub API

// 打印响应数据
console.log(response);
