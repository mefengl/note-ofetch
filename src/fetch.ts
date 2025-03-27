/**
 * src/fetch.ts
 * 
 * 这是 ofetch 库的核心实现文件，包含了主要的 fetch 功能。
 * 它提供了一个增强版的 fetch API，支持：
 * 1. 自动重试失败的请求
 * 2. 超时控制
 * 3. 自动解析 JSON 响应
 * 4. 请求和响应的钩子函数
 * 5. 更好的错误处理
 * 
 * 这个文件主要包含两个重要的函数：
 * - createFetch: 创建自定义的 fetch 实例
 * - $fetchRaw: 实际的请求处理函数
 */

import type { Readable } from "node:stream";
import destr from "destr";
import { withBase, withQuery } from "ufo";
import { createFetchError } from "./error";
import {
  isPayloadMethod,
  isJSONSerializable,
  detectResponseType,
  resolveFetchOptions,
  callHooks,
} from "./utils";
import type {
  CreateFetchOptions,
  FetchResponse,
  ResponseType,
  FetchContext,
  $Fetch,
  FetchRequest,
  FetchOptions,
} from "./types";

/**
 * 需要自动重试的 HTTP 状态码列表
 * 这些状态码通常表示临时性的服务器问题，重试可能会成功
 * 
 * 参考：https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
 */
const retryStatusCodes = new Set([
  408, // Request Timeout - 请求超时
  409, // Conflict - 请求冲突
  425, // Too Early (Experimental) - 请求太早
  429, // Too Many Requests - 请求太多
  500, // Internal Server Error - 服务器内部错误
  502, // Bad Gateway - 网关错误
  503, // Service Unavailable - 服务不可用
  504, // Gateway Timeout - 网关超时
]);

/**
 * 没有响应体的 HTTP 状态码列表
 * 这些状态码表示请求成功但不需要返回数据
 * 
 * 参考：https://developer.mozilla.org/en-US/docs/Web/API/Response/body
 */
const nullBodyResponses = new Set([101, 204, 205, 304]);

/**
 * 创建自定义的 fetch 实例
 * 
 * @param globalOptions 全局选项，包括：
 * - fetch: 自定义的 fetch 实现
 * - Headers: 自定义的 Headers 类
 * - AbortController: 自定义的 AbortController 类
 * - defaults: 默认的请求选项
 * 
 * @returns 一个增强版的 fetch 函数
 */
export function createFetch(globalOptions: CreateFetchOptions = {}): $Fetch {
  const {
    fetch = globalThis.fetch,
    Headers = globalThis.Headers,
    AbortController = globalThis.AbortController,
  } = globalOptions;

  /**
   * 错误处理函数
   * 负责处理请求失败的情况，包括：
   * 1. 检查是否需要重试
   * 2. 计算重试延迟
   * 3. 创建标准化的错误对象
   * 
   * @param context 请求上下文，包含请求、选项、响应和错误信息
   * @returns 处理后的响应或抛出错误
   */
  async function onError(context: FetchContext): Promise<FetchResponse<any>> {
    // 检查是否是主动中断的请求
    // 如果是主动中断且没有设置超时，则不自动重试
    const isAbort =
      (context.error &&
        context.error.name === "AbortError" &&
        !context.options.timeout) ||
      false;

    // 处理重试逻辑
    if (context.options.retry !== false && !isAbort) {
      let retries;
      if (typeof context.options.retry === "number") {
        retries = context.options.retry;
      } else {
        // 对于 GET 请求默认重试 1 次，其他请求方法不重试
        retries = isPayloadMethod(context.options.method) ? 0 : 1;
      }

      const responseCode = (context.response && context.response.status) || 500;
      // 检查响应状态码是否需要重试
      if (
        retries > 0 &&
        (Array.isArray(context.options.retryStatusCodes)
          ? context.options.retryStatusCodes.includes(responseCode)
          : retryStatusCodes.has(responseCode))
      ) {
        // 计算重试延迟时间
        const retryDelay =
          typeof context.options.retryDelay === "function"
            ? context.options.retryDelay(context)
            : context.options.retryDelay || 0;
        if (retryDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
        // 重试请求
        return $fetchRaw(context.request, {
          ...context.options,
          retry: retries - 1,
        });
      }
    }

    // 创建标准化的错误对象
    const error = createFetchError(context);

    // 捕获错误堆栈（仅在 V8 引擎支持时）
    if (Error.captureStackTrace) {
      Error.captureStackTrace(error, $fetchRaw);
    }
    throw error;
  }

  /**
   * 原始的 fetch 实现
   * 这是实际发送请求和处理响应的核心函数
   * 
   * @param _request 请求 URL 或 Request 对象
   * @param _options 请求选项
   * @returns 处理后的响应
   */
  const $fetchRaw: $Fetch["raw"] = async function $fetchRaw<
    T = any,
    R extends ResponseType = "json",
  >(_request: FetchRequest, _options: FetchOptions<R> = {}) {
    // 创建请求上下文
    const context: FetchContext = {
      request: _request,
      options: resolveFetchOptions<R, T>(
        _request,
        _options,
        globalOptions.defaults as unknown as FetchOptions<R, T>,
        Headers
      ),
      response: undefined,
      error: undefined,
    };

    // 将请求方法转换为大写
    if (context.options.method) {
      context.options.method = context.options.method.toUpperCase();
    }

    // 调用请求前的钩子函数
    if (context.options.onRequest) {
      await callHooks(context, context.options.onRequest);
    }

    // 处理请求 URL
    if (typeof context.request === "string") {
      // 添加基础 URL
      if (context.options.baseURL) {
        context.request = withBase(context.request, context.options.baseURL);
      }
      // 添加查询参数
      if (context.options.query) {
        context.request = withQuery(context.request, context.options.query);
        delete context.options.query;
      }
      // 清理冗余的查询参数
      if ("query" in context.options) {
        delete context.options.query;
      }
      if ("params" in context.options) {
        delete context.options.params;
      }
    }

    // 处理请求体
    if (context.options.body && isPayloadMethod(context.options.method)) {
      if (isJSONSerializable(context.options.body)) {
        // 处理 JSON 请求体
        // 自动将对象转换为 JSON 字符串
        context.options.body =
          typeof context.options.body === "string"
            ? context.options.body
            : JSON.stringify(context.options.body);

        // 设置默认的 Content-Type 和 Accept 头
        context.options.headers = new Headers(context.options.headers || {});
        if (!context.options.headers.has("content-type")) {
          context.options.headers.set("content-type", "application/json");
        }
        if (!context.options.headers.has("accept")) {
          context.options.headers.set("accept", "application/json");
        }
      } else if (
        // 处理流式请求体
        ("pipeTo" in (context.options.body as ReadableStream) &&
          typeof (context.options.body as ReadableStream).pipeTo ===
            "function") ||
        // 处理 Node.js 流
        typeof (context.options.body as Readable).pipe === "function"
      ) {
        // 启用双工流支持
        if (!("duplex" in context.options)) {
          context.options.duplex = "half";
        }
      }
    }

    // 设置超时控制
    let abortTimeout: NodeJS.Timeout | undefined;
    if (!context.options.signal && context.options.timeout) {
      const controller = new AbortController();
      abortTimeout = setTimeout(() => {
        const error = new Error(
          "[TimeoutError]: The operation was aborted due to timeout"
        );
        error.name = "TimeoutError";
        (error as any).code = 23; // DOMException.TIMEOUT_ERR
        controller.abort(error);
      }, context.options.timeout);
      context.options.signal = controller.signal;
    }

    try {
      // 发送请求
      context.response = await fetch(
        context.request,
        context.options as RequestInit
      );
    } catch (error) {
      // 处理请求错误
      context.error = error as Error;
      if (context.options.onRequestError) {
        await callHooks(
          context as FetchContext & { error: Error },
          context.options.onRequestError
        );
      }
      return await onError(context);
    } finally {
      // 清理超时定时器
      if (abortTimeout) {
        clearTimeout(abortTimeout);
      }
    }

    // 处理响应体
    const hasBody =
      (context.response.body ||
        // 处理特殊情况下的响应体
        (context.response as any)._bodyInit) &&
      !nullBodyResponses.has(context.response.status) &&
      context.options.method !== "HEAD";

    if (hasBody) {
      // 确定响应类型
      const responseType =
        (context.options.parseResponse
          ? "json"
          : context.options.responseType) ||
        detectResponseType(context.response.headers.get("content-type") || "");

      // 根据响应类型处理响应体
      switch (responseType) {
        case "json": {
          // 处理 JSON 响应
          const data = await context.response.text();
          const parseFunction = context.options.parseResponse || destr;
          context.response._data = parseFunction(data);
          break;
        }
        case "stream": {
          // 处理流式响应
          context.response._data =
            context.response.body || (context.response as any)._bodyInit;
          break;
        }
        default: {
          // 处理其他类型的响应
          context.response._data = await context.response[responseType]();
        }
      }
    }

    // 调用响应后的钩子函数
    if (context.options.onResponse) {
      await callHooks(
        context as FetchContext & { response: FetchResponse<any> },
        context.options.onResponse
      );
    }

    // 处理错误响应
    if (
      !context.options.ignoreResponseError &&
      context.response.status >= 400 &&
      context.response.status < 600
    ) {
      if (context.options.onResponseError) {
        await callHooks(
          context as FetchContext & { response: FetchResponse<any> },
          context.options.onResponseError
        );
      }
      return await onError(context);
    }

    return context.response;
  };

  const $fetch = async function $fetch(request, options) {
    const r = await $fetchRaw(request, options);
    return r._data;
  } as $Fetch;

  $fetch.raw = $fetchRaw;

  $fetch.native = (...args) => fetch(...args);

  $fetch.create = (defaultOptions = {}, customGlobalOptions = {}) =>
    createFetch({
      ...globalOptions,
      ...customGlobalOptions,
      defaults: {
        ...globalOptions.defaults,
        ...customGlobalOptions.defaults,
        ...defaultOptions,
      },
    });

  return $fetch;
}
