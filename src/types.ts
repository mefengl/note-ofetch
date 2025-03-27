/**
 * src/types.ts
 * 
 * 这个文件定义了 ofetch 库中使用的所有类型接口。
 * 对于使用 TypeScript 的用户来说，这些类型定义提供了代码补全和类型检查的支持，
 * 让开发者能够更安全、更高效地使用这个库。
 * 
 * 这个文件分成几个主要部分：$Fetch API，选项，钩子和上下文，响应类型，错误类型等。
 */

// --------------------------
// $Fetch API
// --------------------------

/**
 * $Fetch 接口定义了库的主要 API
 * 它是一个可以直接调用的函数，也包含了一些额外的方法
 */
export interface $Fetch {
  /**
   * 主要的 fetch 函数
   * @param request 请求的 URL 或 Request 对象
   * @param options 请求选项
   * @returns 处理后的响应数据
   * 
   * T 是响应数据的类型（默认为 any）
   * R 是响应类型（如 "json", "text", "blob" 等，默认为 "json"）
   */
  <T = any, R extends ResponseType = "json">(
    request: FetchRequest,
    options?: FetchOptions<R>
  ): Promise<MappedResponseType<R, T>>;

  /**
   * 获取原始响应对象的方法
   * 与普通调用不同，它返回完整的响应对象，而不仅仅是数据
   */
  raw<T = any, R extends ResponseType = "json">(
    request: FetchRequest,
    options?: FetchOptions<R>
  ): Promise<FetchResponse<MappedResponseType<R, T>>>;

  /**
   * 原生 fetch 函数
   * 提供对底层 fetch API 的直接访问
   */
  native: Fetch;

  /**
   * 创建一个新的 $Fetch 实例，可以设置默认选项
   * 这对于创建具有特定配置的 API 客户端非常有用
   * 
   * @param defaults 默认的请求选项，会应用到每个请求
   * @param globalOptions 全局选项配置
   */
  create(defaults: FetchOptions, globalOptions?: CreateFetchOptions): $Fetch;
}

// --------------------------
// Options
// --------------------------

/**
 * FetchOptions 接口定义了所有可用的请求选项
 * 它扩展了标准的 RequestInit 接口，并添加了许多额外的选项
 */
export interface FetchOptions<R extends ResponseType = ResponseType, T = any>
  extends Omit<RequestInit, "body">,
    FetchHooks<T, R> {
  /** 基础 URL，会被添加到每个请求的前面 */
  baseURL?: string;
  
  /** 
   * 请求体，可以是标准的 RequestInit 的 body，也可以是一个对象
   * 如果是对象，会自动转换为 JSON
   */
  body?: RequestInit["body"] | Record<string, any>;
  
  /** 是否忽略响应错误（即使状态码不是 2xx） */
  ignoreResponseError?: boolean;
  
  /** 查询参数（与 query 相同，提供兼容性） */
  params?: Record<string, any>;
  
  /** 查询参数，会被添加到 URL 的 ? 后面 */
  query?: Record<string, any>;
  
  /** 自定义响应解析函数 */
  parseResponse?: (responseText: string) => any;
  
  /** 响应类型，如 "json", "text", "blob" 等 */
  responseType?: R;
  
  /**
   * @experimental 设置为 "half" 可以启用双工流（duplex streaming）
   * 当使用 ReadableStream 作为请求体时，会自动设置为 "half"
   * @see https://fetch.spec.whatwg.org/#enumdef-requestduplex
   */
  duplex?: "half" | undefined;
  
  /**
   * 仅在 Node.js >= 18 且使用 undici 时支持
   * 用于自定义请求分发器，支持代理和自签名证书等功能
   *
   * @see https://undici.nodejs.org/#/docs/api/Dispatcher
   */
  dispatcher?: InstanceType<typeof import("undici").Dispatcher>;
  
  /**
   * 仅在使用 node-fetch-native 兼容层的旧版 Node.js 中支持
   * 用于设置 HTTP(S) 代理
   */
  agent?: unknown;
  
  /** 请求超时时间（毫秒） */
  timeout?: number;
  
  /** 
   * 请求重试次数
   * 设置为 false 禁用重试
   * 默认对于 GET 请求重试 1 次，其他请求方法不重试
   */
  retry?: number | false;
  
  /** 
   * 重试之间的延迟时间（毫秒）
   * 可以是固定值或根据上下文计算延迟的函数
   */
  retryDelay?: number | ((context: FetchContext<T, R>) => number);
  
  /** 
   * 触发重试的 HTTP 状态码列表
   * 默认值是 [408, 409, 425, 429, 500, 502, 503, 504] 
   */
  retryStatusCodes?: number[];
}

/**
 * 解析后的请求选项，包含处理过的 headers
 * 内部使用，表示选项经过了标准化处理
 */
export interface ResolvedFetchOptions<
  R extends ResponseType = ResponseType,
  T = any,
> extends FetchOptions<R, T> {
  headers: Headers;
}

/**
 * 创建 fetch 实例时的选项
 */
export interface CreateFetchOptions {
  /** 默认的请求选项 */
  defaults?: FetchOptions;
  
  /** 自定义的 fetch 函数实现 */
  fetch?: Fetch;
  
  /** 自定义的 Headers 类 */
  Headers?: typeof Headers;
  
  /** 自定义的 AbortController 类 */
  AbortController?: typeof AbortController;
}

/**
 * 全局选项类型，只包含一部分可以全局设置的选项
 */
export type GlobalOptions = Pick<
  FetchOptions,
  "timeout" | "retry" | "retryDelay"
>;

// --------------------------
// Hooks and Context
// --------------------------

/**
 * Fetch 上下文对象，包含请求、选项、响应和错误信息
 * 用于钩子函数中，让你可以访问和修改请求的各个方面
 */
export interface FetchContext<T = any, R extends ResponseType = ResponseType> {
  /** 当前的请求对象 */
  request: FetchRequest;
  
  /** 解析后的请求选项 */
  options: ResolvedFetchOptions<R>;
  
  /** 响应对象（如果可用） */
  response?: FetchResponse<T>;
  
  /** 错误对象（如果发生错误） */
  error?: Error;
}

/**
 * 可以是普通值或 Promise
 */
type MaybePromise<T> = T | Promise<T>;

/**
 * 可以是单个值或数组
 */
type MaybeArray<T> = T | T[];

/**
 * Fetch 钩子函数类型定义
 * 钩子函数接收上下文对象，可以是异步的
 */
export type FetchHook<C extends FetchContext = FetchContext> = (
  context: C
) => MaybePromise<void>;

/**
 * 所有可用的钩子函数接口
 */
export interface FetchHooks<T = any, R extends ResponseType = ResponseType> {
  /** 
   * 请求发送前触发
   * 可以用来修改请求选项或添加身份验证等
   */
  onRequest?: MaybeArray<FetchHook<FetchContext<T, R>>>;
  
  /** 
   * 请求发送出错时触发
   * 例如网络错误或请求被中断
   */
  onRequestError?: MaybeArray<FetchHook<FetchContext<T, R> & { error: Error }>>;
  
  /** 
   * 收到响应后触发
   * 可以用来处理响应数据或记录日志
   */
  onResponse?: MaybeArray<
    FetchHook<FetchContext<T, R> & { response: FetchResponse<T> }>
  >;
  
  /** 
   * 响应状态码不是成功状态（非 2xx）时触发
   * 可以用来处理特定错误或重定向
   */
  onResponseError?: MaybeArray<
    FetchHook<FetchContext<T, R> & { response: FetchResponse<T> }>
  >;
}

// --------------------------
// Response Types
// --------------------------

/**
 * 响应类型映射，将响应类型字符串映射到实际的数据类型
 */
export interface ResponseMap {
  /** Blob 类型，用于二进制文件 */
  blob: Blob;
  
  /** 文本类型 */
  text: string;
  
  /** 二进制缓冲区 */
  arrayBuffer: ArrayBuffer;
  
  /** 可读流，用于流式传输 */
  stream: ReadableStream<Uint8Array>;
}

/**
 * 响应类型，可以是 "json" 或 ResponseMap 中定义的任何类型
 */
export type ResponseType = keyof ResponseMap | "json";

/**
 * 将响应类型映射到实际返回值类型
 * 如果是 "json"，则返回指定的泛型类型
 * 否则返回 ResponseMap 中对应的类型
 */
export type MappedResponseType<
  R extends ResponseType,
  JsonType = any,
> = R extends keyof ResponseMap ? ResponseMap[R] : JsonType;

/**
 * 扩展的 Response 接口，包含解析后的数据
 */
export interface FetchResponse<T> extends Response {
  /** 解析后的响应数据 */
  _data?: T;
}

// --------------------------
// Error
// --------------------------

/**
 * Fetch 错误接口，扩展了标准的 Error 类型
 * 包含有关请求、响应和错误状态的详细信息
 */
export interface IFetchError<T = any> extends Error {
  /** 原始请求对象 */
  request?: FetchRequest;
  
  /** 请求选项 */
  options?: FetchOptions;
  
  /** 响应对象（如果收到了响应） */
  response?: FetchResponse<T>;
  
  /** 解析后的响应数据 */
  data?: T;
  
  /** HTTP 状态码 */
  status?: number;
  
  /** HTTP 状态文本 */
  statusText?: string;
  
  /** 状态码（与 status 相同，为兼容性提供） */
  statusCode?: number;
  
  /** 状态消息（与 statusText 相同，为兼容性提供） */
  statusMessage?: string;
}

// --------------------------
// Other types
// --------------------------

/**
 * 全局 fetch 函数类型
 */
export type Fetch = typeof globalThis.fetch;

/**
 * 请求信息类型，可以是 URL 字符串或 Request 对象
 */
export type FetchRequest = RequestInfo;

/**
 * 搜索参数类型，用于 URL 查询参数
 */
export interface SearchParameters {
  [key: string]: any;
}
