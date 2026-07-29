import { ApiError } from "./errors";
import type { ApiErrorBody, Page } from "./types";

/**
 * Transport for the JSON API described in §7 of the backend spec.
 *
 *   Base:    https://api.verifiedviews.in/v1   (override with NEXT_PUBLIC_API_BASE_URL)
 *   Media:   application/json, both directions, always
 *   Headers: Authorization / X-Device-Id / X-App-Version / Idempotency-Key
 *
 * With no base URL configured the mock transport answers instead, so the site
 * runs end-to-end before the backend exists. Set NEXT_PUBLIC_API_BASE_URL and
 * every call in `endpoints.ts` goes over the wire unchanged.
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
export const APP_VERSION = "1.0.0 (web)";
export const USE_MOCK_API = API_BASE_URL === "";

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /** Required on POST /receipts and POST /reviews — §7. */
  idempotencyKey?: string;
  accessToken?: string;
  signal?: AbortSignal;
  /** Server-side calls opt out of the browser-only token/device plumbing. */
  anonymous?: boolean;
}

export interface Transport {
  (path: string, init: RequestInit & { url: string }): Promise<Response>;
}

let transport: Transport | null = null;

/** Swapped in by `mock-transport.ts` when no API base URL is configured. */
export function setTransport(next: Transport | null) {
  transport = next;
}

/* -------------------------------------------------------------------------- */
/* Device identity — §3 requires X-Device-Id on the write path                 */
/* -------------------------------------------------------------------------- */

const DEVICE_KEY = "vv.device.id";

export function deviceId(): string {
  if (typeof window === "undefined") return "server";
  let id = window.localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

/* -------------------------------------------------------------------------- */
/* Token store                                                                 */
/* -------------------------------------------------------------------------- */

const TOKEN_KEY = "vv.tokens";

export interface StoredTokens {
  access_token: string;
  refresh_token: string;
  /** Epoch ms at which the access token stops being valid. */
  expires_at: number;
}

export function readTokens(): StoredTokens | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredTokens;
  } catch {
    return null;
  }
}

export function writeTokens(tokens: StoredTokens | null) {
  if (typeof window === "undefined") return;
  if (tokens === null) {
    window.sessionStorage.removeItem(TOKEN_KEY);
  } else {
    window.sessionStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  }
}

/* -------------------------------------------------------------------------- */
/* Core request                                                                */
/* -------------------------------------------------------------------------- */

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const base = API_BASE_URL || "https://api.verifiedviews.in/v1";
  const url = new URL(
    `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`,
  );
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const url = buildUrl(path, options.query);

  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-App-Version": APP_VERSION,
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (!options.anonymous) {
    headers["X-Device-Id"] = deviceId();
    const token = options.accessToken ?? readTokens()?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  if (options.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey;
  }

  const init: RequestInit & { url: string } = {
    url,
    method: options.method ?? "GET",
    headers,
    signal: options.signal,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  };

  const response = transport
    ? await transport(path, init)
    : await fetch(url, init);

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const parsed: unknown = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const reset = response.headers.get("X-RateLimit-Reset");
    throw new ApiError(response.status, parsed as ApiErrorBody, {
      retryAfter: reset ? Number(reset) : undefined,
    });
  }

  return parsed as T;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/** Walks cursor pages to the end. Only for small, bounded collections. */
export async function collect<T>(
  fetchPage: (cursor?: string) => Promise<Page<T>>,
  max = 500,
): Promise<T[]> {
  const out: T[] = [];
  let cursor: string | undefined;
  do {
    const page: Page<T> = await fetchPage(cursor);
    out.push(...page.data);
    cursor = page.next_cursor ?? undefined;
  } while (cursor && out.length < max);
  return out.slice(0, max);
}

export function newIdempotencyKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `idem-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
}
