/**
 * src/error.ts
 * 
 * 这个文件定义了 ofetch 库的错误处理相关功能。
 * 它提供了一个增强版的错误类 FetchError，用于更好地处理和展示网络请求错误。
 * 
 * 主要功能包括：
 * 1. 统一的错误格式
 * 2. 详细的错误信息（包含请求方法、URL、状态码等）
 * 3. 错误原因的追踪
 * 4. 兼容性处理
 */

import type { FetchContext, IFetchError } from "./types";

/**
 * FetchError 类
 * 
 * 这是一个增强版的错误类，专门用于处理网络请求错误。
 * 它继承自标准的 Error 类，并实现了 IFetchError 接口。
 * 
 * 特点：
 * 1. 支持错误原因追踪（Error Cause）
 * 2. 包含请求和响应的详细信息
 * 3. 提供友好的错误消息格式
 * 
 * @example
 * ```typescript
 * const error = new FetchError("请求失败", { cause: new Error("网络超时") });
 * console.log(error.message); // "[GET] "http://example.com": 请求失败 网络超时"
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class FetchError<T = any> extends Error implements IFetchError<T> {
  constructor(message: string, opts?: { cause: unknown }) {
    // 使用 Error Cause 特性（V8 引擎支持）
    // @ts-ignore https://v8.dev/features/error-cause
    super(message, opts);

    this.name = "FetchError";

    // 为不支持 Error Cause 的运行时提供 polyfill
    if (opts?.cause && !this.cause) {
      this.cause = opts.cause;
    }
  }
}

/**
 * 扩展 FetchError 类型，使其包含 IFetchError 接口的所有属性
 * 这样可以让 TypeScript 更好地理解错误对象的类型
 */
export interface FetchError<T = any> extends IFetchError<T> {}

/**
 * 创建标准化的 FetchError 实例
 * 
 * 这个函数接收一个请求上下文，并从中提取信息创建一个格式化的错误对象。
 * 它会自动处理各种情况，包括：
 * 1. 请求方法（GET、POST 等）
 * 2. 请求 URL
 * 3. 响应状态码和状态文本
 * 4. 原始错误信息
 * 
 * @param ctx 请求上下文，包含请求、选项、响应和错误信息
 * @returns 一个标准化的 FetchError 实例
 * 
 * @example
 * ```typescript
 * const error = createFetchError({
 *   request: "http://example.com",
 *   options: { method: "POST" },
 *   response: { status: 404, statusText: "Not Found" }
 * });
 * console.log(error.message); // "[POST] "http://example.com": 404 Not Found"
 * ```
 */
export function createFetchError<T = any>(
  ctx: FetchContext<T>
): IFetchError<T> {
  // 获取原始错误信息
  const errorMessage = ctx.error?.message || ctx.error?.toString() || "";

  // 构建请求信息字符串
  const method =
    (ctx.request as Request)?.method || ctx.options?.method || "GET";
  const url = (ctx.request as Request)?.url || String(ctx.request) || "/";
  const requestStr = `[${method}] ${JSON.stringify(url)}`;

  // 构建响应状态字符串
  const statusStr = ctx.response
    ? `${ctx.response.status} ${ctx.response.statusText}`
    : "<no response>";

  // 组合完整的错误消息
  const message = `${requestStr}: ${statusStr}${
    errorMessage ? ` ${errorMessage}` : ""
  }`;

  // 创建 FetchError 实例
  const fetchError: FetchError<T> = new FetchError(
    message,
    ctx.error ? { cause: ctx.error } : undefined
  );

  // 添加请求相关的属性
  for (const key of ["request", "options", "response"] as const) {
    Object.defineProperty(fetchError, key, {
      get() {
        return ctx[key];
      },
    });
  }

  // 添加响应相关的属性
  // 包括 data、status、statusCode 等，有些是为了兼容性而提供的别名
  for (const [key, refKey] of [
    ["data", "_data"],
    ["status", "status"],
    ["statusCode", "status"],
    ["statusText", "statusText"],
    ["statusMessage", "statusText"],
  ] as const) {
    Object.defineProperty(fetchError, key, {
      get() {
        return ctx.response && ctx.response[refKey];
      },
    });
  }

  return fetchError;
}
