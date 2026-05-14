/**
 * 带重试和超时的 fetch 封装。
 * 使用指数退避策略，默认最多重试 3 次。
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  config: { maxRetries?: number; timeout?: number; backoff?: number } = {}
): Promise<Response> {
  const { maxRetries = 3, timeout = 10000, backoff = 1000 } = config;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) return response;

      // 4xx 错误不重试（客户端错误）
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // 5xx 服务端错误可重试
      if (attempt === maxRetries - 1) {
        throw new Error(`HTTP ${response.status}: ${response.statusText} (after ${maxRetries} attempts)`);
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        if (attempt === maxRetries - 1) {
          throw new Error(`Request timeout after ${timeout}ms (${maxRetries} attempts)`);
        }
      } else if (attempt === maxRetries - 1) {
        throw error;
      }
    }

    // 指数退避
    await new Promise(resolve => setTimeout(resolve, backoff * (attempt + 1)));
  }

  throw new Error('Request failed');
}
