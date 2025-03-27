/**
 * src/utils.ts
 * 
 * 这个文件包含了一系列工具函数，用于处理 fetch 请求中的各种辅助功能。
 * 主要包括：
 * 1. 请求方法判断
 * 2. JSON 序列化检查
 * 3. 响应类型检测
 * 4. 选项合并
 * 5. 头部信息处理
 * 6. 钩子函数调用
 */

import type {
  FetchContext,
  FetchHook,
  FetchOptions,
  FetchRequest,
  ResolvedFetchOptions,
  ResponseType,
} from "./types";

/**
 * 需要请求体的 HTTP 方法集合
 * 这些方法通常用于修改服务器上的数据
 */
const payloadMethods = new Set(
  Object.freeze(["PATCH", "POST", "PUT", "DELETE"])
);

/**
 * 判断一个 HTTP 方法是否需要请求体
 * 
 * @param method HTTP 方法名
 * @returns 是否需要请求体
 * 
 * @example
 * ```typescript
 * isPayloadMethod("POST") // true
 * isPayloadMethod("GET")  // false
 * ```
 */
export function isPayloadMethod(method = "GET") {
  return payloadMethods.has(method.toUpperCase());
}

/**
 * 检查一个值是否可以被 JSON 序列化
 * 
 * 这个函数会检查各种数据类型：
 * 1. 基本类型（字符串、数字、布尔值、null）
 * 2. 数组
 * 3. 普通对象
 * 4. 带有 toJSON 方法的对象
 * 
 * @param value 要检查的值
 * @returns 是否可以 JSON 序列化
 * 
 * @example
 * ```typescript
 * isJSONSerializable({ name: "test" }) // true
 * isJSONSerializable(new Date())       // true (有 toJSON 方法)
 * isJSONSerializable(() => {})         // false
 * ```
 */
export function isJSONSerializable(value: any) {
  if (value === undefined) {
    return false;
  }
  const t = typeof value;
  // 基本类型都可以序列化
  if (t === "string" || t === "number" || t === "boolean" || t === null) {
    return true;
  }
  // 非对象类型不能序列化
  if (t !== "object") {
    return false; // bigint, function, symbol, undefined
  }
  // 数组可以序列化
  if (Array.isArray(value)) {
    return true;
  }
  // Buffer 不能序列化
  if (value.buffer) {
    return false;
  }
  // 普通对象或带有 toJSON 方法的对象可以序列化
  return (
    (value.constructor && value.constructor.name === "Object") ||
    typeof value.toJSON === "function"
  );
}

/**
 * 文本类型的 MIME 类型集合
 * 这些类型应该作为文本处理
 */
const textTypes = new Set([
  "image/svg",
  "application/xml",
  "application/xhtml",
  "application/html",
]);

/**
 * JSON MIME 类型的正则表达式
 * 匹配各种 JSON 相关的 MIME 类型
 */
const JSON_RE = /^application\/(?:[\w!#$%&*.^`~-]*\+)?json(;.+)?$/i;

/**
 * 根据 Content-Type 头检测响应类型
 * 
 * 这个函数会根据响应的 Content-Type 头来决定如何解析响应体：
 * 1. 如果是 JSON 类型，返回 "json"
 * 2. 如果是文本类型，返回 "text"
 * 3. 其他情况返回 "blob"
 * 
 * @param _contentType Content-Type 头
 * @returns 响应类型
 * 
 * @example
 * ```typescript
 * detectResponseType("application/json") // "json"
 * detectResponseType("text/plain")       // "text"
 * detectResponseType("image/png")        // "blob"
 * ```
 */
export function detectResponseType(_contentType = ""): ResponseType {
  if (!_contentType) {
    return "json";
  }

  // 处理带有参数的 Content-Type
  const contentType = _contentType.split(";").shift() || "";

  if (JSON_RE.test(contentType)) {
    return "json";
  }

  // TODO: 支持流式响应
  // if (contentType === 'application/octet-stream') {
  //   return 'stream'
  // }

  if (textTypes.has(contentType) || contentType.startsWith("text/")) {
    return "text";
  }

  return "blob";
}

/**
 * 合并和解析 fetch 选项
 * 
 * 这个函数会合并默认选项和用户提供的选项，处理：
 * 1. 头部信息合并
 * 2. 查询参数合并
 * 3. 其他选项合并
 * 
 * @param request 请求对象
 * @param input 用户提供的选项
 * @param defaults 默认选项
 * @param Headers Headers 类
 * @returns 解析后的选项
 */
export function resolveFetchOptions<
  R extends ResponseType = ResponseType,
  T = any,
>(
  request: FetchRequest,
  input: FetchOptions<R, T> | undefined,
  defaults: FetchOptions<R, T> | undefined,
  Headers: typeof globalThis.Headers
): ResolvedFetchOptions<R, T> {
  // 合并头部信息
  const headers = mergeHeaders(
    input?.headers ?? (request as Request)?.headers,
    defaults?.headers,
    Headers
  );

  // 合并查询参数
  let query: Record<string, any> | undefined;
  if (defaults?.query || defaults?.params || input?.params || input?.query) {
    query = {
      ...defaults?.params,
      ...defaults?.query,
      ...input?.params,
      ...input?.query,
    };
  }

  return {
    ...defaults,
    ...input,
    query,
    params: query,
    headers,
  };
}

/**
 * 合并头部信息
 * 
 * 这个函数会合并默认头部和用户提供的头部，处理各种输入格式：
 * 1. Headers 对象
 * 2. 普通对象
 * 3. 键值对数组
 * 
 * @param input 用户提供的头部
 * @param defaults 默认头部
 * @param Headers Headers 类
 * @returns 合并后的 Headers 对象
 */
function mergeHeaders(
  input: HeadersInit | undefined,
  defaults: HeadersInit | undefined,
  Headers: typeof globalThis.Headers
): Headers {
  if (!defaults) {
    return new Headers(input);
  }
  const headers = new Headers(defaults);
  if (input) {
    for (const [key, value] of Symbol.iterator in input || Array.isArray(input)
      ? input
      : new Headers(input)) {
      headers.set(key, value);
    }
  }
  return headers;
}

/**
 * 调用钩子函数
 * 
 * 这个函数用于执行请求生命周期中的钩子函数：
 * 1. 支持单个钩子或钩子数组
 * 2. 按顺序执行所有钩子
 * 3. 等待异步钩子完成
 * 
 * @param context 请求上下文
 * @param hooks 钩子函数或钩子函数数组
 */
export async function callHooks<C extends FetchContext = FetchContext>(
  context: C,
  hooks: FetchHook<C> | FetchHook<C>[] | undefined
): Promise<void> {
  if (hooks) {
    if (Array.isArray(hooks)) {
      for (const hook of hooks) {
        await hook(context);
      }
    } else {
      await hooks(context);
    }
  }
}
