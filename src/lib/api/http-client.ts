// src/lib/api/http-client.ts

import { ApiError } from "./api-error";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type QueryValue = string | number | boolean | null | undefined;

type QueryParams = Record<string, QueryValue | QueryValue[]>;

type RequestConfig<TBody = unknown> = {
  path: string;
  method?: HttpMethod;
  headers?: HeadersInit;
  body?: TBody;
  query?: QueryParams;
  signal?: AbortSignal;
  timeoutMs?: number;
};

type CreateHttpClientOptions = {
  baseUrl: URL;
  timeoutMs?: number;
  maxRetries?: number;
  getDefaultHeaders?: () => HeadersInit | Promise<HeadersInit>;
};

type ErrorResponse = {
  message?: string;
  code?: string;
  errors?: unknown;
};

function buildUrl(path: string, baseUrl: URL, query?: QueryParams): URL {
  const normalizedBaseUrl = new URL(baseUrl);
  normalizedBaseUrl.pathname = `${normalizedBaseUrl.pathname.replace(/\/$/, "")}/`;

  const url = new URL(path.replace(/^\/+/, ""), normalizedBaseUrl);

  if (!query) {
    return url;
  }

  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined) {
      continue;
    }

    const values = Array.isArray(value) ? value : [value];

    for (const item of values) {
      if (item === null || item === undefined) {
        continue;
      }

      url.searchParams.append(key, String(item));
    }
  }

  return url;
}

async function parseResponse<TResponse>(
  response: Response,
): Promise<TResponse> {
  if (response.status === 204) {
    return undefined as TResponse;
  }

  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    return response.json() as Promise<TResponse>;
  }

  return undefined as TResponse;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetry(method: HttpMethod, status?: number): boolean {
  if (method !== "GET") {
    return false;
  }

  if (status === undefined) {
    return true;
  }

  return [408, 429, 500, 502, 503, 504].includes(status);
}

function isAbortOrTimeoutError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}

export function createHttpClient({
  baseUrl,
  timeoutMs: defaultTimeoutMs = 10_000,
  maxRetries = 2,
  getDefaultHeaders,
}: CreateHttpClientOptions) {
  async function request<TResponse, TBody = unknown>({
    path,
    method = "GET",
    headers,
    body,
    query,
    signal,
    timeoutMs,
  }: RequestConfig<TBody>): Promise<TResponse> {
    const url = buildUrl(path, baseUrl, query);

    const dynamicHeaders = await getDefaultHeaders?.();

    const timeout = timeoutMs ?? defaultTimeoutMs;

    const timeoutSignal = AbortSignal.timeout(timeout);

    const requestSignal = signal
      ? AbortSignal.any([signal, timeoutSignal])
      : timeoutSignal;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...dynamicHeaders,
            ...headers,
          },
          body: body !== undefined ? JSON.stringify(body) : undefined,
          signal: requestSignal,
        });

        if (!response.ok) {
          const canRetry =
            shouldRetry(method, response.status) && attempt < maxRetries;

          if (canRetry) {
            const retryDelay = 500 * 2 ** attempt;

            await sleep(retryDelay);
            continue;
          }

          let errorBody: ErrorResponse | undefined;

          try {
            errorBody = await response.json();
          } catch {
            // Response body may be empty or not JSON.
          }

          throw new ApiError({
            status: response.status,
            message:
              errorBody?.message ??
              `Request failed with status ${response.status}`,
            code: errorBody?.code,
            details: errorBody?.errors,
          });
        }

        return parseResponse<TResponse>(response);
      } catch (error) {
        if (isAbortOrTimeoutError(error)) {
          throw error;
        }

        if (error instanceof ApiError) {
          throw error;
        }

        const canRetry = shouldRetry(method) && attempt < maxRetries;

        if (canRetry) {
          const retryDelay = 500 * 2 ** attempt;

          await sleep(retryDelay);
          continue;
        }

        throw error;
      }
    }

    throw new Error("Unexpected HTTP client state.");
  }

  return {
    request,
  };
}
