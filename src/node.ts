/**
 * src/node.ts
 * 
 * 这个文件专门处理 Node.js 环境下的 fetch 功能。
 * 它提供了 Node.js 特定的实现，包括：
 * 1. 使用 node-fetch-native 作为底层实现
 * 2. 支持 HTTP/HTTPS 代理
 * 3. 支持 keep-alive 连接
 * 4. 兼容 Node.js 的 Headers 和 AbortController
 */

import http from "node:http";
import https, { AgentOptions } from "node:https";
import nodeFetch, {
  Headers as _Headers,
  AbortController as _AbortController,
} from "node-fetch-native";

import { createFetch } from "./base";

// 重新导出基础模块的内容
export * from "./base";
export type * from "./types";

/**
 * 创建 Node.js 特定的 fetch 实现
 * 
 * 这个函数根据环境变量 FETCH_KEEP_ALIVE 来决定是否启用 keep-alive 连接。
 * keep-alive 连接可以重用 TCP 连接，提高性能，但可能会占用更多资源。
 * 
 * @returns 一个配置好的 fetch 函数
 * 
 * @example
 * ```typescript
 * // 启用 keep-alive
 * process.env.FETCH_KEEP_ALIVE = "true";
 * const fetch = createNodeFetch();
 * ```
 */
export function createNodeFetch() {
  // 从环境变量读取是否启用 keep-alive
  const useKeepAlive = JSON.parse(process.env.FETCH_KEEP_ALIVE || "false");
  if (!useKeepAlive) {
    return nodeFetch;
  }

  // 配置 HTTP 和 HTTPS 代理的 keep-alive 选项
  // 参考：https://github.com/node-fetch/node-fetch#custom-agent
  const agentOptions: AgentOptions = { keepAlive: true };
  const httpAgent = new http.Agent(agentOptions);
  const httpsAgent = new https.Agent(agentOptions);
  
  // 根据 URL 协议选择对应的代理
  const nodeFetchOptions = {
    agent(parsedURL: any) {
      return parsedURL.protocol === "http:" ? httpAgent : httpsAgent;
    },
  };

  // 返回一个包装后的 fetch 函数，自动应用 keep-alive 配置
  return function nodeFetchWithKeepAlive(
    input: RequestInfo,
    init?: RequestInit
  ) {
    return (nodeFetch as any)(input, { ...nodeFetchOptions, ...init });
  };
}

/**
 * 导出 fetch 函数
 * 
 * 如果全局环境中有原生 fetch，就使用它
 * 否则使用 Node.js 特定的实现
 */
export const fetch = globalThis.fetch
  ? (...args: Parameters<typeof globalThis.fetch>) => globalThis.fetch(...args)
  : (createNodeFetch() as typeof globalThis.fetch);

/**
 * 导出 Headers 类
 * 
 * 如果全局环境中有原生 Headers，就使用它
 * 否则使用 node-fetch-native 提供的实现
 */
export const Headers = globalThis.Headers || _Headers;

/**
 * 导出 AbortController 类
 * 
 * 如果全局环境中有原生 AbortController，就使用它
 * 否则使用 node-fetch-native 提供的实现
 */
export const AbortController = globalThis.AbortController || _AbortController;

/**
 * 创建并导出 ofetch 实例
 * 
 * 使用配置好的 fetch、Headers 和 AbortController 创建一个增强版的 fetch 实例
 */
export const ofetch = createFetch({ fetch, Headers, AbortController });

/**
 * $fetch 是 ofetch 的别名
 * 这样设计是为了兼容性和灵活性
 */
export const $fetch = ofetch;
