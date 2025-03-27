/**
 * ofetch 测试文件
 * 这个文件包含了 ofetch 库的主要功能测试
 * 包括：
 * 1. 基本请求功能
 * 2. 响应解析
 * 3. 请求体处理
 * 4. 错误处理
 * 5. 超时处理
 * 6. 二进制数据处理
 * 7. 请求头处理
 * 8. 代理支持
 */

import { Readable } from "node:stream";
import { listen } from "listhen";
import { getQuery, joinURL } from "ufo";
import {
  createApp,
  createError,
  eventHandler,
  readBody,
  readRawBody,
  toNodeListener,
} from "h3";
import {
  describe,
  beforeEach,
  beforeAll,
  afterAll,
  it,
  expect,
  vi,
} from "vitest";
import { Headers, FormData, Blob } from "node-fetch-native";
import { nodeMajorVersion } from "std-env";
import { $fetch } from "../src/node";

describe("ofetch", () => {
  let listener;
  // 获取测试服务器的完整 URL
  const getURL = (url) => joinURL(listener.url, url);

  // 模拟全局 fetch 函数
  const fetch = vi.spyOn(globalThis, "fetch");

  // 在所有测试开始前设置测试服务器
  beforeAll(async () => {
    const app = createApp()
      // 测试基本 GET 请求
      .use(
        "/ok",
        eventHandler(() => "ok")
      )
      // 测试查询参数处理
      .use(
        "/params",
        eventHandler((event) => getQuery(event.node.req.url || ""))
      )
      // 测试 URL 处理
      .use(
        "/url",
        eventHandler((event) => event.node.req.url)
      )
      // 测试请求体回显
      .use(
        "/echo",
        eventHandler(async (event) => ({
          path: event.path,
          body:
            event.node.req.method === "POST"
              ? await readRawBody(event)
              : undefined,
          headers: event.node.req.headers,
        }))
      )
      // 测试 POST 请求处理
      .use(
        "/post",
        eventHandler(async (event) => ({
          body: await readBody(event),
          headers: event.node.req.headers,
        }))
      )
      // 测试二进制数据响应
      .use(
        "/binary",
        eventHandler((event) => {
          event.node.res.setHeader("Content-Type", "application/octet-stream");
          return new Blob(["binary"]);
        })
      )
      // 测试错误响应
      .use(
        "/403",
        eventHandler(() =>
          createError({ status: 403, statusMessage: "Forbidden" })
        )
      )
      // 测试超时响应
      .use(
        "/408",
        eventHandler(() => createError({ status: 408 }))
      )
      // 测试空响应
      .use(
        "/204",
        eventHandler(() => null) // eslint-disable-line unicorn/no-null
      )
      // 测试请求超时
      .use(
        "/timeout",
        eventHandler(async () => {
          await new Promise((resolve) => {
            setTimeout(() => {
              resolve(createError({ status: 408 }));
            }, 1000 * 5);
          });
        })
      );

    listener = await listen(toNodeListener(app));
  });

  // 在所有测试结束后关闭服务器
  afterAll(() => {
    listener.close().catch(console.error);
  });

  // 在每个测试前清除 fetch 模拟
  beforeEach(() => {
    fetch.mockClear();
  });

  // 测试基本 GET 请求
  it("ok", async () => {
    expect(await $fetch(getURL("ok"))).to.equal("ok");
  });

  // 测试自定义响应解析
  it("custom parseResponse", async () => {
    let called = 0;
    const parser = (r) => {
      called++;
      return "C" + r;
    };
    expect(await $fetch(getURL("ok"), { parseResponse: parser })).to.equal(
      "Cok"
    );
    expect(called).to.equal(1);
  });

  // 测试不同的响应类型
  it("allows specifying FetchResponse method", async () => {
    expect(
      await $fetch(getURL("params?test=true"), { responseType: "json" })
    ).to.deep.equal({ test: "true" });
    expect(
      await $fetch(getURL("params?test=true"), { responseType: "blob" })
    ).to.be.instanceOf(Blob);
    expect(
      await $fetch(getURL("params?test=true"), { responseType: "text" })
    ).to.equal('{"test":"true"}');
    expect(
      await $fetch(getURL("params?test=true"), { responseType: "arrayBuffer" })
    ).to.be.instanceOf(ArrayBuffer);
  });

  // 测试二进制响应
  it("returns a blob for binary content-type", async () => {
    expect(await $fetch(getURL("binary"))).to.be.instanceOf(Blob);
  });

  // 测试 baseURL 功能
  it("baseURL", async () => {
    expect(await $fetch("/x?foo=123", { baseURL: getURL("url") })).to.equal(
      "/x?foo=123"
    );
  });

  // 测试 POST 请求体自动序列化
  it("stringifies posts body automatically", async () => {
    const { body } = await $fetch(getURL("post"), {
      method: "POST",
      body: { num: 42 },
    });
    expect(body).to.deep.eq({ num: 42 });

    const body2 = (
      await $fetch(getURL("post"), {
        method: "POST",
        body: [{ num: 42 }, { num: 43 }],
      })
    ).body;
    expect(body2).to.deep.eq([{ num: 42 }, { num: 43 }]);

    // 测试不同的请求头格式
    const headerFetches = [
      [["X-header", "1"]],
      { "x-header": "1" },
      new Headers({ "x-header": "1" }),
    ];

    for (const sentHeaders of headerFetches) {
      const { headers } = await $fetch(getURL("post"), {
        method: "POST",
        body: { num: 42 },
        headers: sentHeaders as HeadersInit,
      });
      expect(headers).to.include({ "x-header": "1" });
      expect(headers).to.include({ accept: "application/json" });
    }
  });

  // 测试非 JSON 请求体处理
  it("does not stringify body when content type != application/json", async () => {
    const message = '"Hallo von Pascal"';
    const { body } = await $fetch(getURL("echo"), {
      method: "POST",
      body: message,
      headers: { "Content-Type": "text/plain" },
    });
    expect(body).to.deep.eq(message);
  });

  // 测试 Buffer 请求体
  it("Handle Buffer body", async () => {
    const message = "Hallo von Pascal";
    const { body } = await $fetch(getURL("echo"), {
      method: "POST",
      body: Buffer.from("Hallo von Pascal"),
      headers: { "Content-Type": "text/plain" },
    });
    expect(body).to.deep.eq(message);
  });

  // 测试 ReadableStream 请求体（仅 Node.js 18+）
  it.skipIf(Number(nodeMajorVersion) < 18)(
    "Handle ReadableStream body",
    async () => {
      const message = "Hallo von Pascal";
      const { body } = await $fetch(getURL("echo"), {
        method: "POST",
        headers: {
          "content-length": "16",
        },
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(message));
            controller.close();
          },
        }),
      });
      expect(body).to.deep.eq(message);
    }
  );

  it.skipIf(Number(nodeMajorVersion) < 18)("Handle Readable body", async () => {
    const message = "Hallo von Pascal";
    const { body } = await $fetch(getURL("echo"), {
      method: "POST",
      headers: {
        "content-length": "16",
      },
      body: new Readable({
        read() {
          this.push(message);
          this.push(null); // eslint-disable-line unicorn/no-null
        },
      }),
    });
    expect(body).to.deep.eq(message);
  });

  it("Bypass FormData body", async () => {
    const data = new FormData();
    data.append("foo", "bar");
    const { body } = await $fetch(getURL("post"), {
      method: "POST",
      body: data,
    });
    expect(body).to.include('form-data; name="foo"');
  });

  it("Bypass URLSearchParams body", async () => {
    const data = new URLSearchParams({ foo: "bar" });
    const { body } = await $fetch(getURL("post"), {
      method: "POST",
      body: data,
    });
    expect(body).toMatchObject({ foo: "bar" });
  });

  it("404", async () => {
    const error = await $fetch(getURL("404")).catch((error_) => error_);
    expect(error.toString()).to.contain("Cannot find any path matching /404.");
    expect(error.data).to.deep.eq({
      stack: [],
      statusCode: 404,
      statusMessage: "Cannot find any path matching /404.",
    });
    expect(error.response?._data).to.deep.eq(error.data);
    expect(error.request).to.equal(getURL("404"));
  });

  it("403 with ignoreResponseError", async () => {
    const res = await $fetch(getURL("403"), { ignoreResponseError: true });
    expect(res?.statusCode).to.eq(403);
    expect(res?.statusMessage).to.eq("Forbidden");
  });

  it("204 no content", async () => {
    const res = await $fetch(getURL("204"));
    expect(res).toBeUndefined();
  });

  it("HEAD no content", async () => {
    const res = await $fetch(getURL("/ok"), { method: "HEAD" });
    expect(res).toBeUndefined();
  });

  it("baseURL with retry", async () => {
    const error = await $fetch("", { baseURL: getURL("404"), retry: 3 }).catch(
      (error_) => error_
    );
    expect(error.request).to.equal(getURL("404"));
  });

  it("retry with number delay", async () => {
    const slow = $fetch<string>(getURL("408"), {
      retry: 2,
      retryDelay: 100,
    }).catch(() => "slow");
    const fast = $fetch<string>(getURL("408"), {
      retry: 2,
      retryDelay: 1,
    }).catch(() => "fast");

    const race = await Promise.race([slow, fast]);
    expect(race).to.equal("fast");
  });

  it("retry with callback delay", async () => {
    const slow = $fetch<string>(getURL("408"), {
      retry: 2,
      retryDelay: () => 100,
    }).catch(() => "slow");
    const fast = $fetch<string>(getURL("408"), {
      retry: 2,
      retryDelay: () => 1,
    }).catch(() => "fast");

    const race = await Promise.race([slow, fast]);
    expect(race).to.equal("fast");
  });

  it("abort with retry", () => {
    const controller = new AbortController();
    async function abortHandle() {
      controller.abort();
      const response = await $fetch("", {
        baseURL: getURL("ok"),
        retry: 3,
        signal: controller.signal,
      });
      console.log("response", response);
    }
    expect(abortHandle()).rejects.toThrow(/aborted/);
  });

  it("passing request obj should return request obj in error", async () => {
    const error = await $fetch(getURL("/403"), { method: "post" }).catch(
      (error) => error
    );
    expect(error.toString()).toBe(
      'FetchError: [POST] "http://localhost:3000/403": 403 Forbidden'
    );
    expect(error.request).to.equal(getURL("403"));
    expect(error.options.method).to.equal("POST");
    expect(error.response?._data).to.deep.eq(error.data);
  });

  it("aborting on timeout", async () => {
    const noTimeout = $fetch(getURL("timeout")).catch(() => "no timeout");
    const timeout = $fetch(getURL("timeout"), {
      timeout: 100,
      retry: 0,
    }).catch(() => "timeout");
    const race = await Promise.race([noTimeout, timeout]);
    expect(race).to.equal("timeout");
  });

  it("aborting on timeout reason", async () => {
    await $fetch(getURL("timeout"), {
      timeout: 100,
      retry: 0,
    }).catch((error) => {
      expect(error.cause.message).to.include(
        "The operation was aborted due to timeout"
      );
      expect(error.cause.name).to.equal("TimeoutError");
      expect(error.cause.code).to.equal(DOMException.TIMEOUT_ERR);
    });
  });

  it("deep merges defaultOptions", async () => {
    const _customFetch = $fetch.create({
      query: {
        a: 0,
      },
      params: {
        b: 2,
      },
      headers: {
        "x-header-a": "0",
        "x-header-b": "2",
      },
    });
    const { headers, path } = await _customFetch(getURL("echo"), {
      query: {
        a: 1,
      },
      params: {
        c: 3,
      },
      headers: {
        "Content-Type": "text/plain",
        "x-header-a": "1",
        "x-header-c": "3",
      },
    });

    expect(headers).to.include({
      "x-header-a": "1",
      "x-header-b": "2",
      "x-header-c": "3",
    });

    const parseParams = (str: string) =>
      Object.fromEntries(new URLSearchParams(str).entries());
    expect(parseParams(path)).toMatchObject(parseParams("?b=2&c=3&a=1"));
  });

  it("uses request headers", async () => {
    expect(
      await $fetch(
        new Request(getURL("echo"), { headers: { foo: "1" } }),
        {}
      ).then((r) => r.headers)
    ).toMatchObject({ foo: "1" });

    expect(
      await $fetch(new Request(getURL("echo"), { headers: { foo: "1" } }), {
        headers: { foo: "2", bar: "3" },
      }).then((r) => r.headers)
    ).toMatchObject({ foo: "2", bar: "3" });
  });

  it("hook errors", async () => {
    // onRequest
    await expect(
      $fetch(getURL("/ok"), {
        onRequest: () => {
          throw new Error("error in onRequest");
        },
      })
    ).rejects.toThrow("error in onRequest");

    // onRequestError
    await expect(
      $fetch("/" /* non absolute is not acceptable */, {
        onRequestError: () => {
          throw new Error("error in onRequestError");
        },
      })
    ).rejects.toThrow("error in onRequestError");

    // onResponse
    await expect(
      $fetch(getURL("/ok"), {
        onResponse: () => {
          throw new Error("error in onResponse");
        },
      })
    ).rejects.toThrow("error in onResponse");

    // onResponseError
    await expect(
      $fetch(getURL("/403"), {
        onResponseError: () => {
          throw new Error("error in onResponseError");
        },
      })
    ).rejects.toThrow("error in onResponseError");
  });

  it("calls hooks", async () => {
    const onRequest = vi.fn();
    const onRequestError = vi.fn();
    const onResponse = vi.fn();
    const onResponseError = vi.fn();

    await $fetch(getURL("/ok"), {
      onRequest,
      onRequestError,
      onResponse,
      onResponseError,
    });

    expect(onRequest).toHaveBeenCalledOnce();
    expect(onRequestError).not.toHaveBeenCalled();
    expect(onResponse).toHaveBeenCalledOnce();
    expect(onResponseError).not.toHaveBeenCalled();

    onRequest.mockReset();
    onRequestError.mockReset();
    onResponse.mockReset();
    onResponseError.mockReset();

    await $fetch(getURL("/403"), {
      onRequest,
      onRequestError,
      onResponse,
      onResponseError,
    }).catch((error) => error);

    expect(onRequest).toHaveBeenCalledOnce();
    expect(onRequestError).not.toHaveBeenCalled();
    expect(onResponse).toHaveBeenCalledOnce();
    expect(onResponseError).toHaveBeenCalledOnce();

    onRequest.mockReset();
    onRequestError.mockReset();
    onResponse.mockReset();
    onResponseError.mockReset();

    await $fetch(getURL("/ok"), {
      onRequest: [onRequest, onRequest],
      onRequestError: [onRequestError, onRequestError],
      onResponse: [onResponse, onResponse],
      onResponseError: [onResponseError, onResponseError],
    });

    expect(onRequest).toHaveBeenCalledTimes(2);
    expect(onRequestError).not.toHaveBeenCalled();
    expect(onResponse).toHaveBeenCalledTimes(2);
    expect(onResponseError).not.toHaveBeenCalled();

    onRequest.mockReset();
    onRequestError.mockReset();
    onResponse.mockReset();
    onResponseError.mockReset();

    await $fetch(getURL("/403"), {
      onRequest: [onRequest, onRequest],
      onRequestError: [onRequestError, onRequestError],
      onResponse: [onResponse, onResponse],
      onResponseError: [onResponseError, onResponseError],
    }).catch((error) => error);

    expect(onRequest).toHaveBeenCalledTimes(2);
    expect(onRequestError).not.toHaveBeenCalled();
    expect(onResponse).toHaveBeenCalledTimes(2);
    expect(onResponseError).toHaveBeenCalledTimes(2);
  });

  it("default fetch options", async () => {
    await $fetch("https://jsonplaceholder.typicode.com/todos/1", {});
    expect(fetch).toHaveBeenCalledOnce();
    const options = fetch.mock.calls[0][1];
    expect(options).toStrictEqual({
      headers: expect.any(Headers),
    });
  });
});
