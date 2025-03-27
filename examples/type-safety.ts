/**
 * type-safety.ts
 * 
 * 这个示例展示了如何在 ofetch 中使用 TypeScript 类型。
 * 在这个例子中，我们：
 * 1. 定义响应数据的接口
 * 2. 使用泛型指定响应类型
 * 3. 获得完整的类型提示和检查
 * 
 * 运行方法：
 * ```bash
 * # 使用 ts-node 运行
 * npx ts-node type-safety.ts
 * 
 * # 或者先编译再运行
 * tsc type-safety.ts
 * node type-safety.js
 * ```
 */

// 导入 ofetch 函数
// @ts-ignore
import { ofetch } from "ofetch";

/**
 * 定义仓库信息的接口
 * 
 * 这个接口描述了从 API 返回的仓库数据结构：
 * - id: 仓库 ID
 * - name: 仓库名称
 * - repo: 仓库路径
 * - description: 仓库描述
 * - stars: 星标数量
 */
interface Repo {
  id: number;
  name: string;
  repo: string;
  description: string;
  stars: number;
}

/**
 * 主函数
 * 
 * 这个函数展示了：
 * 1. 如何使用泛型指定响应类型
 * 2. 如何获得类型安全的属性访问
 * 3. 如何处理异步请求
 */
async function main() {
  // 发送请求并指定响应类型
  const { repo } = await ofetch<{ repo: Repo }>(
    "https://ungh.cc/repos/unjs/ofetch"
  );

  // 使用类型安全的属性访问
  console.log(`The repo ${repo.name} has ${repo.stars} stars.`);
}

// 运行主函数并处理错误
// eslint-disable-next-line unicorn/prefer-top-level-await
main().catch(console.error);
