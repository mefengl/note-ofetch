/**
 * src/index.ts
 * 这是 ofetch 库的主入口文件。
 * 它负责导出所有公共 API，并设置全局变量和创建主要的 ofetch 函数。
 * 这个文件很重要，因为它是用户与库交互的起点。
 */

// 导入 createFetch 函数，它是创建自定义 fetch 实例的工厂函数
import { createFetch } from "./base";

// 从 base.ts 文件导出所有内容，包括各种工具函数和类型
export * from "./base";

// 导出类型定义，这样用户可以在 TypeScript 中使用这些类型
export type * from "./types";

/**
 * 安全地获取全局对象（globalThis）的函数
 * 在不同的 JavaScript 环境中（浏览器、Node.js、Web Workers 等），
 * 全局对象可能有不同的名称。这个函数尝试找到正确的全局对象。
 * 
 * 参考：https://github.com/tc39/proposal-global 
 * TC39 是负责 JavaScript 标准化的委员会，他们提出了 globalThis 作为访问全局对象的标准方式。
 */
const _globalThis = (function () {
  // 如果环境支持 globalThis（现代浏览器和 Node.js），直接使用它
  if (typeof globalThis !== "undefined") {
    return globalThis;
  }
  /* eslint-disable unicorn/prefer-global-this */
  // 在 Web Workers 中，全局对象是 self
  if (typeof self !== "undefined") {
    return self;
  }
  // 在浏览器中，全局对象是 window
  if (typeof window !== "undefined") {
    return window;
  }
  // 在 Node.js 中，全局对象是 global
  if (typeof global !== "undefined") {
    return global;
  }
  /* eslint-enable unicorn/prefer-global-this */
  // 如果找不到全局对象（极少数情况），抛出错误
  throw new Error("unable to locate global object");
})();

/**
 * 导出标准的 fetch 函数
 * 
 * 如果全局环境中有原生 fetch，就使用它
 * 否则返回一个会立即拒绝的 Promise，提示用户 fetch 不可用
 * 
 * 参考：https://github.com/unjs/ofetch/issues/295
 * 这是为了解决在某些环境中 fetch 不可用的问题
 */
export const fetch = _globalThis.fetch
  ? (...args: Parameters<typeof globalThis.fetch>) => _globalThis.fetch(...args)
  : () => Promise.reject(new Error("[ofetch] global.fetch is not supported!"));

// 导出原生的 Headers 类，用于处理 HTTP 请求和响应的头信息
export const Headers = _globalThis.Headers;

// 导出原生的 AbortController 类，用于取消进行中的 fetch 请求
export const AbortController = _globalThis.AbortController;

/**
 * 创建并导出 ofetch 函数，这是这个库最主要的 API
 * 使用 createFetch 函数创建一个增强的 fetch，注入全局的 fetch、Headers 和 AbortController
 */
export const ofetch = createFetch({ fetch, Headers, AbortController });

/**
 * $fetch 是 ofetch 的别名，两者功能完全相同
 * 这样设计是为了兼容性和灵活性，让用户可以选择自己喜欢的命名方式
 */
export const $fetch = ofetch;
