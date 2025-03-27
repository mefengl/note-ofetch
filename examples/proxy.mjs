/**
 * proxy.mjs
 * 
 * 这个示例展示了如何在 ofetch 中使用代理和自定义 Agent。
 * 在这个例子中，我们：
 * 1. 创建一个不安全的 Agent（用于测试）
 * 2. 创建一个自定义的 fetch 实例
 * 3. 发送请求到代理服务器
 * 
 * 警告：这个例子使用了不安全的配置，仅用于测试！
 * 在生产环境中应该使用安全的配置。
 * 
 * 运行方法：
 * ```bash
 * node proxy.mjs
 * ```
 */

// 导入必要的模块
import { Agent } from "undici";
import { ofetch } from "ofetch";

/**
 * 创建一个不安全的 Agent
 * 
 * 警告：这个配置会：
 * 1. 禁用 SSL 证书验证
 * 2. 使请求容易受到中间人攻击
 * 3. 仅用于测试环境
 */
const unsecureAgent = new Agent({ connect: { rejectUnauthorized: false } });

/**
 * 创建一个使用不安全 Agent 的 fetch 实例
 * 
 * 这个实例会：
 * 1. 使用自定义的 Agent
 * 2. 忽略 SSL 证书错误
 * 3. 仅用于测试目的
 */
const unsecureFetch = ofetch.create({ dispatcher: unsecureAgent });

/**
 * 发送请求到代理服务器
 * 
 * 这个请求会：
 * 1. 通过不安全的连接发送
 * 2. 访问 squid-cache.org
 * 3. 返回响应数据
 */
const data = await unsecureFetch("https://www.squid-cache.org/");

// 打印响应数据
console.log(data);
