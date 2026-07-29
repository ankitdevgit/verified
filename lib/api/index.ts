/**
 * Single entry point for the API layer. Importing this installs the mock
 * transport when `NEXT_PUBLIC_API_BASE_URL` is unset, so no call site has to
 * know whether it is talking to a real backend or the seed data.
 */
import "./mock-transport";

export * from "./endpoints";
export * from "./errors";
export type * from "./types";
export {
  API_BASE_URL,
  USE_MOCK_API,
  newIdempotencyKey,
  readTokens,
  writeTokens,
  collect,
} from "./client";
