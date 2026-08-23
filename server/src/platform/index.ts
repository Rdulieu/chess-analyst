// Public surface of the Platform port (ADR-0018).
export {
  TIME_CONTROL_CATEGORIES,
  platformLabel,
  clientFor,
  UnsupportedPlatformError,
  TruncatedStreamError,
  type Platform,
  type TimeControlCategory,
  type FetchHooks,
  type PlatformAccount,
  type ImportedGame,
  type MonthFetch,
  type MonthRef,
  type RangeEvent,
  type PlatformClient,
  type PlatformRegistry,
} from "./types";
export { monthsInRange, monthOf, monthOrdinal } from "./months";
export { createHttpChessComClient } from "./chesscom/client";
export { createHttpLichessClient } from "./lichess/client";
